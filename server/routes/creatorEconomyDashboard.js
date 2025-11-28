// FANZ Creator Economy Dashboard API Routes
// Comprehensive dashboard management, analytics tracking, and insights generation

import express from 'express';
import CreatorEconomyDashboard from '../services/creatorEconomyDashboard.js';

const router = express.Router();
const dashboardService = new CreatorEconomyDashboard();

// === DASHBOARD MANAGEMENT ROUTES ===

/**
 * @route   POST /api/dashboard/create
 * @desc    Create a new creator economy dashboard
 * @access  Private
 * @body    { creatorId, config }
 */
router.post('/create', async (req, res) => {
  try {
    const { creatorId, config = {} } = req.body;
    
    if (!creatorId) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID is required',
        code: 'MISSING_CREATOR_ID'
      });
    }

    console.log(`📊 Creating creator dashboard for ${creatorId}...`);
    const dashboard = await dashboardService.createCreatorDashboard(creatorId, config);

    res.status(201).json({
      success: true,
      data: {
        dashboard: {
          id: dashboard.id,
          creatorId: dashboard.creatorId,
          config: dashboard.config,
          overview: dashboard.overview,
          status: dashboard.status,
          createdAt: dashboard.createdAt
        }
      },
      message: 'Creator economy dashboard created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating creator dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create creator dashboard',
      details: error.message,
      code: 'DASHBOARD_CREATION_ERROR'
    });
  }
});

/**
 * @route   GET /api/dashboard/:creatorId
 * @desc    Get creator dashboard with real-time analytics
 * @access  Private
 */
router.get('/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    
    console.log(`📈 Retrieving dashboard for creator ${creatorId}...`);
    const dashboard = await dashboardService.getDashboard(creatorId);

    res.json({
      success: true,
      data: {
        dashboard: {
          id: dashboard.id,
          creatorId: dashboard.creatorId,
          config: dashboard.config,
          overview: dashboard.overview,
          revenueBreakdown: dashboard.revenueBreakdown,
          fanAnalytics: {
            ...dashboard.fanAnalytics,
            demographics: {
              ageGroups: Object.fromEntries(dashboard.fanAnalytics.demographics.ageGroups),
              genderDistribution: Object.fromEntries(dashboard.fanAnalytics.demographics.genderDistribution),
              locationDistribution: Object.fromEntries(dashboard.fanAnalytics.demographics.locationDistribution),
              devicePreferences: Object.fromEntries(dashboard.fanAnalytics.demographics.devicePreferences)
            }
          },
          contentPerformance: dashboard.contentPerformance,
          growthMetrics: dashboard.growthMetrics,
          aiInsights: {
            ...dashboard.aiInsights,
            pricingOptimization: {
              ...dashboard.aiInsights.pricingOptimization,
              suggestedPrices: Object.fromEntries(dashboard.aiInsights.pricingOptimization.suggestedPrices)
            }
          },
          alerts: dashboard.alerts,
          updatedAt: dashboard.updatedAt
        }
      },
      message: 'Dashboard retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error retrieving dashboard:', error);
    res.status(error.message === 'Dashboard not found' ? 404 : 500).json({
      success: false,
      error: error.message === 'Dashboard not found' ? 'Dashboard not found' : 'Failed to retrieve dashboard',
      details: error.message,
      code: error.message === 'Dashboard not found' ? 'DASHBOARD_NOT_FOUND' : 'DASHBOARD_RETRIEVAL_ERROR'
    });
  }
});

/**
 * @route   POST /api/dashboard/:creatorId/refresh
 * @desc    Refresh dashboard data with latest analytics
 * @access  Private
 */
router.post('/:creatorId/refresh', async (req, res) => {
  try {
    const { creatorId } = req.params;
    
    console.log(`🔄 Refreshing dashboard for creator ${creatorId}...`);
    const dashboard = await dashboardService.getDashboard(creatorId);
    
    if (!dashboard) {
      return res.status(404).json({
        success: false,
        error: 'Dashboard not found',
        code: 'DASHBOARD_NOT_FOUND'
      });
    }

    await dashboardService.refreshDashboardData(dashboard.id);

    res.json({
      success: true,
      data: {
        refreshedAt: new Date().toISOString(),
        dashboardId: dashboard.id
      },
      message: 'Dashboard refreshed successfully'
    });

  } catch (error) {
    console.error('❌ Error refreshing dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh dashboard',
      details: error.message,
      code: 'DASHBOARD_REFRESH_ERROR'
    });
  }
});

