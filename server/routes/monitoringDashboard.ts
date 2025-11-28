// Real-Time Monitoring API Routes
// Dashboard API for comprehensive monitoring, analytics, and alerting

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  RealTimeMonitoringService,
  MonitoringConfigSchema,
  MonitoringConfig,
  AlertThresholds
} from '../services/realTimeMonitoringService.js';
import { isAuthenticated, requireAdmin } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

const router = Router();

// Initialize monitoring service with production configuration
const defaultMonitoringConfig: MonitoringConfig = {
  enabled: false,
  realTimeEnabled: false,
  retentionPeriod: 30, // 30 days
  alertThresholds: {
    cpu: 80,
    memory: 80,
    disk: 90,
    responseTime: 2000, // 2 seconds
    errorRate: 5, // 5%
    throughput: 100,
    availability: 99 // 99%
  },
  platforms: ['boyfanz', 'girlfanz', 'pupfanz', 'transfanz', 'taboofanz'],
  metricsCollectionInterval: 30, // 30 seconds
  healthCheckInterval: 60 // 60 seconds
};

const monitoringService = new RealTimeMonitoringService(defaultMonitoringConfig);

// Start monitoring service - DISABLED to prevent fake alerts spam
// monitoringService.start();

// Apply admin authentication to all monitoring routes
router.use(requireAdmin);

// Validation schemas
const AlertFiltersSchema = z.object({
  platformId: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  type: z.enum(['performance', 'security', 'infrastructure', 'business', 'compliance']).optional(),
  acknowledged: z.boolean().optional(),
  resolved: z.boolean().optional()
});

const AlertActionSchema = z.object({
  alertId: z.string(),
  action: z.enum(['acknowledge', 'resolve']),
  assignedTo: z.string().optional(),
  notes: z.string().optional()
});

const MetricsQuerySchema = z.object({
  platformId: z.string().optional(),
  timeRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }).optional(),
  metrics: z.array(z.enum(['cpu', 'memory', 'disk', 'network', 'responseTime', 'throughput', 'errorRate', 'activeUsers', 'revenue'])).optional()
});

const ConfigUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  realTimeEnabled: z.boolean().optional(),
  retentionPeriod: z.number().min(1).max(365).optional(),
  alertThresholds: z.object({
    cpu: z.number().min(0).max(100).optional(),
    memory: z.number().min(0).max(100).optional(),
    disk: z.number().min(0).max(100).optional(),
    responseTime: z.number().min(0).optional(),
    errorRate: z.number().min(0).max(100).optional(),
    throughput: z.number().min(0).optional(),
    availability: z.number().min(0).max(100).optional()
  }).optional(),
  platforms: z.array(z.string()).optional(),
  metricsCollectionInterval: z.number().min(5).max(300).optional(),
  healthCheckInterval: z.number().min(5).max(300).optional()
});

