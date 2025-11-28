// FANZ Analytics & Intelligence API Routes
// Comprehensive analytics endpoints for real-time dashboards, AI insights, predictive modeling, competitor analysis

import express from 'express';
import AnalyticsIntelligenceEngine from '../services/analyticsIntelligenceEngine.js';

const router = express.Router();
const analyticsEngine = new AnalyticsIntelligenceEngine();

// === REAL-TIME DASHBOARDS ===

// Create a new real-time dashboard
router.post('/dashboards', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const dashboardConfig = {
      name: req.body.name || 'New Dashboard',
      type: req.body.type || 'CREATOR',
      layout: req.body.layout || 'GRID',
      refreshRate: req.body.refreshRate || 5000,
      theme: req.body.theme || 'DARK',
      timezone: req.body.timezone || 'UTC',
      currency: req.body.currency || 'USD',
      dateRange: req.body.dateRange || '30d'
    };

    const dashboard = await analyticsEngine.createRealTimeDashboard(userId, dashboardConfig);
    
    res.status(201).json({
      success: true,
      message: 'Real-time dashboard created successfully',
      dashboard,
      analytics: {
        widgets: dashboard.widgets.length,
        type: dashboard.type,
        refreshRate: dashboard.refreshRate
      }
    });
  } catch (error) {
    console.error('Dashboard creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create dashboard',
      error: error.message
    });
  }
});

// Get dashboard data (real-time refresh)
router.get('/dashboards/:dashboardId', async (req, res) => {
  try {
    const { dashboardId } = req.params;
    const dashboard = await analyticsEngine.getDashboardData(dashboardId);
    
    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: 'Dashboard not found'
      });
    }

    res.json({
      success: true,
      dashboard,
      metadata: {
        lastUpdate: new Date().toISOString(),
        widgets: dashboard.widgets.length,
        refreshRate: dashboard.refreshRate
      }
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

// Get analytics overview for a user
router.get('/overview/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const timeframe = req.query.timeframe || '30d';
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const overview = await analyticsEngine.getAnalyticsOverview(userId, timeframe);
    
    res.json({
      success: true,
      overview,
      metadata: {
        generated: new Date().toISOString(),
        timeframe
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics overview',
      error: error.message
    });
  }
});

// === PREDICTIVE MODELING ===

// Create a new predictive model
router.post('/models/predictive', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const modelConfig = {
      name: req.body.name || 'Revenue Prediction Model',
      type: req.body.type || 'REVENUE_PREDICTION',
      algorithm: req.body.algorithm || 'TRANSFORMER_NEURAL_NETWORK',
      features: req.body.features || [],
      hyperparameters: req.body.hyperparameters || {}
    };

    const model = await analyticsEngine.createPredictiveModel(userId, modelConfig);
    
    res.status(201).json({
      success: true,
      message: 'Predictive model created and trained successfully',
      model,
      training: {
        accuracy: `${model.accuracy.toFixed(2)}%`,
        confidence: `${model.confidence.toFixed(2)}%`,
        epochs: model.metadata.trainingEpochs,
        predictions: model.predictions.length
      }
    });
  } catch (error) {
    console.error('Predictive model creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create predictive model',
      error: error.message
    });
  }
});

// Get predictive insights for a user
router.get('/insights/predictive/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const modelType = req.query.type || 'REVENUE_PREDICTION';
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const model = await analyticsEngine.getPredictiveInsights(userId, modelType);
    
    res.json({
      success: true,
      model,
      insights: {
        predictions: model.predictions,
        accuracy: `${model.accuracy.toFixed(2)}%`,
        confidence: `${model.confidence.toFixed(2)}%`,
        lastTrained: model.metadata.lastTrained
      }
    });
  } catch (error) {
    console.error('Predictive insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get predictive insights',
      error: error.message
    });
  }
});

// === COMPETITOR ANALYSIS ===

