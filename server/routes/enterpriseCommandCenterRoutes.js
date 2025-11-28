// FANZ Enterprise Command Center Dashboard API Routes
// REST endpoints for comprehensive admin dashboard with real-time visibility

import express from 'express';
import EnterpriseCommandCenter from '../services/enterpriseCommandCenter.js';

const router = express.Router();

// Middleware to ensure command center is available
const ensureCommandCenter = (req, res, next) => {
  if (!req.app.commandCenter) {
    return res.status(503).json({
      success: false,
      error: 'Enterprise Command Center not available'
    });
  }
  next();
};

// Middleware to require admin access for sensitive operations
const requireAdmin = (req, res, next) => {
  // In a real system, this would check user roles/permissions
  // For now, we'll assume all authenticated requests are admin-level
  next();
};

// Get dashboard overview with all key metrics
router.get('/dashboard', ensureCommandCenter, async (req, res) => {
  try {
    const commandCenter = req.app.commandCenter;
    const dashboardData = commandCenter.getDashboardData();
    
    res.json({
      success: true,
      dashboard: dashboardData
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard overview'
    });
  }
});

// Get system metrics summary
router.get('/metrics', ensureCommandCenter, async (req, res) => {
  try {
    const commandCenter = req.app.commandCenter;
    const metrics = commandCenter.getMetricsSummary();
    
    res.json({
      success: true,
      metrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

// Get specific metric with historical data
router.get('/metrics/:metricKey', ensureCommandCenter, async (req, res) => {
  try {
    const { metricKey } = req.params;
    const { timeRange = '24h' } = req.query;
    
    const commandCenter = req.app.commandCenter;
    const history = commandCenter.getMetricHistory(metricKey, timeRange);
    const metrics = commandCenter.getMetricsSummary();
    
    const currentMetric = metrics[metricKey];
    if (!currentMetric) {
      return res.status(404).json({
        success: false,
        error: `Metric '${metricKey}' not found`
      });
    }

    res.json({
      success: true,
      metric: {
        key: metricKey,
        current: currentMetric,
        history,
        timeRange
      }
    });
  } catch (error) {
    console.error('Get metric history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metric history'
    });
  }
});

// Get services status and health
router.get('/services', ensureCommandCenter, async (req, res) => {
  try {
    const commandCenter = req.app.commandCenter;
    const services = commandCenter.getServicesSummary();
    
    res.json({
      success: true,
      services
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get services status'
    });
  }
});

// Get performance metrics and charts
router.get('/performance', ensureCommandCenter, async (req, res) => {
  try {
    const commandCenter = req.app.commandCenter;
    const performance = commandCenter.getPerformanceSummary();
    
    res.json({
      success: true,
      performance: performance || {
        message: 'No performance data available yet',
        current: null,
        averages: null,
        history: []
      }
    });
  } catch (error) {
    console.error('Get performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance data'
    });
  }
});

// Get alerts with filtering and pagination
router.get('/alerts', ensureCommandCenter, async (req, res) => {
  try {
    const { severity, status = 'active', limit = 50, offset = 0 } = req.query;
    
    const commandCenter = req.app.commandCenter;
    let alerts = commandCenter.getActiveAlerts();
    
    // Include all alerts if status is 'all'
    if (status === 'all') {
      alerts = commandCenter.alertHistory;
    } else if (status === 'acknowledged') {
      alerts = commandCenter.alertHistory.filter(alert => alert.acknowledged);
    }
    
    // Filter by severity if specified
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    // Apply pagination
    const total = alerts.length;
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedAlerts = alerts.slice(startIndex, endIndex);
    
    // Add age to each alert
    const alertsWithAge = paginatedAlerts.map(alert => ({
      ...alert,
      age: Date.now() - new Date(alert.timestamp).getTime()
    }));

    res.json({
      success: true,
      alerts: alertsWithAge,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: endIndex < total
      },
      summary: {
        total: commandCenter.alertHistory.length,
        active: commandCenter.alertHistory.filter(a => !a.acknowledged).length,
        acknowledged: commandCenter.alertHistory.filter(a => a.acknowledged).length,
        bySeverity: {
          critical: commandCenter.alertHistory.filter(a => a.severity === 'critical' && !a.acknowledged).length,
          high: commandCenter.alertHistory.filter(a => a.severity === 'high' && !a.acknowledged).length,
          medium: commandCenter.alertHistory.filter(a => a.severity === 'medium' && !a.acknowledged).length,
          low: commandCenter.alertHistory.filter(a => a.severity === 'low' && !a.acknowledged).length
        }
      }
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts'
    });
  }
});

// Acknowledge an alert
router.post('/alerts/:alertId/acknowledge', ensureCommandCenter, requireAdmin, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy, notes = '' } = req.body;

    if (!acknowledgedBy) {
      return res.status(400).json({
        success: false,
        error: 'acknowledgedBy is required'
      });
    }

    const commandCenter = req.app.commandCenter;
    const success = commandCenter.acknowledgeAlert(alertId, acknowledgedBy, notes);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or already acknowledged'
      });
    }

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      alertId,
      acknowledgedBy,
      acknowledgedAt: new Date()
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