// GET /api/monitoring/dashboard
// Main monitoring dashboard data
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const dashboardData = monitoringService.getDashboardData();
    
    res.json({
      ...dashboardData,
      config: {
        enabled: defaultMonitoringConfig.enabled,
        realTimeEnabled: defaultMonitoringConfig.realTimeEnabled,
        platforms: defaultMonitoringConfig.platforms,
        alertThresholds: defaultMonitoringConfig.alertThresholds
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({
      error: 'Failed to load dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/monitoring/metrics
// Get system metrics with optional filtering
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const query = MetricsQuerySchema.parse(req.query);
    
    let timeRange;
    if (query.timeRange) {
      timeRange = {
        start: new Date(query.timeRange.start),
        end: new Date(query.timeRange.end)
      };
    }
    
    const metrics = monitoringService.getMetrics(query.platformId, timeRange);
    
    res.json({
      metrics,
      platformId: query.platformId || 'all',
      timeRange: timeRange || { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() },
      requestedMetrics: query.metrics || ['all'],
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Metrics query error:', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/monitoring/analytics
// Get analytics data with optional filtering
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const query = MetricsQuerySchema.parse(req.query);
    
    let timeRange;
    if (query.timeRange) {
      timeRange = {
        start: new Date(query.timeRange.start),
        end: new Date(query.timeRange.end)
      };
    }
    
    const analytics = monitoringService.getAnalytics(query.platformId, timeRange);
    
    res.json({
      analytics,
      platformId: query.platformId || 'all',
      timeRange: timeRange || { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Analytics query error:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/monitoring/alerts
// Get alerts with optional filtering
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const filters = AlertFiltersSchema.parse(req.query);
    const alerts = monitoringService.alertManager.getAlerts(filters);
    const summary = monitoringService.alertManager.getAlertSummary();
    
    res.json({
      alerts,
      summary,
      filters,
      total: alerts.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Alerts query error:', error);
    res.status(500).json({
      error: 'Failed to get alerts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/monitoring/alerts/action
// Perform action on alert (acknowledge, resolve)
router.post('/alerts/action', validateRequest(AlertActionSchema), async (req: Request, res: Response) => {
  try {
    const { alertId, action, assignedTo, notes } = req.body;
    const userId = (req as any).user?.id || 'unknown';
    
    let success = false;
    
    switch (action) {
      case 'acknowledge':
        success = monitoringService.alertManager.acknowledgeAlert(alertId, assignedTo || userId);
        break;
      case 'resolve':
        success = monitoringService.alertManager.resolveAlert(alertId, assignedTo || userId);
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    if (success) {
      res.json({
        success: true,
        message: `Alert ${action}d successfully`,
        alertId,
        action,
        performedBy: userId,
        timestamp: new Date()
      });
    } else {
      res.status(404).json({ error: 'Alert not found' });
    }
  } catch (error) {
    console.error('Alert action error:', error);
    res.status(500).json({
      error: 'Failed to perform alert action',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/monitoring/platforms
// Get platform-specific monitoring data
router.get('/platforms', async (req: Request, res: Response) => {
  try {
    const dashboardData = monitoringService.getDashboardData();
    
    const platformData = dashboardData.platforms.map(platform => ({
      ...platform,
      alertCount: dashboardData.alerts.recent.filter(a => a.platformId === platform.platformId).length,
      lastAlert: dashboardData.alerts.recent.find(a => a.platformId === platform.platformId)?.timestamp
    }));
    
    res.json({
      platforms: platformData,
      total: platformData.length,
      summary: {
        healthy: platformData.filter(p => p.health === 'healthy').length,
        warning: platformData.filter(p => p.health === 'warning').length,
        critical: platformData.filter(p => p.health === 'critical').length,
        unknown: platformData.filter(p => p.health === 'unknown').length
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Platforms data error:', error);
    res.status(500).json({
      error: 'Failed to get platforms data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/monitoring/platforms/:platformId
// Get detailed monitoring data for specific platform
router.get('/platforms/:platformId', async (req: Request, res: Response) => {
  try {
    const { platformId } = req.params;
    const dashboardData = monitoringService.getDashboardData();
    
    const platform = dashboardData.platforms.find(p => p.platformId === platformId);
    
    if (!platform) {
      return res.status(404).json({ error: 'Platform not found' });
    }
    
    // Get platform-specific alerts
    const platformAlerts = dashboardData.alerts.recent.filter(a => a.platformId === platformId);
    
    // Get analytics for the platform
    const analytics = monitoringService.getAnalytics(platformId);
    
    // Generate report
    const report = monitoringService.generateReport(platformId);
    
    res.json({
      platform,
      alerts: {
        recent: platformAlerts,
        total: platformAlerts.length
      },
      analytics: analytics.slice(0, 10), // Last 10 analytics points
      report,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Platform details error:', error);
    res.status(500).json({
      error: 'Failed to get platform details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/monitoring/reports
// Generate monitoring reports
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const { platformId, type } = req.query;
    
    let report;
    if (platformId) {
      report = monitoringService.generateReport(platformId as string);
    } else {
      // Generate overall report
      const dashboardData = monitoringService.getDashboardData();
      report = {
        overview: dashboardData.overview,
        platforms: dashboardData.platforms.map(p => ({
          platformId: p.platformId,
          name: p.platformName,
          health: p.health,
          uptime: p.uptime,
          version: p.version
        })),
        alerts: dashboardData.alerts.summary,
        recommendations: [
          'Monitor critical platforms closely',
          'Address warning-level platforms',
          'Review alert thresholds regularly'
        ]
      };
    }
    
    res.json({
      report,
      generatedFor: platformId || 'all_platforms',
      reportType: type || 'comprehensive',
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/monitoring/health
// Get monitoring service health
router.get('/health', async (req: Request, res: Response) => {
  try {
    const dashboardData = monitoringService.getDashboardData();
    
    const health = {
      status: 'healthy',
      monitoring: {
        enabled: defaultMonitoringConfig.enabled,
        realTimeEnabled: defaultMonitoringConfig.realTimeEnabled,
        platformsMonitored: defaultMonitoringConfig.platforms.length,
        metricsCollectionInterval: defaultMonitoringConfig.metricsCollectionInterval
      },
      metrics: {
        totalPlatforms: dashboardData.platforms.length,
        healthyPlatforms: dashboardData.platforms.filter(p => p.health === 'healthy').length,
        activeAlerts: dashboardData.alerts.summary.active,
        connectedClients: dashboardData.overview.connectedClients
      },
      lastUpdated: dashboardData.overview.lastUpdated
    };
    
    res.json(health);
  } catch (error) {
    console.error('Monitoring health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

// Admin-only routes
const adminRoutes = Router();
adminRoutes.use(requireAdmin);

// PUT /api/monitoring/config
// Update monitoring configuration (admin only)
adminRoutes.put('/config', validateRequest(ConfigUpdateSchema), async (req: Request, res: Response) => {
  try {
    const configUpdate = req.body;
    
    // Update monitoring service configuration
    monitoringService.updateConfig(configUpdate);
    
    res.json({
      success: true,
      message: 'Monitoring configuration updated',
      updatedConfig: configUpdate,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({
      error: 'Failed to update configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/monitoring/control/start
// Start monitoring service (admin only)
adminRoutes.post('/control/start', async (req: Request, res: Response) => {
  try {
    monitoringService.start();
    
    res.json({
      success: true,
      message: 'Monitoring service started',
      status: 'running',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Start monitoring error:', error);
    res.status(500).json({
      error: 'Failed to start monitoring service',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/monitoring/control/stop
// Stop monitoring service (admin only)
adminRoutes.post('/control/stop', async (req: Request, res: Response) => {
  try {
    monitoringService.stop();
    
    res.json({
      success: true,
      message: 'Monitoring service stopped',
      status: 'stopped',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Stop monitoring error:', error);
    res.status(500).json({
      error: 'Failed to stop monitoring service',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/monitoring/system/stats
// Get system-level monitoring statistics (admin only)
adminRoutes.get('/system/stats', async (req: Request, res: Response) => {
  try {
    const dashboardData = monitoringService.getDashboardData();
    
    const stats = {
      monitoring: {
        serviceDuration: 'N/A', // Would track actual uptime
        metricsCollected: 'N/A', // Would track total metrics
        alertsGenerated: dashboardData.alerts.summary.total,
        platformsOnline: dashboardData.platforms.filter(p => p.health !== 'unknown').length
      },
      performance: {
        avgResponseTime: dashboardData.platforms.reduce((sum, p) => {
          const latestResponse = p.metrics.responseTime[p.metrics.responseTime.length - 1];
          return sum + (latestResponse?.value || 0);
        }, 0) / dashboardData.platforms.length,
        totalActiveUsers: dashboardData.platforms.reduce((sum, p) => {
          const latestUsers = p.metrics.activeUsers[p.metrics.activeUsers.length - 1];
          return sum + (latestUsers?.value || 0);
        }, 0),
        totalRevenue: dashboardData.platforms.reduce((sum, p) => {
          const latestRevenue = p.metrics.revenue[p.metrics.revenue.length - 1];
          return sum + (latestRevenue?.value || 0);
        }, 0)
      },
      resources: {
        avgCpuUsage: dashboardData.platforms.reduce((sum, p) => {
          const latestCpu = p.metrics.cpu[p.metrics.cpu.length - 1];
          return sum + (latestCpu?.value || 0);
        }, 0) / dashboardData.platforms.length,
        avgMemoryUsage: dashboardData.platforms.reduce((sum, p) => {
          const latestMemory = p.metrics.memory[p.metrics.memory.length - 1];
          return sum + (latestMemory?.value || 0);
        }, 0) / dashboardData.platforms.length
      },
      timestamp: new Date()
    };
    
    res.json(stats);
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({
      error: 'Failed to get system stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/monitoring/export
// Export monitoring data (admin only)
adminRoutes.get('/export', async (req: Request, res: Response) => {
  try {
    const { format, platformId, timeRange } = req.query;
    
    let exportTimeRange;
    if (timeRange === 'string') {
      const ranges = (timeRange as string).split(',');
      exportTimeRange = {
        start: new Date(ranges[0]),
        end: new Date(ranges[1])
      };
    }
    
    const dashboardData = monitoringService.getDashboardData();
    const analytics = monitoringService.getAnalytics(platformId as string, exportTimeRange);
    
    const exportData = {
      metadata: {
        exportedAt: new Date(),
        exportedBy: (req as any).user?.id,
        format: format || 'json',
        platformId: platformId || 'all',
        timeRange: exportTimeRange || 'all'
      },
      dashboard: dashboardData,
      analytics: analytics,
      reports: monitoringService.generateReport(platformId as string)
    };
    
    // Set appropriate headers based on format
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=monitoring-export.csv');
      
      // Convert to CSV (simplified)
      const csv = convertToCSV(exportData);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=monitoring-export.json');
      res.json(exportData);
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      error: 'Failed to export data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mount admin routes
router.use('/admin', adminRoutes);

// Utility functions
function convertToCSV(data: any): string {
  // Simplified CSV conversion - in production, use proper CSV library
  const lines = ['timestamp,platform,metric,value'];
  
  if (data.dashboard && data.dashboard.platforms) {
    data.dashboard.platforms.forEach((platform: any) => {
      Object.entries(platform.metrics).forEach(([metricName, metricPoints]: [string, any]) => {
        if (Array.isArray(metricPoints)) {
          metricPoints.forEach((point: any) => {
            lines.push(`${point.timestamp},${platform.platformId},${metricName},${point.value}`);
          });
        }
      });
    });
  }
  
  return lines.join('\n');
}

// WebSocket support for real-time updates would be implemented here
// This would connect to the monitoring service's WebSocket manager

export default router;