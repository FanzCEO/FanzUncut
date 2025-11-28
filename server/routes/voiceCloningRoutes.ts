import { Router, Request, Response } from 'express';
import { db } from '../db';
import { voiceProfiles, voiceMessages, voiceMessageTemplates } from '@shared/schema';
import { 
  insertVoiceProfileSchema, 
  insertVoiceMessageSchema,
  insertVoiceMessageTemplateSchema 
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { voiceCloningService } from '../services/voiceCloningService';
import { isAuthenticated } from '../middleware/auth';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import { nanoid } from 'nanoid';

const router = Router();

// Multer memory storage for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP3 and WAV files are allowed.'));
    }
  },
});

// Validate S3 configuration
function validateS3Config(): boolean {
  return !!(
    process.env.S3_BUCKET &&
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
}

// Build proper S3 URL from key
function getS3Url(key: string): string {
  const endpoint = process.env.S3_ENDPOINT!.replace(/^https?:\/\//, '');
  return `https://${endpoint}/${process.env.S3_BUCKET}/${key}`;
}

// S3 client for storing audio files (lazy init)
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!validateS3Config()) {
    throw new Error('S3 configuration incomplete. Please set S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.');
  }
  
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  
  return s3Client;
}

// ===== VOICE PROFILES =====

// Create voice profile (upload samples + clone voice)
router.post(
  '/profiles',
  isAuthenticated,
  upload.array('audioSamples', 5), // Max 5 audio samples
  async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one audio sample is required',
        });
      }

      const validationResult = insertVoiceProfileSchema.safeParse({
        ...req.body,
        userId,
      });

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: validationResult.error.errors[0].message,
        });
      }

      const data = validationResult.data;

      // Validate S3 configuration
      if (!validateS3Config()) {
        return res.status(500).json({
          success: false,
          error: 'Object storage not configured. Please contact support.',
        });
      }

      // Upload audio samples to S3
      const audioSampleUrls: string[] = [];
      let totalDuration = 0;
      const client = getS3Client();

      for (const file of files) {
        const key = `voice-samples/${userId}/${nanoid()}.${file.mimetype.split('/')[1]}`;
        
        await client.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET!,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          })
        );

        const url = getS3Url(key);
        audioSampleUrls.push(url);
        
        // Approximate duration (60 seconds per 1MB for MP3)
        totalDuration += Math.ceil((file.size / 1024 / 1024) * 60);
      }

      // Create voice profile in database (pending status)
      const [profile] = await db
        .insert(voiceProfiles)
        .values({
          ...data,
          audioSampleUrls,
          sampleDuration: totalDuration,
          status: 'pending',
        })
        .returning();

      // Return profile immediately - clone voice in background
      res.json({
        success: true,
        voiceProfile: profile,
        message: 'Voice profile created. Cloning in progress...',
      });

      // Clone voice using ElevenLabs (background process - don't block response)
      if (voiceCloningService.isConfigured()) {
        // Update status to cloning
        await db
          .update(voiceProfiles)
          .set({ status: 'cloning' })
          .where(eq(voiceProfiles.id, profile.id));

        // Background cloning (wrapped in try/catch to prevent crashes)
        setImmediate(async () => {
          try {
            const audioBuffers = files.map(f => f.buffer);
            const elevenLabsVoice = await voiceCloningService.cloneVoice({
              name: data.name,
              description: data.description || undefined,
              audioFiles: audioBuffers,
              removeBackgroundNoise: true,
            });

            // Update profile with voice ID and set to active
            await db
              .update(voiceProfiles)
              .set({
                voiceId: elevenLabsVoice.voice_id,
                status: 'active',
              })
              .where(eq(voiceProfiles.id, profile.id));
            
            console.log(`✅ Voice cloning completed for profile ${profile.id}`);
          } catch (error: any) {
            // Update profile with error
            await db
              .update(voiceProfiles)
              .set({
                status: 'failed',
                errorMessage: error.message,
              })
              .where(eq(voiceProfiles.id, profile.id));
            
            console.error(`❌ Voice cloning failed for profile ${profile.id}:`, error.message);
          }
        });
      } else {
        // No API key configured - leave as pending
        console.warn('⚠️ ElevenLabs API key not configured. Voice will remain in pending state.');
      }
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// Get user's voice profiles
router.get('/profiles', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const profiles = await db
      .select()
      .from(voiceProfiles)
      .where(eq(voiceProfiles.userId, userId))
      .orderBy(desc(voiceProfiles.createdAt));

    return res.json({
      success: true,
      voiceProfiles: profiles,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get single voice profile
router.get('/profiles/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const profileId = req.params.id;

    const [profile] = await db
      .select()
      .from(voiceProfiles)
      .where(
        and(
          eq(voiceProfiles.id, profileId),
          eq(voiceProfiles.userId, userId)
        )
      );

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Voice profile not found',
      });
    }

    return res.json({
      success: true,
      voiceProfile: profile,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete voice profile
router.delete('/profiles/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    const profileId = req.params.id;

    const [profile] = await db
      .select()
      .from(voiceProfiles)
      .where(
        and(
          eq(voiceProfiles.id, profileId),
          eq(voiceProfiles.userId, userId)
        )
      );

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Voice profile not found',
      });
    }

    // Delete from ElevenLabs if configured and voice was cloned
    if (voiceCloningService.isConfigured() && profile.voiceId) {
      try {
        await voiceCloningService.deleteVoice(profile.voiceId);
      } catch (error) {
        // Continue even if ElevenLabs deletion fails
        console.error('Failed to delete voice from ElevenLabs:', error);
      }
    }

    // Delete from database
    await db
      .delete(voiceProfiles)
      .where(eq(voiceProfiles.id, profileId));

    return res.json({
      success: true,
      message: 'Voice profile deleted successfully',
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== VOICE MESSAGES =====

// Generate voice message
router.post('/messages/generate', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const validationResult = insertVoiceMessageSchema.safeParse({
      ...req.body,
      senderId: userId,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.errors[0].message,
      });
    }

    const data = validationResult.data;

    // Check if voice profile exists and belongs to user
    const [profile] = await db
      .select()
      .from(voiceProfiles)
      .where(
        and(
          eq(voiceProfiles.id, data.voiceProfileId),
          eq(voiceProfiles.userId, userId)
        )
      );

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Voice profile not found',
      });
    }

    if (profile.status !== 'active' || !profile.voiceId) {
      return res.status(400).json({
        success: false,
        error: 'Voice profile is not ready for message generation',
      });
    }

    // Create message record
    const [message] = await db
      .insert(voiceMessages)
      .values({
        ...data,
        status: 'generating',
      })
      .returning();

    // Generate speech using ElevenLabs
    try {
      const audioResponse = await voiceCloningService.generateSpeech({
        text: data.text,
        voiceId: profile.voiceId,
        modelId: data.model || 'eleven_multilingual_v2',
        voiceSettings: {
          stability: parseFloat(profile.stability || '0.75'),
          similarityBoost: parseFloat(profile.similarityBoost || '0.75'),
          style: parseFloat(profile.style || '0.0'),
          useSpeakerBoost: profile.useSpeakerBoost ?? true,
        },
      });

      // Upload audio to S3
      const client = getS3Client();
      const audioKey = `voice-messages/${userId}/${nanoid()}.mp3`;
      await client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: audioKey,
          Body: audioResponse.audioBuffer,
          ContentType: audioResponse.contentType,
        })
      );

      const audioUrl = getS3Url(audioKey);

      // Update message with audio URL
      await db
        .update(voiceMessages)
        .set({
          audioUrl,
          status: 'completed',
          duration: audioResponse.audioBuffer.length, // Approximate
        })
        .where(eq(voiceMessages.id, message.id));

      const [updatedMessage] = await db
        .select()
        .from(voiceMessages)
        .where(eq(voiceMessages.id, message.id));

      return res.json({
        success: true,
        voiceMessage: updatedMessage,
      });
    } catch (error: any) {
      // Update message with error
      await db
        .update(voiceMessages)
        .set({
          status: 'failed',
          errorMessage: error.message,
        })
        .where(eq(voiceMessages.id, message.id));

      return res.status(500).json({
        success: false,
        error: `Speech generation failed: ${error.message}`,
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get voice messages
router.get('/messages', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const messages = await db
      .select()
      .from(voiceMessages)
      .where(eq(voiceMessages.senderId, userId))
      .orderBy(desc(voiceMessages.createdAt));

    return res.json({
      success: true,
      voiceMessages: messages,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== MESSAGE TEMPLATES =====

// Create template
router.post('/templates', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const validationResult = insertVoiceMessageTemplateSchema.safeParse({
      ...req.body,
      userId,
    });

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.errors[0].message,
      });
    }

    const [template] = await db
      .insert(voiceMessageTemplates)
      .values(validationResult.data)
      .returning();

    return res.json({
      success: true,
      template,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get templates
router.get('/templates', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    const templates = await db
      .select()
      .from(voiceMessageTemplates)
      .where(eq(voiceMessageTemplates.userId, userId))
      .orderBy(desc(voiceMessageTemplates.createdAt));

    return res.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export { router as voiceCloningRoutes };