// Get workflow status from orchestration engine
router.get('/workflows', ensureCommandCenter, async (req, res) => {
  try {
    const commandCenter = req.app.commandCenter;
    
    if (!commandCenter.orchestrationEngine) {
      return res.json({
        success: true,
        workflows: {
          message: 'Orchestration engine not available',
          active: 0,
          completed: 0,
          failed: 0,
          total: 0
        }
      });
    }

    const metrics = commandCenter.getMetricsSummary();
    const workflowMetrics = {
      active: metrics['workflows.active']?.value || 0,
      completed: metrics['workflows.completed']?.value || 0,
      failed: metrics['workflows.failed']?.value || 0,
      total: metrics['workflows.total']?.value || 0
    };

    res.json({
      success: true,
      workflows: workflowMetrics
    });
  } catch (error) {
    console.error('Get workflows error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow status'
    });
  }
});

// Get data pipeline status
router.get('/pipeline', ensureCommandCenter, async (req, res) => {
  try {
    const commandCenter = req.app.commandCenter;
    
    if (!commandCenter.pipelineIntegration) {
      return res.json({
        success: true,
        pipeline: {
          message: 'Pipeline integration not available',
          streams: 0,
          events: { total: 0, processed: 0, failed: 0 }
        }
      });
    }

    const metrics = commandCenter.getMetricsSummary();
    const pipelineMetrics = {
      streams: metrics['pipeline.streams']?.value || 0,
      events: {
        total: metrics['pipeline.events.total']?.value || 0,
        processed: metrics['pipeline.events.processed']?.value || 0,
        failed: metrics['pipeline.events.failed']?.value || 0
      }
    };

    res.json({
      success: true,
      pipeline: pipelineMetrics
    });
  } catch (error) {
    console.error('Get pipeline status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pipeline status'
    });
  }
});

// Get business metrics dashboard
router.get('/business', ensureCommandCenter, async (req, res) => {
  try {
    const commandCenter = req.app.commandCenter;
    const metrics = commandCenter.getMetricsSummary();
    
    const businessMetrics = {
      revenue: {
        total: metrics['business.revenue.total']?.value || 0,
        last24h: metrics['business.revenue.24h']?.value || 0,
        trend: metrics['business.revenue.24h']?.trend || 'stable'
      },
      users: {
        total: metrics['business.users.total']?.value || 0,
        active: metrics['business.users.active']?.value || 0,
        trend: metrics['business.users.active']?.trend || 'stable'
      },
      content: {
        uploads24h: metrics['business.content.uploads.24h']?.value || 0,
        trend: metrics['business.content.uploads.24h']?.trend || 'stable'
      },
      streams: {
        active: metrics['business.streams.active']?.value || 0,
        trend: metrics['business.streams.active']?.trend || 'stable'
      }
    };

    res.json({
      success: true,
      business: businessMetrics
    });
  } catch (error) {
    console.error('Get business metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get business metrics'
    });
  }
});

// Get system health status
router.get('/health', async (req, res) => {
  try {
    const commandCenter = req.app.commandCenter;
    
    if (!commandCenter) {
      return res.status(503).json({
        success: false,
        status: 'unavailable',
        message: 'Enterprise Command Center not initialized'
      });
    }

    if (!commandCenter.initialized) {
      return res.status(503).json({
        success: false,
        status: 'not_ready',
        message: 'Enterprise Command Center not ready'
      });
    }

    const metrics = commandCenter.getMetricsSummary();
    const services = commandCenter.getServicesSummary();
    const activeAlerts = commandCenter.getActiveAlerts();
    
    // Determine overall health status
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
    const errorRate = metrics['performance.error_rate']?.value || 0;
    const unhealthyServices = services.unhealthy;
    
    let status = 'healthy';
    if (criticalAlerts > 0) {
      status = 'critical';
    } else if (unhealthyServices > 0 || errorRate > 0.05) {
      status = 'degraded';
    }

    res.json({
      success: true,
      status,
      health: {
        initialized: commandCenter.initialized,
        uptime: Date.now() - commandCenter.startTime,
        services: {
          total: services.total,
          healthy: services.healthy,
          unhealthy: services.unhealthy
        },
        alerts: {
          active: activeAlerts.length,
          critical: criticalAlerts,
          high: activeAlerts.filter(a => a.severity === 'high').length
        },
        performance: {
          errorRate: Math.round(errorRate * 10000) / 10000,
          responseTime: metrics['performance.response_time.avg']?.value || 0,
          cpu: metrics['system.cpu']?.value || 0,
          memory: metrics['system.memory']?.value || 0
        },
        realTimeConnections: commandCenter.realTimeConnections.size
      },
      checks: {
        command_center_ready: commandCenter.initialized,
        orchestration_connected: !!commandCenter.orchestrationEngine,
        pipeline_connected: !!commandCenter.pipelineIntegration,
        low_error_rate: errorRate < 0.05,
        services_healthy: unhealthyServices === 0,
        no_critical_alerts: criticalAlerts === 0
      }
    });
  } catch (error) {
    console.error('Command Center health check error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      error: 'Health check failed',
      details: error.message
    });
  }
});