// === REVENUE ANALYTICS ROUTES ===

/**
 * @route   POST /api/dashboard/revenue/update
 * @desc    Update revenue analytics data
 * @access  Private
 * @body    { creatorId, revenueData }
 */
router.post('/revenue/update', async (req, res) => {
  try {
    const { creatorId, revenueData } = req.body;
    
    if (!creatorId || !revenueData) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID and revenue data are required',
        code: 'MISSING_REQUIRED_DATA'
      });
    }

    if (!revenueData.amount || revenueData.amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid revenue amount is required',
        code: 'INVALID_REVENUE_AMOUNT'
      });
    }

    console.log(`💰 Updating revenue analytics for creator ${creatorId}: +$${revenueData.amount}`);
    const analyticsData = await dashboardService.updateRevenueAnalytics(creatorId, revenueData);

    res.json({
      success: true,
      data: {
        revenueUpdate: {
          amount: revenueData.amount,
          source: revenueData.source || 'OTHER',
          updatedAt: new Date().toISOString()
        },
        totals: {
          daily: Array.from(analyticsData.daily.values()).slice(-1)[0] || 0,
          monthly: Array.from(analyticsData.monthly.values()).slice(-1)[0] || 0,
          yearly: Array.from(analyticsData.yearly.values()).reduce((sum, amount) => sum + amount, 0)
        }
      },
      message: 'Revenue analytics updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating revenue analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update revenue analytics',
      details: error.message,
      code: 'REVENUE_UPDATE_ERROR'
    });
  }
});

/**
 * @route   GET /api/dashboard/revenue/:creatorId/breakdown
 * @desc    Get detailed revenue breakdown and trends
 * @access  Private
 */
router.get('/revenue/:creatorId/breakdown', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { timeframe = 'MONTHLY' } = req.query;
    
    console.log(`📊 Getting revenue breakdown for creator ${creatorId}`);
    const dashboard = await dashboardService.getDashboard(creatorId);

    const revenueBreakdown = {
      overview: dashboard.overview,
      breakdown: dashboard.revenueBreakdown,
      growth: dashboard.overview.revenueGrowth,
      timeframe,
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: { revenueBreakdown },
      message: 'Revenue breakdown retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error getting revenue breakdown:', error);
    res.status(error.message === 'Dashboard not found' ? 404 : 500).json({
      success: false,
      error: error.message === 'Dashboard not found' ? 'Dashboard not found' : 'Failed to get revenue breakdown',
      details: error.message,
      code: error.message === 'Dashboard not found' ? 'DASHBOARD_NOT_FOUND' : 'REVENUE_BREAKDOWN_ERROR'
    });
  }
});

// === FAN ANALYTICS ROUTES ===

/**
 * @route   POST /api/dashboard/fans/update
 * @desc    Update fan analytics data
 * @access  Private
 * @body    { creatorId, fanData }
 */
router.post('/fans/update', async (req, res) => {
  try {
    const { creatorId, fanData } = req.body;
    
    if (!creatorId || !fanData) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID and fan data are required',
        code: 'MISSING_REQUIRED_DATA'
      });
    }

    console.log(`👥 Updating fan analytics for creator ${creatorId}`);
    const analyticsData = await dashboardService.updateFanAnalytics(creatorId, fanData);

    res.json({
      success: true,
      data: {
        fanUpdate: {
          type: fanData.type,
          updatedAt: new Date().toISOString()
        },
        totals: {
          totalFans: analyticsData.totalFans,
          activeFans: analyticsData.activeFans,
          newFansMonthly: analyticsData.newFans.monthly
        }
      },
      message: 'Fan analytics updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating fan analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update fan analytics',
      details: error.message,
      code: 'FAN_ANALYTICS_UPDATE_ERROR'
    });
  }
});