// Perform comprehensive competitor analysis
router.post('/competitor-analysis', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const competitors = req.body.competitors || [];
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const analysis = await analyticsEngine.performCompetitorAnalysis(userId, competitors);
    
    res.status(201).json({
      success: true,
      message: 'Competitor analysis completed successfully',
      analysis,
      summary: {
        competitorsAnalyzed: analysis.competitors.length,
        dataPoints: analysis.metadata.dataPoints,
        confidenceLevel: `${analysis.metadata.confidenceLevel.toFixed(1)}%`,
        marketPosition: analysis.marketPosition?.overall,
        competitiveAdvantages: analysis.competitiveAdvantages.length
      }
    });
  } catch (error) {
    console.error('Competitor analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform competitor analysis',
      error: error.message
    });
  }
});

// Get competitor analysis results
router.get('/competitor-analysis/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get most recent analysis for the user
    const analyses = Array.from(analyticsEngine.competitorAnalysis.values())
      .filter(analysis => analysis.userId === userId)
      .sort((a, b) => new Date(b.analyzed) - new Date(a.analyzed));
    
    if (analyses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No competitor analysis found for this user'
      });
    }

    const analysis = analyses[0];
    
    res.json({
      success: true,
      analysis,
      metadata: {
        isLatest: true,
        analyzed: analysis.analyzed,
        competitors: analysis.competitors.length
      }
    });
  } catch (error) {
    console.error('Competitor analysis fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch competitor analysis',
      error: error.message
    });
  }
});

// === SOCIAL SENTIMENT TRACKING ===

// Start social sentiment tracking
router.post('/sentiment/track', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const keywords = req.body.keywords || [];
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const tracking = await analyticsEngine.trackSocialSentiment(userId, keywords);
    
    res.status(201).json({
      success: true,
      message: 'Social sentiment tracking initiated successfully',
      tracking,
      results: {
        overallSentiment: tracking.sentiment.overall,
        sentimentScore: `${tracking.sentiment.score}/100`,
        totalMentions: tracking.mentions.total,
        sources: Object.keys(tracking.mentions.sources).length,
        trends: tracking.trends.length,
        confidenceLevel: `${tracking.metadata.confidenceLevel.toFixed(1)}%`
      }
    });
  } catch (error) {
    console.error('Sentiment tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start sentiment tracking',
      error: error.message
    });
  }
});

// Get sentiment analysis results
router.get('/sentiment/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get most recent sentiment analysis for the user
    const analyses = Array.from(analyticsEngine.sentimentTracking.values())
      .filter(analysis => analysis.userId === userId)
      .sort((a, b) => new Date(b.analyzed) - new Date(a.analyzed));
    
    if (analyses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No sentiment analysis found for this user'
      });
    }

    const analysis = analyses[0];
    
    res.json({
      success: true,
      sentiment: analysis,
      summary: {
        overall: analysis.sentiment.overall,
        score: analysis.sentiment.score,
        mentions: analysis.mentions.total,
        growth: `${analysis.mentions.growth >= 0 ? '+' : ''}${analysis.mentions.growth}%`,
        topTrend: analysis.trends[0]?.topic || 'N/A'
      }
    });
  } catch (error) {
    console.error('Sentiment fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sentiment analysis',
      error: error.message
    });
  }
});

// === REVENUE OPTIMIZATION ===

// Run revenue optimization analysis
router.post('/revenue/optimize', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const optimizationConfig = {
      currentRevenue: req.body.currentRevenue,
      targetIncrease: req.body.targetIncrease || 25
    };
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const optimization = await analyticsEngine.optimizeRevenue(userId, optimizationConfig);
    
    res.status(201).json({
      success: true,
      message: 'Revenue optimization analysis completed',
      optimization,
      results: {
        currentRevenue: `$${optimization.currentRevenue.toLocaleString()}`,
        projectedRevenue: `$${optimization.projections.optimizedRevenue.toLocaleString()}`,
        expectedIncrease: `${optimization.targetIncrease}%`,
        expectedROI: `${optimization.metadata.expectedROI.toFixed(1)}%`,
        strategies: optimization.strategies.length,
        breakeven: optimization.projections.breakeven
      }
    });
  } catch (error) {
    console.error('Revenue optimization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to run revenue optimization',
      error: error.message
    });
  }
});

