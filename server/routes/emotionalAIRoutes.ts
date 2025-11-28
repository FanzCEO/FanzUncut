import { Router, Request, Response } from 'express';
import { emotionalAIService } from '../services/emotionalAIService';
import { isAuthenticated } from '../middleware/auth';
import { z } from 'zod';
import { db } from '../db';
import { messages, posts } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

// Validation schemas
const analyzeSentimentSchema = z.object({
  text: z.string().min(1).max(5000),
  context: z.object({
    userId: z.string().optional(),
    contentId: z.string().optional(),
    previousInteractions: z.number().optional(),
  }).optional(),
});

const analyzeContentSchema = z.object({
  text: z.string().optional(),
  caption: z.string().optional(),
  type: z.enum(['photo', 'video', 'text', 'poll']),
  tags: z.array(z.string()).optional(),
});

const getInsightsSchema = z.object({
  creatorId: z.string().optional(),
  fanId: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  days: z.number().min(1).max(90).default(7),
});

// ===== SENTIMENT ANALYSIS =====

// Analyze single message sentiment
router.post('/analyze-sentiment', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validationResult = analyzeSentimentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.errors[0].message,
      });
    }

    const { text, context } = validationResult.data;

    if (!emotionalAIService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Emotional AI service not configured (missing OpenAI API key)',
        fallbackEnabled: true,
      });
    }

    const result = await emotionalAIService.analyzeSentiment(text, context);

    return res.json({
      success: true,
      analysis: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== EMOTIONAL INSIGHTS =====

// Get emotional insights for creator's fans
router.post('/insights', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;
    
    const validationResult = getInsightsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.errors[0].message,
      });
    }

    const { creatorId, fanId, limit, days } = validationResult.data;

    if (!emotionalAIService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Emotional AI service not configured',
      });
    }

    // Get recent messages/comments from DMs or posts
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Fetch messages (either to creator or from specific fan)
    const messagesData = await db
      .select({
        text: messages.content,
        userId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(
          creatorId ? eq(messages.receiverId, creatorId) : eq(messages.receiverId, userId),
          fanId ? eq(messages.senderId, fanId) : sql`true`,
          sql`${messages.createdAt} >= ${cutoffDate}`
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    if (messagesData.length === 0) {
      return res.json({
        success: true,
        insights: {
          overallSentiment: 'neutral',
          dominantEmotions: [],
          engagementTrend: 'stable',
          atRiskFans: 0,
          loyalFans: 0,
          recommendations: ['No messages to analyze in the selected time period'],
        },
        messageCount: 0,
      });
    }

    const insights = await emotionalAIService.analyzeEmotionalInsights(
      messagesData.map(m => ({
        text: m.text || '',
        userId: m.userId || '',
        createdAt: m.createdAt || new Date(),
      }))
    );

    return res.json({
      success: true,
      insights,
      messageCount: messagesData.length,
      period: `Last ${days} days`,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== CONTENT ANALYSIS =====

// Predict fan reaction to content before posting
router.post('/predict-reaction', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validationResult = analyzeContentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: validationResult.error.errors[0].message,
      });
    }

    const content = validationResult.data;

    if (!emotionalAIService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Emotional AI service not configured',
      });
    }

    const analysis = await emotionalAIService.analyzeContentReaction(content);

    return res.json({
      success: true,
      analysis,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== ENGAGEMENT RECOMMENDATIONS =====

// Get AI-powered engagement recommendations
router.get('/recommendations', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId!;

    if (!emotionalAIService.isConfigured()) {
      return res.json({
        success: true,
        recommendations: [
          '💡 Enable OpenAI integration to unlock AI-powered engagement insights',
          '📊 Emotional AI can analyze fan sentiment and predict content performance',
        ],
      });
    }

    // Get recent fan messages
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    const messagesData = await db
      .select({
        text: messages.content,
        userId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          sql`${messages.createdAt} >= ${cutoffDate}`
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(30);

    if (messagesData.length === 0) {
      return res.json({
        success: true,
        recommendations: [
          '📬 No recent messages to analyze',
          '💬 Encourage fans to engage through polls, Q&A, or exclusive content',
        ],
      });
    }

    const insights = await emotionalAIService.analyzeEmotionalInsights(
      messagesData.map(m => ({
        text: m.text || '',
        userId: m.userId || '',
        createdAt: m.createdAt || new Date(),
      }))
    );

    return res.json({
      success: true,
      recommendations: insights.recommendations,
      insights: {
        overallSentiment: insights.overallSentiment,
        dominantEmotions: insights.dominantEmotions.slice(0, 3),
        engagementTrend: insights.engagementTrend,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ===== BATCH ANALYSIS =====

// Validation for batch messages
const batchMessageSchema = z.object({
  id: z.string().optional(),
  messageId: z.string().optional(),
  text: z.string().min(1).max(5000),
  userId: z.string().optional(),
  contentId: z.string().optional(),
  previousInteractions: z.number().optional(),
});

// Analyze multiple messages at once
router.post('/batch-analyze', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'messages array is required',
      });
    }

    if (messages.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 messages per batch',
      });
    }

    // Validate each message
    const validationErrors: string[] = [];
    for (let i = 0; i < messages.length; i++) {
      const result = batchMessageSchema.safeParse(messages[i]);
      if (!result.success) {
        validationErrors.push(`Message ${i}: ${result.error.errors[0].message}`);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors.slice(0, 5), // Show first 5 errors
      });
    }

    if (!emotionalAIService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'Emotional AI service not configured',
      });
    }

    // Analyze messages with concurrency limit (max 5 at a time to avoid rate limits)
    const results: any[] = [];
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (msg: any) => {
          try {
            const analysis = await emotionalAIService.analyzeSentiment(
              msg.text,
              {
                userId: msg.userId,
                contentId: msg.contentId,
                previousInteractions: msg.previousInteractions,
              }
            );
            
            return {
              messageId: msg.id || msg.messageId,
              text: msg.text.substring(0, 100) + (msg.text.length > 100 ? '...' : ''),
              analysis,
            };
          } catch (error: any) {
            return {
              messageId: msg.id || msg.messageId,
              text: msg.text.substring(0, 100),
              error: error.message,
              analysis: null,
            };
          }
        })
      );
      
      results.push(...batchResults);
      
      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < messages.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return res.json({
      success: true,
      results,
      count: results.length,
      successCount: results.filter(r => r.analysis).length,
      errorCount: results.filter(r => r.error).length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export { router as emotionalAIRoutes };