/**
 * @route   GET /api/dashboard/fans/:creatorId/demographics
 * @desc    Get detailed fan demographics and behavior patterns
 * @access  Private
 */
router.get('/fans/:creatorId/demographics', async (req, res) => {
  try {
    const { creatorId } = req.params;
    
    console.log(`📈 Getting fan demographics for creator ${creatorId}`);
    const dashboard = await dashboardService.getDashboard(creatorId);

    const demographics = {
      overview: dashboard.overview.fanCount,
      demographics: {
        ageGroups: Object.fromEntries(dashboard.fanAnalytics.demographics.ageGroups),
        locations: Object.fromEntries(dashboard.fanAnalytics.demographics.locationDistribution),
        devices: Object.fromEntries(dashboard.fanAnalytics.demographics.devicePreferences)
      },
      behaviorPatterns: dashboard.fanAnalytics.behaviorPatterns,
      segmentation: dashboard.fanAnalytics.segmentation,
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: { demographics },
      message: 'Fan demographics retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error getting fan demographics:', error);
    res.status(error.message === 'Dashboard not found' ? 404 : 500).json({
      success: false,
      error: error.message === 'Dashboard not found' ? 'Dashboard not found' : 'Failed to get fan demographics',
      details: error.message,
      code: error.message === 'Dashboard not found' ? 'DASHBOARD_NOT_FOUND' : 'FAN_DEMOGRAPHICS_ERROR'
    });
  }
});

// === CONTENT PERFORMANCE ROUTES ===

/**
 * @route   POST /api/dashboard/content/track
 * @desc    Track content performance
 * @access  Private
 * @body    { creatorId, contentData }
 */
router.post('/content/track', async (req, res) => {
  try {
    const { creatorId, contentData } = req.body;
    
    if (!creatorId || !contentData) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID and content data are required',
        code: 'MISSING_REQUIRED_DATA'
      });
    }

    if (!contentData.id || !contentData.title || !contentData.type) {
      return res.status(400).json({
        success: false,
        error: 'Content ID, title, and type are required',
        code: 'INVALID_CONTENT_DATA'
      });
    }

    console.log(`🎬 Tracking content performance for creator ${creatorId}: ${contentData.title}`);
    const contentMetrics = await dashboardService.trackContentPerformance(creatorId, contentData);

    res.json({
      success: true,
      data: {
        contentMetrics: {
          id: contentMetrics.id,
          title: contentMetrics.title,
          type: contentMetrics.type,
          performance: contentMetrics.performance,
          metrics: contentMetrics.metrics,
          trackedAt: new Date().toISOString()
        }
      },
      message: 'Content performance tracked successfully'
    });

  } catch (error) {
    console.error('❌ Error tracking content performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track content performance',
      details: error.message,
      code: 'CONTENT_TRACKING_ERROR'
    });
  }
});

/**
 * @route   GET /api/dashboard/content/:creatorId/performance
 * @desc    Get content performance analytics
 * @access  Private
 */
router.get('/content/:creatorId/performance', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { limit = 10, sortBy = 'ENGAGEMENT' } = req.query;
    
    console.log(`📊 Getting content performance for creator ${creatorId}`);
    const dashboard = await dashboardService.getDashboard(creatorId);

    const contentPerformance = {
      overview: dashboard.contentPerformance.contentMetrics,
      topPerforming: dashboard.contentPerformance.topPerformingContent.slice(0, parseInt(limit)),
      recent: dashboard.contentPerformance.recentContent,
      calendar: dashboard.contentPerformance.contentCalendar,
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: { contentPerformance },
      message: 'Content performance retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error getting content performance:', error);
    res.status(error.message === 'Dashboard not found' ? 404 : 500).json({
      success: false,
      error: error.message === 'Dashboard not found' ? 'Dashboard not found' : 'Failed to get content performance',
      details: error.message,
      code: error.message === 'Dashboard not found' ? 'DASHBOARD_NOT_FOUND' : 'CONTENT_PERFORMANCE_ERROR'
    });
  }
});

