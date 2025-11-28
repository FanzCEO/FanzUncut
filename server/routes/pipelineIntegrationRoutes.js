// FANZ Pipeline Integration API Routes
// REST endpoints for managing data pipeline integration and cross-service connections

import express from 'express';
import PipelineIntegration from '../pipeline/pipelineIntegration.js';

const router = express.Router();

// Middleware to ensure pipeline integration is available
const ensurePipelineIntegration = (req, res, next) => {
  if (!req.app.pipelineIntegration) {
    return res.status(503).json({
      success: false,
      error: 'Pipeline integration not available'
    });
  }
  next();
};

// Initialize or get status of pipeline integration
router.get('/status', ensurePipelineIntegration, async (req, res) => {
  try {
    const integration = req.app.pipelineIntegration;
    const metrics = integration.getMetrics();
    
    res.json({
      success: true,
      status: {
        initialized: integration.initialized,
        uptime: Date.now() - req.app.startTime,
        orchestrationConnected: !!integration.orchestrationEngine,
        serviceConnections: integration.serviceConnections.size
      },
      metrics
    });
  } catch (error) {
    console.error('Pipeline integration status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get integration status'
    });
  }
});

// Initialize pipeline integration
router.post('/initialize', async (req, res) => {
  try {
    if (!req.app.pipelineIntegration) {
      // Create new pipeline integration instance
      const orchestrationEngine = req.app.orchestrationEngine;
      req.app.pipelineIntegration = new PipelineIntegration(orchestrationEngine);
    }

    if (req.app.pipelineIntegration.initialized) {
      return res.json({
        success: true,
        message: 'Pipeline integration already initialized',
        status: 'active'
      });
    }

    const dataPipeline = await req.app.pipelineIntegration.initialize();
    
    res.json({
      success: true,
      message: 'Pipeline integration initialized successfully',
      status: 'active',
      streams: dataPipeline.registeredStreams.size,
      aggregationRules: dataPipeline.aggregationRules.size,
      realTimeStreams: Array.from(dataPipeline.registeredStreams.values())
        .filter(stream => stream.realTime).length
    });
  } catch (error) {
    console.error('Pipeline integration initialization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize pipeline integration',
      details: error.message
    });
  }
});

// Get registered data streams
router.get('/streams', ensurePipelineIntegration, async (req, res) => {
  try {
    const integration = req.app.pipelineIntegration;
    const dataPipeline = integration.getDataPipeline();
    
    const streams = Array.from(dataPipeline.registeredStreams.entries()).map(([name, config]) => ({
      name,
      source: config.source,
      type: config.type,
      realTime: config.realTime,
      schema: config.schema,
      aggregationRules: config.aggregationRules?.length || 0,
      lastUpdate: config.lastUpdate || null,
      totalEvents: dataPipeline.streamMetrics.get(name)?.totalEvents || 0
    }));

    res.json({
      success: true,
      streams: streams.sort((a, b) => a.name.localeCompare(b.name)),
      summary: {
        total: streams.length,
        realTime: streams.filter(s => s.realTime).length,
        byType: streams.reduce((acc, stream) => {
          acc[stream.type] = (acc[stream.type] || 0) + 1;
          return acc;
        }, {}),
        bySource: streams.reduce((acc, stream) => {
          acc[stream.source] = (acc[stream.source] || 0) + 1;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get streams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get streams'
    });
  }
});

// Get stream metrics and health
router.get('/streams/:streamName/metrics', ensurePipelineIntegration, async (req, res) => {
  try {
    const { streamName } = req.params;
    const integration = req.app.pipelineIntegration;
    const dataPipeline = integration.getDataPipeline();
    
    if (!dataPipeline.registeredStreams.has(streamName)) {
      return res.status(404).json({
        success: false,
        error: `Stream '${streamName}' not found`
      });
    }

    const streamConfig = dataPipeline.registeredStreams.get(streamName);
    const metrics = dataPipeline.streamMetrics.get(streamName) || {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      lastProcessed: null,
      averageProcessingTime: 0
    };

    res.json({
      success: true,
      stream: {
        name: streamName,
        ...streamConfig,
        metrics: {
          ...metrics,
          errorRate: metrics.totalEvents > 0 
            ? metrics.failedEvents / metrics.totalEvents 
            : 0,
          successRate: metrics.totalEvents > 0 
            ? metrics.successfulEvents / metrics.totalEvents 
            : 0
        }
      }
    });
  } catch (error) {
    console.error('Get stream metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stream metrics'
    });
  }
});

// Ingest data into a stream (for testing or manual ingestion)
router.post('/streams/:streamName/ingest', ensurePipelineIntegration, async (req, res) => {
  try {
    const { streamName } = req.params;
    const { data, metadata } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required'
      });
    }

    const integration = req.app.pipelineIntegration;
    const eventId = await integration.ingestData(streamName, data, {
      ...metadata,
      source: 'api',
      requestId: req.id
    });

    if (!eventId) {
      return res.status(500).json({
        success: false,
        error: 'Failed to ingest data'
      });
    }

    res.json({
      success: true,
      eventId,
      stream: streamName,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Data ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ingest data',
      details: error.message
    });
  }
});