// Get revenue optimization results
router.get('/revenue/optimization/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get most recent optimization for the user
    const optimizations = Array.from(analyticsEngine.revenueOptimization.values())
      .filter(opt => opt.userId === userId)
      .sort((a, b) => new Date(b.optimized) - new Date(a.optimized));
    
    if (optimizations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No revenue optimization found for this user'
      });
    }

    const optimization = optimizations[0];
    
    res.json({
      success: true,
      optimization,
      summary: {
        currentRevenue: optimization.currentRevenue,
        projectedIncrease: `${optimization.targetIncrease}%`,
        roi: `${optimization.metadata.expectedROI.toFixed(1)}%`,
        topStrategy: optimization.strategies[0]?.name || 'N/A'
      }
    });
  } catch (error) {
    console.error('Revenue optimization fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue optimization',
      error: error.message
    });
  }
});

// === AI INSIGHTS ===

// Generate comprehensive AI insights
router.post('/insights/ai', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const dataContext = req.body.context || {};
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const insights = await analyticsEngine.generateAIInsights(userId, dataContext);
    
    res.status(201).json({
      success: true,
      message: 'AI insights generated successfully',
      insights,
      summary: {
        totalInsights: insights.insights.length,
        predictions: insights.predictions.length,
        opportunities: insights.opportunities.length,
        recommendations: insights.recommendations.length,
        confidence: `${insights.confidence.toFixed(1)}%`,
        processingTime: `${insights.metadata.processingTime}ms`
      }
    });
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI insights',
      error: error.message
    });
  }
});

// Get AI insights for a user
router.get('/insights/ai/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get most recent insights for the user
    const allInsights = Array.from(analyticsEngine.aiInsights.values())
      .filter(insight => insight.userId === userId)
      .sort((a, b) => new Date(b.generated) - new Date(a.generated));
    
    if (allInsights.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No AI insights found for this user'
      });
    }

    const insights = allInsights[0];
    
    res.json({
      success: true,
      insights,
      metadata: {
        isLatest: true,
        generated: insights.generated,
        confidence: `${insights.confidence.toFixed(1)}%`
      }
    });
  } catch (error) {
    console.error('AI insights fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI insights',
      error: error.message
    });
  }
});

// === CUSTOM REPORTS ===

// Generate custom report
router.post('/reports/generate', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const reportConfig = {
      name: req.body.name || 'Custom Report',
      type: req.body.type || 'PERFORMANCE',
      dateRange: req.body.dateRange || '30d',
      metrics: req.body.metrics || [],
      scheduled: req.body.scheduled || false
    };
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const report = await analyticsEngine.generateCustomReport(userId, reportConfig);
    
    res.status(201).json({
      success: true,
      message: 'Custom report generated successfully',
      report,
      metadata: {
        reportId: report.id,
        type: report.type,
        dataPoints: report.metadata.dataPoints,
        fileSize: `${report.metadata.fileSize} KB`,
        accuracy: `${report.metadata.accuracy.toFixed(1)}%`,
        exportFormats: report.exportFormats
      }
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate custom report',
      error: error.message
    });
  }
});

// Get custom report
router.get('/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = analyticsEngine.customReports.get(reportId);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      report,
      metadata: {
        generated: report.generated,
        type: report.type,
        metrics: report.metrics.length || 0
      }
    });
  } catch (error) {
    console.error('Report fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report',
      error: error.message
    });
  }
});

// List all reports for a user
router.get('/reports/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userReports = Array.from(analyticsEngine.customReports.values())
      .filter(report => report.userId === userId)
      .sort((a, b) => new Date(b.generated) - new Date(a.generated))
      .map(report => ({
        id: report.id,
        name: report.name,
        type: report.type,
        generated: report.generated,
        dateRange: report.dateRange,
        scheduled: report.scheduled
      }));

    res.json({
      success: true,
      reports: userReports,
      total: userReports.length
    });
  } catch (error) {
    console.error('Reports list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user reports',
      error: error.message
    });
  }
});