// Initialize command center
router.post('/initialize', requireAdmin, async (req, res) => {
  try {
    if (!req.app.commandCenter) {
      const orchestrationEngine = req.app.orchestrationEngine;
      const pipelineIntegration = req.app.pipelineIntegration;
      
      req.app.commandCenter = new EnterpriseCommandCenter(
        orchestrationEngine,
        pipelineIntegration
      );
    }

    if (req.app.commandCenter.initialized) {
      return res.json({
        success: true,
        message: 'Enterprise Command Center already initialized',
        status: 'active'
      });
    }

    await req.app.commandCenter.initialize();
    
    res.json({
      success: true,
      message: 'Enterprise Command Center initialized successfully',
      status: 'active',
      features: {
        realTimeMonitoring: true,
        alertManagement: true,
        performanceTracking: true,
        serviceDiscovery: true,
        workflowMonitoring: !!req.app.orchestrationEngine,
        pipelineIntegration: !!req.app.pipelineIntegration
      }
    });
  } catch (error) {
    console.error('Command Center initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize Enterprise Command Center',
      details: error.message
    });
  }
});

// Get command center configuration
router.get('/config', ensureCommandCenter, requireAdmin, async (req, res) => {
  try {
    const commandCenter = req.app.commandCenter;
    
    res.json({
      success: true,
      configuration: {
        updateInterval: commandCenter.config.updateInterval,
        historyRetention: commandCenter.config.historyRetention,
        alertRetention: commandCenter.config.alertRetention,
        performanceWindowSize: commandCenter.config.performanceWindowSize,
        criticalThresholds: commandCenter.config.criticalThresholds
      },
      features: {
        orchestrationEngine: !!commandCenter.orchestrationEngine,
        pipelineIntegration: !!commandCenter.pipelineIntegration,
        realTimeUpdates: !!commandCenter.updateTimer,
        alertProcessing: true
      },
      statistics: {
        totalMetrics: commandCenter.dashboardMetrics.size,
        totalServices: commandCenter.serviceStatus.size,
        totalAlerts: commandCenter.alertHistory.length,
        performanceDataPoints: commandCenter.performanceHistory.length,
        realTimeConnections: commandCenter.realTimeConnections.size
      }
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration'
    });
  }
});

// Update command center configuration
router.put('/config', ensureCommandCenter, requireAdmin, async (req, res) => {
  try {
    const { criticalThresholds, updateInterval } = req.body;
    const commandCenter = req.app.commandCenter;
    
    let updated = false;
    
    if (criticalThresholds) {
      Object.assign(commandCenter.config.criticalThresholds, criticalThresholds);
      updated = true;
    }
    
    if (updateInterval && updateInterval >= 1000 && updateInterval <= 60000) {
      commandCenter.config.updateInterval = updateInterval;
      
      // Restart timer with new interval
      if (commandCenter.updateTimer) {
        clearInterval(commandCenter.updateTimer);
        commandCenter.startRealTimeUpdates();
      }
      updated = true;
    }
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        error: 'No valid configuration updates provided'
      });
    }

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      configuration: {
        updateInterval: commandCenter.config.updateInterval,
        criticalThresholds: commandCenter.config.criticalThresholds
      }
    });
  } catch (error) {
    console.error('Update config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

// Get real-time connection information
router.get('/connections', ensureCommandCenter, async (req, res) => {
  try {
    const commandCenter = req.app.commandCenter;
    
    res.json({
      success: true,
      connections: {
        total: commandCenter.realTimeConnections.size,
        active: Array.from(commandCenter.realTimeConnections),
        lastBroadcast: new Date(),
        updateInterval: commandCenter.config.updateInterval
      }
    });
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get connection information'
    });
  }
});

// Export historical data (for reporting/analysis)
router.get('/export', ensureCommandCenter, requireAdmin, async (req, res) => {
  try {
    const { format = 'json', timeRange = '24h', includeAlerts = true, includeMetrics = true, includePerformance = true } = req.query;
    
    const commandCenter = req.app.commandCenter;
    const exportData = {
      generatedAt: new Date(),
      timeRange,
      format
    };

    if (includeMetrics === 'true') {
      exportData.metrics = commandCenter.getMetricsSummary();
    }

    if (includePerformance === 'true') {
      exportData.performance = commandCenter.getPerformanceSummary();
    }

    if (includeAlerts === 'true') {
      exportData.alerts = commandCenter.alertHistory;
    }

    exportData.services = commandCenter.getServicesSummary();

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      let csvContent = 'timestamp,metric,value,trend\n';
      
      Object.entries(exportData.metrics || {}).forEach(([key, metric]) => {
        csvContent += `${new Date().toISOString()},${key},${metric.value},${metric.trend}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="fanz-dashboard-export-${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="fanz-dashboard-export-${Date.now()}.json"`);
      res.json(exportData);
    }
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
});

export default router;