// Get real-time analytics for a specific metric or stream
router.get('/analytics/:streamName', ensurePipelineIntegration, async (req, res) => {
  try {
    const { streamName } = req.params;
    const { window, aggregation } = req.query;
    
    const integration = req.app.pipelineIntegration;
    const dataPipeline = integration.getDataPipeline();
    
    const analytics = await dataPipeline.getAnalytics(streamName, {
      window: window ? parseInt(window) : 3600000, // Default 1 hour
      aggregationType: aggregation || 'sum'
    });

    res.json({
      success: true,
      stream: streamName,
      analytics,
      window: window || 3600000,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics'
    });
  }
});

// Get all metrics across streams
router.get('/metrics', ensurePipelineIntegration, async (req, res) => {
  try {
    const integration = req.app.pipelineIntegration;
    const allMetrics = integration.getMetrics();

    const dataPipeline = integration.getDataPipeline();
    const streamSummary = Array.from(dataPipeline.registeredStreams.keys())
      .reduce((acc, streamName) => {
        const metrics = dataPipeline.streamMetrics.get(streamName);
        if (metrics) {
          acc[streamName] = {
            totalEvents: metrics.totalEvents,
            errorRate: metrics.totalEvents > 0 
              ? metrics.failedEvents / metrics.totalEvents 
              : 0,
            lastProcessed: metrics.lastProcessed
          };
        }
        return acc;
      }, {});

    res.json({
      success: true,
      metrics: {
        ...allMetrics,
        streamSummary,
        aggregated: {
          totalEvents: Object.values(streamSummary)
            .reduce((sum, stream) => sum + stream.totalEvents, 0),
          averageErrorRate: Object.values(streamSummary)
            .reduce((sum, stream) => sum + stream.errorRate, 0) / Object.keys(streamSummary).length || 0
        }
      },
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

// Get active alerts
router.get('/alerts', ensurePipelineIntegration, async (req, res) => {
  try {
    const integration = req.app.pipelineIntegration;
    const dataPipeline = integration.getDataPipeline();
    
    const alerts = dataPipeline.getActiveAlerts();
    
    res.json({
      success: true,
      alerts: alerts.map(alert => ({
        ...alert,
        age: Date.now() - new Date(alert.timestamp).getTime()
      })).sort((a, b) => {
        const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      }),
      summary: {
        total: alerts.length,
        bySeverity: alerts.reduce((acc, alert) => {
          acc[alert.severity] = (acc[alert.severity] || 0) + 1;
          return acc;
        }, {}),
        recent: alerts.filter(alert => 
          Date.now() - new Date(alert.timestamp).getTime() < 300000 // Last 5 minutes
        ).length
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
router.post('/alerts/:alertId/acknowledge', ensurePipelineIntegration, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledged_by, notes } = req.body;

    const integration = req.app.pipelineIntegration;
    const dataPipeline = integration.getDataPipeline();
    
    const success = await dataPipeline.acknowledgeAlert(alertId, {
      acknowledged_by: acknowledged_by || 'api_user',
      notes: notes || '',
      timestamp: new Date()
    });

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Alert not found or already acknowledged'
      });
    }

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      alertId
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

// Get subscription information
router.get('/subscriptions', ensurePipelineIntegration, async (req, res) => {
  try {
    const integration = req.app.pipelineIntegration;
    const dataPipeline = integration.getDataPipeline();
    
    const subscriptions = Array.from(dataPipeline.subscriptions.entries()).map(([id, sub]) => ({
      id,
      callback: sub.callback?.name || 'anonymous',
      streamFilters: sub.streamFilters,
      eventTypes: sub.eventTypes,
      active: sub.active,
      created: sub.created,
      lastTriggered: sub.lastTriggered,
      triggerCount: sub.triggerCount || 0
    }));

    res.json({
      success: true,
      subscriptions,
      summary: {
        total: subscriptions.length,
        active: subscriptions.filter(sub => sub.active).length,
        byStream: subscriptions.reduce((acc, sub) => {
          sub.streamFilters.forEach(stream => {
            acc[stream] = (acc[stream] || 0) + 1;
          });
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscriptions'
    });
  }
});

// Health check for pipeline integration
router.get('/health', async (req, res) => {
  try {
    const integration = req.app.pipelineIntegration;
    
    if (!integration) {
      return res.status(503).json({
        success: false,
        status: 'unavailable',
        message: 'Pipeline integration not initialized'
      });
    }

    if (!integration.initialized) {
      return res.status(503).json({
        success: false,
        status: 'not_ready',
        message: 'Pipeline integration not ready'
      });
    }

    const dataPipeline = integration.getDataPipeline();
    const metrics = integration.getMetrics();
    
    // Check if pipeline is healthy
    const totalEvents = Object.values(metrics.streams || {})
      .reduce((sum, stream) => sum + (stream.totalEvents || 0), 0);
    
    const errorRate = totalEvents > 0 
      ? Object.values(metrics.streams || {})
          .reduce((sum, stream) => sum + (stream.failedEvents || 0), 0) / totalEvents
      : 0;

    const isHealthy = errorRate < 0.05; // Less than 5% error rate

    res.json({
      success: true,
      status: isHealthy ? 'healthy' : 'degraded',
      health: {
        initialized: integration.initialized,
        orchestrationConnected: !!integration.orchestrationEngine,
        streamsRegistered: dataPipeline.registeredStreams.size,
        totalEvents,
        errorRate: Math.round(errorRate * 10000) / 10000,
        uptime: Date.now() - req.app.startTime,
        memoryUsage: process.memoryUsage(),
        activeAlerts: dataPipeline.getActiveAlerts().length
      },
      checks: {
        pipeline_ready: integration.initialized,
        streams_registered: dataPipeline.registeredStreams.size > 0,
        low_error_rate: errorRate < 0.05,
        memory_ok: process.memoryUsage().heapUsed < 1000 * 1024 * 1024, // Less than 1GB
        recent_activity: totalEvents > 0
      }
    });
  } catch (error) {
    console.error('Pipeline integration health check error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      error: 'Health check failed',
      details: error.message
    });
  }
});

// Trigger manual data processing for a stream
router.post('/streams/:streamName/process', ensurePipelineIntegration, async (req, res) => {
  try {
    const { streamName } = req.params;
    const { force = false } = req.body;

    const integration = req.app.pipelineIntegration;
    const dataPipeline = integration.getDataPipeline();
    
    if (!dataPipeline.registeredStreams.has(streamName)) {
      return res.status(404).json({
        success: false,
        error: `Stream '${streamName}' not found`
      });
    }

    const result = await dataPipeline.processStream(streamName, { force });
    
    res.json({
      success: true,
      stream: streamName,
      processed: result.processed,
      errors: result.errors,
      duration: result.duration,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Manual stream processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process stream',
      details: error.message
    });
  }
});

// Export configuration for debugging
router.get('/config', ensurePipelineIntegration, async (req, res) => {
  try {
    const integration = req.app.pipelineIntegration;
    const dataPipeline = integration.getDataPipeline();
    
    const config = {
      integration: {
        initialized: integration.initialized,
        serviceConnections: integration.serviceConnections.size,
        orchestrationConnected: !!integration.orchestrationEngine
      },
      pipeline: {
        streams: dataPipeline.registeredStreams.size,
        aggregationRules: dataPipeline.aggregationRules.size,
        alertThresholds: dataPipeline.alertThresholds.size,
        subscriptions: dataPipeline.subscriptions.size,
        backgroundProcessing: dataPipeline.backgroundProcessing
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    };

    res.json({
      success: true,
      config,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Get config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get configuration'
    });
  }
});

export default router;