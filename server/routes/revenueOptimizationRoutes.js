// FANZ Revenue Optimization AI Routes
// API endpoints for AI-driven revenue optimization features

import express from 'express';
import RevenueOptimizationAI from '../services/revenueOptimizationAI.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const revenueAI = new RevenueOptimizationAI();

// === DYNAMIC PRICING AI ENDPOINTS ===

/**
 * @route POST /api/revenue-ai/pricing/analyze
 * @description Analyze optimal pricing for content using AI
 * @access Private
 */
router.post('/pricing/analyze', requireAuth, async (req, res) => {
  try {
    const { contentType, historicalData } = req.body;
    const creatorId = req.user.id;

    if (!contentType) {
      return res.status(400).json({
        success: false,
        error: 'Content type is required'
      });
    }

    // Validate content type
    const validTypes = ['VIDEO', 'PHOTO_SET', 'LIVE_STREAM', 'CUSTOM_REQUEST', 'SUBSCRIPTION'];
    if (!validTypes.includes(contentType.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type. Must be one of: ' + validTypes.join(', ')
      });
    }

    const analysis = await revenueAI.analyzePricingOptimization(
      creatorId,
      contentType.toUpperCase(),
      historicalData || {}
    );

    res.json({
      success: true,
      data: {
        pricingAnalysis: analysis,
        contentType,
        timestamp: new Date().toISOString(),
        creatorId
      }
    });

  } catch (error) {
    console.error('❌ Pricing analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze pricing optimization',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/revenue-ai/pricing/history/:creatorId
 * @description Get pricing analysis history for a creator
 * @access Private
 */
router.get('/pricing/history/:creatorId', requireAuth, async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { contentType, limit = 10 } = req.query;

    // Authorization check - users can only view their own data
    if (req.user.id !== creatorId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view this data'
      });
    }

    const history = [];
    const searchKey = contentType ? `${creatorId}_${contentType.toUpperCase()}` : null;

    if (searchKey) {
      // Get specific content type history
      const contentHistory = revenueAI.pricingModels.get(searchKey) || [];
      history.push({
        contentType: contentType.toUpperCase(),
        analyses: contentHistory.slice(-parseInt(limit))
      });
    } else {
      // Get all content type histories for this creator
      for (const [key, analyses] of revenueAI.pricingModels.entries()) {
        if (key.startsWith(`${creatorId}_`)) {
          const type = key.split('_')[1];
          history.push({
            contentType: type,
            analyses: analyses.slice(-parseInt(limit))
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        history,
        totalRecords: history.reduce((sum, item) => sum + item.analyses.length, 0),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Pricing history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pricing history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// === CONTENT SCHEDULING AI ENDPOINTS ===

/**
 * @route POST /api/revenue-ai/scheduling/optimize
 * @description Optimize content posting schedule using AI
 * @access Private
 */
router.post('/scheduling/optimize', requireAuth, async (req, res) => {
  try {
    const { historicalData } = req.body;
    const creatorId = req.user.id;

    const optimization = await revenueAI.optimizeContentScheduling(
      creatorId,
      historicalData || {}
    );

    res.json({
      success: true,
      data: {
        schedulingOptimization: optimization,
        creatorId,
        timestamp: new Date().toISOString(),
        recommendations: {
          summary: `Found ${optimization.optimalTimes.length} optimal posting times`,
          confidence: optimization.confidence,
          primaryTimezone: optimization.audienceTimezone
        }
      }
    });

  } catch (error) {
    console.error('❌ Scheduling optimization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize content scheduling',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/revenue-ai/scheduling/recommendations/:creatorId
 * @description Get quick scheduling recommendations
 * @access Private
 */
router.get('/scheduling/recommendations/:creatorId', requireAuth, async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { contentType } = req.query;

    // Authorization check
    if (req.user.id !== creatorId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view this data'
      });
    }

    // Get cached optimization data
    const cachedOptimization = revenueAI.schedulingOptimizer.get(creatorId);
    
    if (!cachedOptimization) {
      return res.status(404).json({
        success: false,
        error: 'No scheduling optimization found. Please run optimization first.'
      });
    }

    let recommendations = cachedOptimization.optimalTimes;
    
    // Filter by content type if specified
    if (contentType && cachedOptimization.contentTypeOptimization[contentType]) {
      recommendations = cachedOptimization.contentTypeOptimization[contentType].bestTimes;
    }

    res.json({
      success: true,
      data: {
        recommendations: recommendations.slice(0, 5),
        weeklySchedule: cachedOptimization.weeklySchedule,
        contentType: contentType || 'ALL',
        confidence: cachedOptimization.confidence,
        lastUpdated: cachedOptimization.lastUpdated || new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Scheduling recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduling recommendations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// === AUDIENCE SEGMENTATION AI ENDPOINTS ===

/**
 * @route POST /api/revenue-ai/audience/analyze
 * @description Analyze audience segments using AI
 * @access Private
 */
router.post('/audience/analyze', requireAuth, async (req, res) => {
  try {
    const { audienceData } = req.body;
    const creatorId = req.user.id;

    if (!audienceData || !audienceData.fans) {
      return res.status(400).json({
        success: false,
        error: 'Audience data with fans array is required'
      });
    }

    const analysis = await revenueAI.analyzeAudienceSegments(
      creatorId,
      audienceData
    );

    res.json({
      success: true,
      data: {
        audienceAnalysis: analysis,
        creatorId,
        timestamp: new Date().toISOString(),
        summary: {
          totalSegments: analysis.segments.length,
          totalRecommendations: analysis.recommendations.length,
          growthOpportunities: analysis.growthOpportunities.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Audience analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze audience segments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/revenue-ai/audience/segments/:creatorId
 * @description Get audience segments for a creator
 * @access Private
 */
router.get('/audience/segments/:creatorId', requireAuth, async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { segmentId } = req.query;

    // Authorization check
    if (req.user.id !== creatorId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view this data'
      });
    }

    const analysis = revenueAI.audienceSegments.get(creatorId);
    
    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: 'No audience analysis found. Please run analysis first.'
      });
    }

    let responseData = analysis;
    
    // Filter by specific segment if requested
    if (segmentId) {
      const segment = analysis.segments.find(s => s.id === segmentId);
      const recommendations = analysis.recommendations.filter(r => r.segmentId === segmentId);
      const targetingStrategy = analysis.targetingStrategies[segmentId];
      
      if (!segment) {
        return res.status(404).json({
          success: false,
          error: 'Segment not found'
        });
      }
      
      responseData = {
        segment,
        recommendations,
        targetingStrategy,
        segmentId
      };
    }

    res.json({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Audience segments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audience segments',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// === REVENUE PREDICTION AI ENDPOINTS ===

/**
 * @route POST /api/revenue-ai/predict
 * @description Predict future revenue using AI
 * @access Private
 */
router.post('/predict', requireAuth, async (req, res) => {
  try {
    const { timeframe = 'MONTHLY', inputData } = req.body;
    const creatorId = req.user.id;

    // Validate timeframe
    const validTimeframes = ['MONTHLY', 'YEARLY'];
    if (!validTimeframes.includes(timeframe.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timeframe. Must be MONTHLY or YEARLY'
      });
    }

    const prediction = await revenueAI.predictRevenue(
      creatorId,
      timeframe.toUpperCase(),
      inputData || {}
    );

    res.json({
      success: true,
      data: {
        revenuePrediction: prediction,
        timeframe: timeframe.toUpperCase(),
        creatorId,
        timestamp: new Date().toISOString(),
        summary: {
          predictedAmount: `$${prediction.prediction.toFixed(2)}`,
          confidence: `${Math.round(prediction.confidence * 100)}%`,
          opportunities: prediction.growthOpportunities.length,
          risks: prediction.riskFactors.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Revenue prediction error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict revenue',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/revenue-ai/predict/breakdown/:creatorId
 * @description Get revenue breakdown predictions
 * @access Private
 */
router.get('/predict/breakdown/:creatorId', requireAuth, async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { timeframe = 'MONTHLY' } = req.query;

    // Authorization check
    if (req.user.id !== creatorId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view this data'
      });
    }

    // Get cached prediction or create new one with minimal data
    let prediction;
    const cachedData = revenueAI.revenuePatterns.get(creatorId);
    
    if (cachedData) {
      prediction = cachedData;
    } else {
      // Generate prediction with default data
      prediction = await revenueAI.predictRevenue(
        creatorId,
        timeframe.toUpperCase(),
        {
          averageMonthlyRevenue: 1000,
          fanCount: 500,
          engagementRate: 0.1,
          retentionRate: 0.8
        }
      );
    }

    res.json({
      success: true,
      data: {
        breakdown: prediction.breakdown,
        total: prediction.prediction,
        confidence: prediction.confidence,
        opportunities: prediction.growthOpportunities,
        risks: prediction.riskFactors,
        timeframe: timeframe.toUpperCase(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Revenue breakdown error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revenue breakdown',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// === SYSTEM STATUS & MANAGEMENT ===

/**
 * @route GET /api/revenue-ai/status
 * @description Get Revenue Optimization AI system status
 * @access Private (Admin only)
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    // Admin check
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const status = revenueAI.getSystemStatus();

    res.json({
      success: true,
      data: {
        systemStatus: status,
        metrics: {
          totalCreatorsWithPricing: status.pricingModels,
          totalSchedulingOptimizations: status.schedulingOptimizers,
          totalAudienceAnalyses: status.audienceSegments,
          totalRevenuePatterns: status.revenuePatterns
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ System status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/revenue-ai/insights/comprehensive
 * @description Get comprehensive AI insights for a creator
 * @access Private
 */
router.post('/insights/comprehensive', requireAuth, async (req, res) => {
  try {
    const { inputData } = req.body;
    const creatorId = req.user.id;

    // Run all AI analyses
    const results = await Promise.allSettled([
      revenueAI.analyzePricingOptimization(creatorId, 'VIDEO', inputData?.pricing || {}),
      revenueAI.optimizeContentScheduling(creatorId, inputData?.scheduling || {}),
      revenueAI.analyzeAudienceSegments(creatorId, inputData?.audience || {}),
      revenueAI.predictRevenue(creatorId, 'MONTHLY', inputData?.revenue || {})
    ]);

    const insights = {
      pricing: results[0].status === 'fulfilled' ? results[0].value : null,
      scheduling: results[1].status === 'fulfilled' ? results[1].value : null,
      audience: results[2].status === 'fulfilled' ? results[2].value : null,
      revenue: results[3].status === 'fulfilled' ? results[3].value : null,
      errors: results
        .map((result, index) => result.status === 'rejected' ? { 
          type: ['pricing', 'scheduling', 'audience', 'revenue'][index], 
          error: result.reason.message 
        } : null)
        .filter(Boolean)
    };

    // Generate executive summary
    const summary = {
      totalInsights: Object.values(insights).filter(v => v !== null).length - 1, // -1 for errors array
      suggestedPrice: insights.pricing?.suggestedPrice || null,
      optimalPostingTimes: insights.scheduling?.optimalTimes?.length || 0,
      audienceSegments: insights.audience?.segments?.length || 0,
      predictedRevenue: insights.revenue?.prediction || null,
      confidence: {
        pricing: insights.pricing?.confidence || 0,
        scheduling: insights.scheduling?.confidence || 0,
        revenue: insights.revenue?.confidence || 0
      }
    };

    res.json({
      success: true,
      data: {
        insights,
        summary,
        creatorId,
        timestamp: new Date().toISOString(),
        hasErrors: insights.errors.length > 0
      }
    });

  } catch (error) {
    console.error('❌ Comprehensive insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate comprehensive insights',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/revenue-ai/dashboard/:creatorId
 * @description Get AI-powered revenue optimization dashboard data
 * @access Private
 */
router.get('/dashboard/:creatorId', requireAuth, async (req, res) => {
  try {
    const { creatorId } = req.params;

    // Authorization check
    if (req.user.id !== creatorId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view this data'
      });
    }

    // Gather all available AI data for the creator
    const dashboardData = {
      pricingInsights: null,
      schedulingOptimization: null,
      audienceSegmentation: null,
      revenuePatterns: null,
      recommendations: [],
      alerts: []
    };

    // Get cached data
    dashboardData.schedulingOptimization = revenueAI.schedulingOptimizer.get(creatorId);
    dashboardData.audienceSegmentation = revenueAI.audienceSegments.get(creatorId);
    dashboardData.revenuePatterns = revenueAI.revenuePatterns.get(creatorId);

    // Get recent pricing insights
    const pricingKeys = Array.from(revenueAI.pricingModels.keys())
      .filter(key => key.startsWith(`${creatorId}_`));
    
    if (pricingKeys.length > 0) {
      dashboardData.pricingInsights = {};
      pricingKeys.forEach(key => {
        const contentType = key.split('_')[1];
        const history = revenueAI.pricingModels.get(key);
        if (history && history.length > 0) {
          dashboardData.pricingInsights[contentType] = history[history.length - 1];
        }
      });
    }

    // Generate recommendations based on available data
    if (dashboardData.audienceSegmentation) {
      const topOpportunity = dashboardData.audienceSegmentation.growthOpportunities[0];
      if (topOpportunity) {
        dashboardData.recommendations.push({
          type: 'GROWTH_OPPORTUNITY',
          title: topOpportunity.type,
          description: topOpportunity.description,
          priority: topOpportunity.potential,
          action: 'Review audience segmentation for details'
        });
      }
    }

    if (dashboardData.schedulingOptimization) {
      const bestTime = dashboardData.schedulingOptimization.optimalTimes[0];
      if (bestTime) {
        dashboardData.recommendations.push({
          type: 'SCHEDULING',
          title: 'Optimal Posting Time',
          description: `Best time to post: ${bestTime.time} on ${bestTime.day}`,
          priority: 'HIGH',
          action: 'Schedule your next post at this time'
        });
      }
    }

    // Generate alerts for potential issues
    if (dashboardData.revenuePatterns) {
      dashboardData.revenuePatterns.riskFactors?.forEach(risk => {
        dashboardData.alerts.push({
          type: 'WARNING',
          title: risk.risk,
          description: risk.description,
          impact: risk.impact,
          timestamp: new Date().toISOString()
        });
      });
    }

    const summary = {
      hasData: Object.values(dashboardData).some(v => v !== null && 
        (Array.isArray(v) ? v.length > 0 : typeof v === 'object' ? Object.keys(v).length > 0 : true)
      ),
      dataTypes: Object.entries(dashboardData)
        .filter(([key, value]) => value !== null && key !== 'recommendations' && key !== 'alerts')
        .map(([key]) => key),
      recommendationsCount: dashboardData.recommendations.length,
      alertsCount: dashboardData.alerts.length
    };

    res.json({
      success: true,
      data: {
        dashboard: dashboardData,
        summary,
        creatorId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Dashboard data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;