// === ANALYTICS AGGREGATION ===

// Get comprehensive analytics summary
router.get('/summary/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const timeframe = req.query.timeframe || '30d';
    
    // Get latest data from all analytics categories
    const [
      overview,
      predictiveInsights,
      sentimentAnalysis,
      competitorAnalysis,
      revenueOptimization,
      aiInsights
    ] = await Promise.all([
      analyticsEngine.getAnalyticsOverview(userId, timeframe),
      analyticsEngine.getPredictiveInsights(userId, 'REVENUE_PREDICTION').catch(() => null),
      Array.from(analyticsEngine.sentimentTracking.values())
        .filter(s => s.userId === userId).sort((a, b) => new Date(b.analyzed) - new Date(a.analyzed))[0] || null,
      Array.from(analyticsEngine.competitorAnalysis.values())
        .filter(c => c.userId === userId).sort((a, b) => new Date(b.analyzed) - new Date(a.analyzed))[0] || null,
      Array.from(analyticsEngine.revenueOptimization.values())
        .filter(r => r.userId === userId).sort((a, b) => new Date(b.optimized) - new Date(a.optimized))[0] || null,
      Array.from(analyticsEngine.aiInsights.values())
        .filter(i => i.userId === userId).sort((a, b) => new Date(b.generated) - new Date(a.generated))[0] || null
    ]);

    const summary = {
      userId,
      timeframe,
      overview,
      predictiveInsights: predictiveInsights ? {
        accuracy: `${predictiveInsights.accuracy.toFixed(2)}%`,
        predictions: predictiveInsights.predictions.slice(0, 3), // Top 3 predictions
        lastTrained: predictiveInsights.metadata.lastTrained
      } : null,
      sentiment: sentimentAnalysis ? {
        overall: sentimentAnalysis.sentiment.overall,
        score: sentimentAnalysis.sentiment.score,
        mentions: sentimentAnalysis.mentions.total
      } : null,
      competition: competitorAnalysis ? {
        marketPosition: competitorAnalysis.marketPosition?.overall,
        competitorsAnalyzed: competitorAnalysis.competitors.length,
        keyAdvantages: competitorAnalysis.competitiveAdvantages.slice(0, 3)
      } : null,
      revenue: revenueOptimization ? {
        currentRevenue: revenueOptimization.currentRevenue,
        projectedIncrease: `${revenueOptimization.targetIncrease}%`,
        topStrategy: revenueOptimization.strategies[0]?.name
      } : null,
      aiInsights: aiInsights ? {
        totalInsights: aiInsights.insights.length,
        confidence: `${aiInsights.confidence.toFixed(1)}%`,
        topRecommendation: aiInsights.recommendations[0]
      } : null,
      generated: new Date().toISOString()
    };

    res.json({
      success: true,
      summary,
      metadata: {
        completeness: Object.values(summary).filter(v => v !== null && v !== undefined).length / 7 * 100,
        lastUpdate: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics summary',
      error: error.message
    });
  }
});

// === HEALTH CHECK ===

// Analytics engine health check
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        dashboards: analyticsEngine.realTimeDashboards.size,
        predictiveModels: analyticsEngine.predictiveModels.size,
        competitorAnalyses: analyticsEngine.competitorAnalysis.size,
        sentimentTracking: analyticsEngine.sentimentTracking.size,
        revenueOptimizations: analyticsEngine.revenueOptimization.size,
        aiInsights: analyticsEngine.aiInsights.size,
        customReports: analyticsEngine.customReports.size
      },
      aiModels: analyticsEngine.aiModels,
      dataStreams: {
        realTime: analyticsEngine.dataStreams.realTime,
        sources: analyticsEngine.dataStreams.sources.length,
        updateFrequency: `${analyticsEngine.dataStreams.updateFrequency}ms`
      }
    };

    res.json({
      success: true,
      health
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

export default router;