// === AI INSIGHTS ROUTES ===

/**
 * @route   POST /api/dashboard/:creatorId/insights/generate
 * @desc    Generate AI insights and recommendations
 * @access  Private
 */
router.post('/:creatorId/insights/generate', async (req, res) => {
  try {
    const { creatorId } = req.params;
    
    console.log(`🤖 Generating AI insights for creator ${creatorId}...`);
    const insights = await dashboardService.generateAIInsights(creatorId);

    res.json({
      success: true,
      data: {
        insights: {
          ...insights,
          pricingOptimization: {
            ...insights.pricingOptimization,
            suggestedPrices: Object.fromEntries(insights.pricingOptimization.suggestedPrices)
          }
        }
      },
      message: 'AI insights generated successfully'
    });

  } catch (error) {
    console.error('❌ Error generating AI insights:', error);
    res.status(error.message === 'Dashboard not found' ? 404 : 500).json({
      success: false,
      error: error.message === 'Dashboard not found' ? 'Dashboard not found' : 'Failed to generate AI insights',
      details: error.message,
      code: error.message === 'Dashboard not found' ? 'DASHBOARD_NOT_FOUND' : 'AI_INSIGHTS_ERROR'
    });
  }
});

/**
 * @route   GET /api/dashboard/:creatorId/insights
 * @desc    Get current AI insights and recommendations
 * @access  Private
 */
router.get('/:creatorId/insights', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { category } = req.query;
    
    console.log(`🔍 Getting AI insights for creator ${creatorId}`);
    const dashboard = await dashboardService.getDashboard(creatorId);

    let filteredInsights = dashboard.aiInsights;

    // Filter by category if specified
    if (category) {
      const categoryFilter = category.toUpperCase();
      filteredInsights = {
        ...dashboard.aiInsights,
        recommendations: dashboard.aiInsights.recommendations.filter(rec => 
          rec.type === categoryFilter || rec.priority === categoryFilter
        )
      };
    }

    res.json({
      success: true,
      data: {
        insights: {
          ...filteredInsights,
          pricingOptimization: {
            ...filteredInsights.pricingOptimization,
            suggestedPrices: Object.fromEntries(filteredInsights.pricingOptimization.suggestedPrices)
          }
        }
      },
      message: 'AI insights retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error getting AI insights:', error);
    res.status(error.message === 'Dashboard not found' ? 404 : 500).json({
      success: false,
      error: error.message === 'Dashboard not found' ? 'Dashboard not found' : 'Failed to get AI insights',
      details: error.message,
      code: error.message === 'Dashboard not found' ? 'DASHBOARD_NOT_FOUND' : 'AI_INSIGHTS_RETRIEVAL_ERROR'
    });
  }
});

// === DATA EXPORT ROUTES ===

/**
 * @route   GET /api/dashboard/:creatorId/export
 * @desc    Export dashboard data
 * @access  Private
 * @query   { format: 'JSON' | 'CSV' }
 */
router.get('/:creatorId/export', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { format = 'JSON' } = req.query;
    
    if (!['JSON', 'CSV'].includes(format.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export format. Must be JSON or CSV',
        code: 'INVALID_FORMAT'
      });
    }

    console.log(`📊 Exporting dashboard data for creator ${creatorId} in ${format} format`);
    const exportData = await dashboardService.exportDashboardData(creatorId, format.toUpperCase());

    if (format.toUpperCase() === 'CSV') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="creator-dashboard-${creatorId}-${Date.now()}.csv"`);
      res.send(exportData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="creator-dashboard-${creatorId}-${Date.now()}.json"`);
      res.json({
        success: true,
        data: exportData,
        message: 'Dashboard data exported successfully'
      });
    }

  } catch (error) {
    console.error('❌ Error exporting dashboard data:', error);
    res.status(error.message === 'Dashboard not found' ? 404 : 500).json({
      success: false,
      error: error.message === 'Dashboard not found' ? 'Dashboard not found' : 'Failed to export dashboard data',
      details: error.message,
      code: error.message === 'Dashboard not found' ? 'DASHBOARD_NOT_FOUND' : 'EXPORT_ERROR'
    });
  }
});

