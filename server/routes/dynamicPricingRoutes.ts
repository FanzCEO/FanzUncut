import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { dynamicPricingService } from "../services/dynamicPricingService";

const router = Router();

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const priceRecommendationSchema = z.object({
  contentId: z.string().optional(),
  planId: z.string().optional(),
  currentPriceCents: z.number().int().positive(),
  
  // Constraints
  minPriceCents: z.number().int().positive(),
  maxPriceCents: z.number().int().positive(),
  strategy: z.enum(['fixed', 'dynamic', 'tiered', 'demand_based']).default('dynamic'),
  
  // Context data (optional)
  viewCount: z.number().int().optional(),
  likeCount: z.number().int().optional(),
  purchaseCount: z.number().int().optional(),
  conversionRate: z.number().min(0).max(1).optional(),
  contentAge: z.number().int().optional(),
  followerCount: z.number().int().optional(),
  avgEngagementRate: z.number().min(0).max(1).optional(),
}).refine(data => data.contentId || data.planId, {
  message: "Either contentId or planId must be provided"
});

const demandPricingSchema = z.object({
  basePriceCents: z.number().int().positive(),
  demandMultiplier: z.number().min(0.5).max(2.0),
  minPriceCents: z.number().int().positive(),
  maxPriceCents: z.number().int().positive(),
});

const timeDecayPricingSchema = z.object({
  basePriceCents: z.number().int().positive(),
  ageInDays: z.number().int().min(0),
  decayRate: z.number().min(0).max(1).default(0.05),
  minPriceCents: z.number().int().positive(),
  maxPriceCents: z.number().int().positive(),
});

const competitorAnalysisSchema = z.object({
  contentType: z.string(),
  creatorTier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']),
});

// ============================================================
// DYNAMIC PRICING AI ROUTES
// ============================================================

/**
 * POST /api/pricing/recommend
 * Get AI-powered price recommendation
 */
router.post("/recommend", async (req: Request, res: Response) => {
  try {
    // Authentication check
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    // Validate input
    const data = priceRecommendationSchema.parse(req.body);
    
    // Build context
    const context = {
      contentId: data.contentId,
      planId: data.planId,
      creatorId: req.session.userId,
      currentPriceCents: data.currentPriceCents,
      viewCount: data.viewCount,
      likeCount: data.likeCount,
      purchaseCount: data.purchaseCount,
      conversionRate: data.conversionRate,
      contentAge: data.contentAge,
      followerCount: data.followerCount,
      avgEngagementRate: data.avgEngagementRate,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
    };

    const constraints = {
      minPriceCents: data.minPriceCents,
      maxPriceCents: data.maxPriceCents,
      strategy: data.strategy,
    };

    // Get AI recommendation
    const recommendation = await dynamicPricingService.generatePriceRecommendation(
      context,
      constraints
    );

    res.json({
      success: true,
      recommendation,
      savings: data.currentPriceCents - recommendation.suggestedPriceCents,
      changePercent: ((recommendation.suggestedPriceCents - data.currentPriceCents) / data.currentPriceCents * 100).toFixed(2)
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to generate price recommendation"
    });
  }
});

/**
 * POST /api/pricing/demand
 * Calculate demand-based pricing
 */
router.post("/demand", async (req: Request, res: Response) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    const data = demandPricingSchema.parse(req.body);

    const adjustedPrice = dynamicPricingService.calculateDemandPrice(
      data.basePriceCents,
      data.demandMultiplier,
      {
        minPriceCents: data.minPriceCents,
        maxPriceCents: data.maxPriceCents,
        strategy: 'demand_based',
      }
    );

    res.json({
      success: true,
      basePriceCents: data.basePriceCents,
      adjustedPriceCents: adjustedPrice,
      changePercent: ((adjustedPrice - data.basePriceCents) / data.basePriceCents * 100).toFixed(2),
      demandMultiplier: data.demandMultiplier,
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to calculate demand pricing"
    });
  }
});

/**
 * POST /api/pricing/time-decay
 * Calculate time-decay pricing
 */
router.post("/time-decay", async (req: Request, res: Response) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    const data = timeDecayPricingSchema.parse(req.body);

    const adjustedPrice = dynamicPricingService.calculateTimeDecayPrice(
      data.basePriceCents,
      data.ageInDays,
      data.decayRate,
      {
        minPriceCents: data.minPriceCents,
        maxPriceCents: data.maxPriceCents,
        strategy: 'dynamic',
      }
    );

    res.json({
      success: true,
      basePriceCents: data.basePriceCents,
      adjustedPriceCents: adjustedPrice,
      changePercent: ((adjustedPrice - data.basePriceCents) / data.basePriceCents * 100).toFixed(2),
      ageInDays: data.ageInDays,
      decayRate: data.decayRate,
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to calculate time-decay pricing"
    });
  }
});

/**
 * POST /api/pricing/competitor-analysis
 * Analyze competitor pricing
 */
router.post("/competitor-analysis", async (req: Request, res: Response) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required"
      });
    }

    const data = competitorAnalysisSchema.parse(req.body);

    const analysis = await dynamicPricingService.analyzeCompetitorPricing(
      data.contentType,
      data.creatorTier
    );

    res.json({
      success: true,
      analysis,
      contentType: data.contentType,
      creatorTier: data.creatorTier,
    });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to analyze competitor pricing"
    });
  }
});

export { router as dynamicPricingRoutes };
