import { db } from '../db';
import { verifiedContent, contentVerification, deepfakeReports, users } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';

// Lazy-load OpenAI to avoid initialization errors when API key is missing
let openaiClient: any = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY not configured - AI deepfake analysis disabled');
    return null;
  }
  
  if (!openaiClient) {
    const OpenAI = require('openai').default;
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  return openaiClient;
}

export interface VerifyContentRequest {
  contentUrl: string;
  contentType: 'image' | 'video' | 'audio';
  creatorId?: string;
  reportedBy?: string;
}

export interface DeepfakeReportRequest {
  reportedContentUrl: string;
  reportedContentType: string;
  impersonatedCreatorId: string;
  reportedBy?: string;
  description?: string;
  evidence?: any;
}

export class DeepfakeDetectionService {
  /**
   * Calculate content hash for fingerprinting
   * TODO: Production implementation should:
   * 1. Fetch the actual media file from contentUrl
   * 2. Compute SHA-256 hash of the binary content (not just URL)
   * 3. Handle cache-busting params to prevent URL manipulation
   * 4. Reject unverifiable/inaccessible sources
   * Current limitation: URL-only hashing allows attackers to swap media at same URL
   */
  private async calculateContentHash(contentUrl: string): Promise<string> {
    // FIXME: This hashes the URL string, not the actual media payload
    // Proper implementation needs HTTP fetch + binary hashing
    return crypto
      .createHash('sha256')
      .update(contentUrl)
      .digest('hex');
  }