// === GROWTH ANALYTICS ROUTES ===

/**
 * @route   GET /api/dashboard/:creatorId/growth/metrics
 * @desc    Get growth metrics and trends
 * @access  Private
 */
router.get('/:creatorId/growth/metrics', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { period = '30_DAYS' } = req.query;
    
    console.log(`📈 Getting growth metrics for creator ${creatorId}`);
    const dashboard = await dashboardService.getDashboard(creatorId);

    const growthMetrics = {
      overview: {
        fanGrowthRate: dashboard.growthMetrics.fanGrowthRate,
        revenueGrowthRate: dashboard.growthMetrics.revenueGrowthRate,
        engagementGrowthRate: dashboard.growthMetrics.engagementGrowthRate,
        retentionRate: dashboard.growthMetrics.retentionRate,
        churnRate: dashboard.growthMetrics.churnRate
      },
      conversionFunnel: dashboard.growthMetrics.conversionFunnel,
      period,
      generatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      data: { growthMetrics },
      message: 'Growth metrics retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error getting growth metrics:', error);
    res.status(error.message === 'Dashboard not found' ? 404 : 500).json({
      success: false,
      error: error.message === 'Dashboard not found' ? 'Dashboard not found' : 'Failed to get growth metrics',
      details: error.message,
      code: error.message === 'Dashboard not found' ? 'DASHBOARD_NOT_FOUND' : 'GROWTH_METRICS_ERROR'
    });
  }
});

// === SYSTEM STATUS ROUTES ===

/**
 * @route   GET /api/dashboard/system/status
 * @desc    Get dashboard system status and health
 * @access  Private
 */
router.get('/system/status', async (req, res) => {
  try {
    console.log('🔍 Getting dashboard system status...');
    const systemStatus = dashboardService.getSystemStatus();

    res.json({
      success: true,
      data: { systemStatus },
      message: 'System status retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error getting system status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      details: error.message,
      code: 'SYSTEM_STATUS_ERROR'
    });
  }
});

// === BATCH OPERATIONS ROUTES ===

/**
 * @route   POST /api/dashboard/batch/update
 * @desc    Batch update multiple analytics data points
 * @access  Private
 * @body    { creatorId, updates: [{ type, data }] }
 */
router.post('/batch/update', async (req, res) => {
  try {
    const { creatorId, updates } = req.body;
    
    if (!creatorId || !updates || !Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: 'Creator ID and updates array are required',
        code: 'MISSING_REQUIRED_DATA'
      });
    }

    console.log(`🔄 Processing batch updates for creator ${creatorId}: ${updates.length} updates`);
    
    const results = [];
    let successful = 0;
    let failed = 0;

    for (const update of updates) {
      try {
        let result;
        
        switch (update.type) {
          case 'REVENUE':
            result = await dashboardService.updateRevenueAnalytics(creatorId, update.data);
            break;
          case 'FAN':
            result = await dashboardService.updateFanAnalytics(creatorId, update.data);
            break;
          case 'CONTENT':
            result = await dashboardService.trackContentPerformance(creatorId, update.data);
            break;
          default:
            throw new Error(`Unknown update type: ${update.type}`);
        }

        results.push({
          type: update.type,
          status: 'SUCCESS',
          result: result ? 'Updated' : 'Processed'
        });
        successful++;
      } catch (error) {
        results.push({
          type: update.type,
          status: 'ERROR',
          error: error.message
        });
        failed++;
      }
    }

    res.json({
      success: true,
      data: {
        batchResults: {
          total: updates.length,
          successful,
          failed,
          results
        },
        processedAt: new Date().toISOString()
      },
      message: `Batch update completed: ${successful}/${updates.length} successful`
    });

  } catch (error) {
    console.error('❌ Error processing batch updates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process batch updates',
      details: error.message,
      code: 'BATCH_UPDATE_ERROR'
    });
  }
});

export default router;