  /**
   * Analyze content using OpenAI Vision API
   */
  private async analyzeWithAI(
    contentUrl: string,
    contentType: string
  ): Promise<{
    isDeepfake: boolean;
    confidence: number;
    analysis: any;
    flags: string[];
  }> {
    try {
      const openai = getOpenAI();
      
      if (!openai) {
        // API key not configured - return neutral result
        return {
          isDeepfake: false,
          confidence: 50,
          analysis: { note: 'AI analysis unavailable - OPENAI_API_KEY not configured' },
          flags: ['ai_unavailable'],
        };
      }
      
      if (contentType !== 'image') {
        // For video/audio, we'd need different analysis
        // For now, return basic analysis
        return {
          isDeepfake: false,
          confidence: 50,
          analysis: { note: 'Video/audio analysis not yet implemented' },
          flags: [],
        };
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image for signs of AI generation or deepfake manipulation. Look for:
1. Unnatural facial features or expressions
2. Inconsistent lighting or shadows
3. Blurring or artifacts around edges
4. Inconsistent textures or patterns
5. Signs of face-swapping or morphing
6. Other deepfake indicators

Respond with a JSON object containing:
- isDeepfake: boolean
- confidence: number (0-100)
- flags: array of specific issues found
- reasoning: brief explanation`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: contentUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      // Try to extract JSON from the response
      let analysis: any = {};
      try {
        // Look for JSON in the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // If parsing fails, use raw content
        analysis = { raw: content };
      }

      return {
        isDeepfake: analysis.isDeepfake || false,
        confidence: analysis.confidence || 50,
        analysis: {
          ...analysis,
          model: 'gpt-4o',
          rawResponse: content,
        },
        flags: analysis.flags || [],
      };
    } catch (error: any) {
      console.error('AI analysis error:', error);
      // Return safe defaults on error
      return {
        isDeepfake: false,
        confidence: 0,
        analysis: { error: error.message },
        flags: ['analysis_failed'],
      };
    }
  }

  /**
   * Register creator's verified content
   */
  async registerVerifiedContent(
    creatorId: string,
    mediaUrl: string,
    mediaType: string,
    metadata?: any
  ): Promise<any> {
    const contentHash = await this.calculateContentHash(mediaUrl);

    // Check if already registered
    const [existing] = await db
      .select()
      .from(verifiedContent)
      .where(eq(verifiedContent.contentHash, contentHash));

    if (existing) {
      return existing;
    }

    // Generate AI fingerprint
    const aiAnalysis = await this.analyzeWithAI(mediaUrl, mediaType);

    const [registered] = await db
      .insert(verifiedContent)
      .values({
        creatorId,
        mediaUrl,
        mediaType,
        contentHash,
        aiFingerprint: aiAnalysis,
        metadata: metadata || {},
      })
      .returning();

    return registered;
  }

  /**
   * Verify content for deepfake detection
   */
  async verifyContent(request: VerifyContentRequest): Promise<any> {
    const contentHash = await this.calculateContentHash(request.contentUrl);

    // Check if content matches any verified content
    const [matchedContent] = await db
      .select()
      .from(verifiedContent)
      .where(eq(verifiedContent.contentHash, contentHash));

    if (matchedContent) {
      // Exact match found - content is verified authentic
      const [verification] = await db
        .insert(contentVerification)
        .values({
          contentUrl: request.contentUrl,
          contentType: request.contentType,
          creatorId: request.creatorId,
          status: 'verified',
          confidenceScore: '100.00',
          matchedVerifiedContentId: matchedContent.id,
          similarityScore: '100.00',
          detectionMethod: 'content_hash',
        })
        .returning();

      return verification;
    }

    // Run AI analysis for potential deepfake
    const aiAnalysis = await this.analyzeWithAI(
      request.contentUrl,
      request.contentType
    );

    const status = aiAnalysis.isDeepfake
      ? 'deepfake'
      : aiAnalysis.confidence > 70
      ? 'verified'
      : 'suspicious';

    const [verification] = await db
      .insert(contentVerification)
      .values({
        contentUrl: request.contentUrl,
        contentType: request.contentType,
        creatorId: request.creatorId,
        status,
        confidenceScore: aiAnalysis.confidence.toFixed(2),
        aiAnalysis: aiAnalysis.analysis,
        detectionMethod: 'ai_vision',
        flags: aiAnalysis.flags,
      })
      .returning();

    // If deepfake detected, create automatic report
    if (aiAnalysis.isDeepfake && request.creatorId) {
      await this.reportDeepfake({
        reportedContentUrl: request.contentUrl,
        reportedContentType: request.contentType,
        impersonatedCreatorId: request.creatorId,
        reportedBy: request.reportedBy,
        description: 'Automatically detected by AI system',
        evidence: aiAnalysis.analysis,
      });
    }

    return verification;
  }

  /**
   * Report deepfake content
   */
  async reportDeepfake(request: DeepfakeReportRequest): Promise<any> {
    // Check if creator exists
    const [creator] = await db
      .select()
      .from(users)
      .where(eq(users.id, request.impersonatedCreatorId));

    if (!creator) {
      throw new Error('Creator not found');
    }

    // Run verification if not already done
    const [existingVerification] = await db
      .select()
      .from(contentVerification)
      .where(eq(contentVerification.contentUrl, request.reportedContentUrl))
      .orderBy(desc(contentVerification.createdAt))
      .limit(1);

    let verificationId = existingVerification?.id;

    if (!existingVerification) {
      const verification = await this.verifyContent({
        contentUrl: request.reportedContentUrl,
        contentType: request.reportedContentType as 'image' | 'video' | 'audio',
        creatorId: request.impersonatedCreatorId,
        reportedBy: request.reportedBy,
      });
      verificationId = verification.id;
    }

    const reportSource = request.reportedBy ? 'user' : 'system';

    const [report] = await db
      .insert(deepfakeReports)
      .values({
        reportedContentUrl: request.reportedContentUrl,
        reportedContentType: request.reportedContentType,
        impersonatedCreatorId: request.impersonatedCreatorId,
        reportedBy: request.reportedBy,
        reportSource,
        verificationId,
        description: request.description,
        evidence: request.evidence || {},
        status: 'reported',
      })
      .returning();

    return report;
  }

  /**
   * Get deepfake reports for creator
   */
  async getCreatorReports(creatorId: string): Promise<any[]> {
    const reports = await db
      .select({
        report: deepfakeReports,
        verification: contentVerification,
      })
      .from(deepfakeReports)
      .leftJoin(
        contentVerification,
        eq(deepfakeReports.verificationId, contentVerification.id)
      )
      .where(eq(deepfakeReports.impersonatedCreatorId, creatorId))
      .orderBy(desc(deepfakeReports.createdAt));

    return reports;
  }

  /**
   * Get all pending reports (admin)
   * Returns reports in actionable statuses: reported, under_review, confirmed
   */
  async getPendingReports(): Promise<any[]> {
    const reports = await db
      .select({
        report: deepfakeReports,
        verification: contentVerification,
        creator: {
          id: users.id,
          username: users.username,
        },
      })
      .from(deepfakeReports)
      .leftJoin(
        contentVerification,
        eq(deepfakeReports.verificationId, contentVerification.id)
      )
      .leftJoin(
        users,
        eq(deepfakeReports.impersonatedCreatorId, users.id)
      )
      .where(
        sql`${deepfakeReports.status} IN ('reported', 'under_review', 'confirmed')`
      )
      .orderBy(desc(deepfakeReports.createdAt));

    return reports;
  }

  /**
   * Update report status (admin)
   */
  async updateReportStatus(
    reportId: string,
    status: 'under_review' | 'confirmed' | 'false_positive' | 'resolved',
    actionTaken?: string,
    resolvedBy?: string
  ): Promise<any> {
    const updates: any = {
      status,
      updatedAt: new Date(),
    };

    if (actionTaken) {
      updates.actionTaken = actionTaken;
    }

    if (status === 'resolved' && resolvedBy) {
      updates.resolvedBy = resolvedBy;
      updates.resolvedAt = new Date();
    }

    const [updated] = await db
      .update(deepfakeReports)
      .set(updates)
      .where(eq(deepfakeReports.id, reportId))
      .returning();

    return updated;
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(): Promise<any> {
    const stats = await db
      .select({
        status: contentVerification.status,
        count: sql<number>`count(*)::int`,
      })
      .from(contentVerification)
      .groupBy(contentVerification.status);

    const reportStats = await db
      .select({
        status: deepfakeReports.status,
        count: sql<number>`count(*)::int`,
      })
      .from(deepfakeReports)
      .groupBy(deepfakeReports.status);

    return {
      verifications: stats,
      reports: reportStats,
    };
  }
}

export const deepfakeDetectionService = new DeepfakeDetectionService();
