// FANZ Unified Data Pipeline API Routes
// REST API endpoints for managing data streams, analytics, and real-time metrics

import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for data pipeline APIs
const pipelineLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Higher limit for data ingestion
  message: { error: 'Too many data pipeline requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all pipeline routes
router.use(pipelineLimit);

// Middleware to inject data pipeline
router.use((req, res, next) => {
  if (!req.app.locals.dataPipeline) {
    return res.status(503).json({
      error: 'Data pipeline not available',
      message: 'Unified data pipeline is currently offline'
    });
  }
  req.pipeline = req.app.locals.dataPipeline;
  next();
});

// === STREAM MANAGEMENT ===

/**
 * GET /data-pipeline/streams
 * Get all registered data streams
 */
router.get('/streams', async (req, res) => {
  try {
    const streams = Array.from(req.pipeline.dataStreams.entries()).map(([name, stream]) => ({
      name,
      source: stream.source,
      type: stream.type,
      realTime: stream.realTime,
      eventCount: stream.eventCount,
      lastEvent: stream.lastEvent,
      status: stream.status,
      registeredAt: stream.registeredAt
    }));
    
    res.json({
      success: true,
      streams,
      total: streams.length
    });
  } catch (error) {
    console.error('Error fetching streams:', error);
    res.status(500).json({
      error: 'Failed to fetch streams',
      message: error.message
    });
  }
});

/**
 * POST /data-pipeline/streams
 * Register a new data stream
 */
router.post('/streams', async (req, res) => {
  try {
    const streamConfig = req.body;
    
    // Basic validation
    if (!streamConfig.name || !streamConfig.source) {
      return res.status(400).json({
        error: 'Invalid stream configuration',
        message: 'Stream name and source are required'
      });
    }
    
    // Check if stream already exists
    if (req.pipeline.dataStreams.has(streamConfig.name)) {
      return res.status(409).json({
        error: 'Stream already exists',
        message: `Stream ${streamConfig.name} is already registered`
      });
    }
    
    const success = req.pipeline.registerStream(streamConfig);
    
    res.status(201).json({
      success,
      stream: streamConfig.name,
      type: streamConfig.type || 'metrics',
      realTime: streamConfig.realTime || false,
      message: 'Stream registered successfully'
    });
  } catch (error) {
    console.error('Error registering stream:', error);
    res.status(400).json({
      error: 'Failed to register stream',
      message: error.message
    });
  }
});

/**
 * GET /data-pipeline/streams/:streamName
 * Get detailed information about a specific stream
 */
router.get('/streams/:streamName', async (req, res) => {
  try {
    const { streamName } = req.params;
    const stream = req.pipeline.dataStreams.get(streamName);
    
    if (!stream) {
      return res.status(404).json({
        error: 'Stream not found',
        message: `Stream ${streamName} does not exist`
      });
    }
    
    // Get buffer information
    const buffer = req.pipeline.buffers.get(streamName) || [];
    
    // Get real-time metrics if available
    const realTimeMetrics = req.pipeline.realTimeMetrics.get(streamName);
    
    res.json({
      success: true,
      stream: {
        ...stream,
        bufferSize: buffer.length,
        realTimeMetrics: realTimeMetrics ? {
          currentValue: realTimeMetrics.currentValue,
          trend: realTimeMetrics.trend,
          lastUpdate: realTimeMetrics.lastUpdate,
          historySize: realTimeMetrics.history.length
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching stream:', error);
    res.status(500).json({
      error: 'Failed to fetch stream',
      message: error.message
    });
  }
});

/**
 * POST /data-pipeline/streams/:streamName/data
 * Ingest data into a specific stream
 */
router.post('/streams/:streamName/data', async (req, res) => {
  try {
    const { streamName } = req.params;
    const { data, metadata = {} } = req.body;
    
    if (!data) {
      return res.status(400).json({
        error: 'No data provided',
        message: 'Data field is required'
      });
    }
    
    // Add request metadata
    const requestMetadata = {
      ...metadata,
      requestId: req.headers['x-request-id'] || `req_${Date.now()}`,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      timestamp: new Date()
    };
    
    const eventId = await req.pipeline.ingestData(streamName, data, requestMetadata);
    
    res.json({
      success: true,
      eventId,
      streamName,
      timestamp: new Date(),
      message: 'Data ingested successfully'
    });
  } catch (error) {
    console.error('Error ingesting data:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Stream not found',
        message: error.message
      });
    }
    
    if (error.message.includes('Schema validation')) {
      return res.status(400).json({
        error: 'Schema validation failed',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to ingest data',
      message: error.message
    });
  }
});

// === METRICS AND ANALYTICS ===

/**
 * GET /data-pipeline/metrics
 * Get comprehensive pipeline metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = req.pipeline.getMetrics();
    
    res.json({
      success: true,
      metrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching pipeline metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch pipeline metrics',
      message: error.message
    });
  }
});

/**
 * GET /data-pipeline/metrics/real-time
 * Get real-time metrics for all streams
 */
router.get('/metrics/real-time', async (req, res) => {
  try {
    const metrics = req.pipeline.getRealTimeMetrics();
    
    res.json({
      success: true,
      realTimeMetrics: metrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch real-time metrics',
      message: error.message
    });
  }
});

/**
 * GET /data-pipeline/metrics/streams/:streamName
 * Get metrics for a specific stream
 */
router.get('/metrics/streams/:streamName', async (req, res) => {
  try {
    const { streamName } = req.params;
    const stream = req.pipeline.dataStreams.get(streamName);
    
    if (!stream) {
      return res.status(404).json({
        error: 'Stream not found',
        message: `Stream ${streamName} does not exist`
      });
    }
    
    const buffer = req.pipeline.buffers.get(streamName) || [];
    const realTimeMetrics = req.pipeline.realTimeMetrics.get(streamName);
    
    const streamMetrics = {
      name: streamName,
      eventCount: stream.eventCount,
      lastEvent: stream.lastEvent,
      bufferSize: buffer.length,
      status: stream.status,
      realTime: stream.realTime,
      realTimeMetrics: realTimeMetrics ? {
        currentValue: realTimeMetrics.currentValue,
        trend: realTimeMetrics.trend,
        lastUpdate: realTimeMetrics.lastUpdate,
        history: realTimeMetrics.history.slice(-10) // Last 10 data points
      } : null
    };
    
    res.json({
      success: true,
      streamMetrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching stream metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch stream metrics',
      message: error.message
    });
  }
});

// === ALERT MANAGEMENT ===

/**
 * GET /data-pipeline/alerts/thresholds
 * Get all alert thresholds
 */
router.get('/alerts/thresholds', async (req, res) => {
  try {
    const thresholds = Array.from(req.pipeline.alertThresholds.entries()).map(([metric, threshold]) => ({
      metric,
      operator: threshold.operator,
      value: threshold.value,
      severity: threshold.severity,
      lastTriggered: threshold.lastTriggered,
      triggerCount: threshold.triggerCount
    }));
    
    res.json({
      success: true,
      thresholds,
      total: thresholds.length
    });
  } catch (error) {
    console.error('Error fetching alert thresholds:', error);
    res.status(500).json({
      error: 'Failed to fetch alert thresholds',
      message: error.message
    });
  }
});

/**
 * POST /data-pipeline/alerts/thresholds
 * Set alert threshold for a metric
 */
router.post('/alerts/thresholds', async (req, res) => {
  try {
    const { metricName, operator, value, severity = 'medium' } = req.body;
    
    if (!metricName || !operator || value === undefined) {
      return res.status(400).json({
        error: 'Invalid threshold configuration',
        message: 'Metric name, operator, and value are required'
      });
    }
    
    const validOperators = ['gt', 'lt', 'eq', 'gte', 'lte'];
    if (!validOperators.includes(operator)) {
      return res.status(400).json({
        error: 'Invalid operator',
        message: `Operator must be one of: ${validOperators.join(', ')}`
      });
    }
    
    req.pipeline.setAlertThreshold(metricName, {
      operator,
      value,
      severity
    });
    
    res.json({
      success: true,
      metricName,
      threshold: { operator, value, severity },
      message: 'Alert threshold set successfully'
    });
  } catch (error) {
    console.error('Error setting alert threshold:', error);
    res.status(500).json({
      error: 'Failed to set alert threshold',
      message: error.message
    });
  }
});

/**
 * DELETE /data-pipeline/alerts/thresholds/:metricName
 * Remove alert threshold for a metric
 */
router.delete('/alerts/thresholds/:metricName', async (req, res) => {
  try {
    const { metricName } = req.params;
    
    if (!req.pipeline.alertThresholds.has(metricName)) {
      return res.status(404).json({
        error: 'Threshold not found',
        message: `No alert threshold found for metric ${metricName}`
      });
    }
    
    req.pipeline.alertThresholds.delete(metricName);
    
    res.json({
      success: true,
      metricName,
      message: 'Alert threshold removed successfully'
    });
  } catch (error) {
    console.error('Error removing alert threshold:', error);
    res.status(500).json({
      error: 'Failed to remove alert threshold',
      message: error.message
    });
  }
});

// === SUBSCRIPTION MANAGEMENT ===

/**
 * POST /data-pipeline/subscriptions
 * Subscribe to processed data streams
 */
router.post('/subscriptions', async (req, res) => {
  try {
    const { streamName, webhookUrl, filter } = req.body;
    
    if (!streamName || !webhookUrl) {
      return res.status(400).json({
        error: 'Invalid subscription configuration',
        message: 'Stream name and webhook URL are required'
      });
    }
    
    // Create webhook callback
    const callback = async (data) => {
      try {
        const fetch = (await import('node-fetch')).default;
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } catch (error) {
        console.error(`Webhook delivery failed for ${webhookUrl}:`, error);
      }
    };
    
    const subscriptionId = req.pipeline.subscribe(streamName, callback, filter);
    
    res.status(201).json({
      success: true,
      subscriptionId,
      streamName,
      webhookUrl,
      filter: filter || null,
      message: 'Subscription created successfully'
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      error: 'Failed to create subscription',
      message: error.message
    });
  }
});

/**
 * DELETE /data-pipeline/subscriptions/:subscriptionId
 * Unsubscribe from data stream
 */
router.delete('/subscriptions/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    const success = req.pipeline.unsubscribe(subscriptionId);
    
    if (!success) {
      return res.status(404).json({
        error: 'Subscription not found',
        message: `Subscription ${subscriptionId} does not exist`
      });
    }
    
    res.json({
      success: true,
      subscriptionId,
      message: 'Subscription removed successfully'
    });
  } catch (error) {
    console.error('Error removing subscription:', error);
    res.status(500).json({
      error: 'Failed to remove subscription',
      message: error.message
    });
  }
});

// === ANALYTICS QUERIES ===

/**
 * POST /data-pipeline/analytics/query
 * Run analytics query on processed data
 */
router.post('/analytics/query', async (req, res) => {
  try {
    const { 
      streams = [], 
      timeRange = { start: new Date(Date.now() - 3600000), end: new Date() },
      aggregations = [],
      filters = []
    } = req.body;
    
    if (streams.length === 0) {
      return res.status(400).json({
        error: 'No streams specified',
        message: 'At least one stream must be specified for analytics query'
      });
    }
    
    // Simple analytics query implementation
    // In a real system, this would query a time-series database
    const results = {};
    
    for (const streamName of streams) {
      const stream = req.pipeline.dataStreams.get(streamName);
      if (!stream) continue;
      
      const buffer = req.pipeline.buffers.get(streamName) || [];
      const realTimeMetrics = req.pipeline.realTimeMetrics.get(streamName);
      
      results[streamName] = {
        eventCount: stream.eventCount,
        bufferSize: buffer.length,
        lastEvent: stream.lastEvent,
        realTimeData: realTimeMetrics ? {
          currentValue: realTimeMetrics.currentValue,
          trend: realTimeMetrics.trend,
          history: realTimeMetrics.history.slice(-50) // Last 50 data points
        } : null
      };
    }
    
    res.json({
      success: true,
      query: { streams, timeRange, aggregations, filters },
      results,
      executedAt: new Date()
    });
  } catch (error) {
    console.error('Error executing analytics query:', error);
    res.status(500).json({
      error: 'Failed to execute analytics query',
      message: error.message
    });
  }
});

/**
 * GET /data-pipeline/analytics/insights
 * Get pre-computed analytics insights
 */
router.get('/analytics/insights', async (req, res) => {
  try {
    const { type = 'all', timeframe = 'hour' } = req.query;
    
    // Get pipeline metrics
    const metrics = req.pipeline.getMetrics();
    const realTimeMetrics = req.pipeline.getRealTimeMetrics();
    
    // Generate insights based on current data
    const insights = {
      performance: {
        throughput: metrics.throughput,
        eventsProcessed: metrics.eventsProcessed,
        bytesProcessed: metrics.bytesProcessed,
        lastFlush: metrics.lastFlush
      },
      streams: {
        total: metrics.streams.total,
        active: metrics.streams.active,
        realTime: metrics.streams.realTime,
        topStreams: Array.from(req.pipeline.dataStreams.entries())
          .sort(([,a], [,b]) => b.eventCount - a.eventCount)
          .slice(0, 5)
          .map(([name, stream]) => ({ name, eventCount: stream.eventCount }))
      },
      realTime: {
        activeStreams: Object.keys(realTimeMetrics).length,
        trends: Object.entries(realTimeMetrics).reduce((acc, [name, data]) => {
          acc[data.trend] = (acc[data.trend] || 0) + 1;
          return acc;
        }, {})
      },
      alerts: {
        thresholds: req.pipeline.alertThresholds.size,
        // In a real system, track recent alerts
        recentAlerts: []
      }
    };
    
    res.json({
      success: true,
      insights,
      type,
      timeframe,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({
      error: 'Failed to generate insights',
      message: error.message
    });
  }
});

// === HEALTH AND STATUS ===

/**
 * GET /data-pipeline/health
 * Get pipeline health status
 */
router.get('/health', async (req, res) => {
  try {
    const metrics = req.pipeline.getMetrics();
    
    const health = {
      healthy: true,
      pipeline: {
        eventsProcessed: metrics.eventsProcessed,
        throughput: metrics.throughput,
        lastFlush: metrics.lastFlush,
        errorRate: metrics.errorRate
      },
      streams: {
        total: metrics.streams.total,
        active: metrics.streams.active,
        realTime: metrics.streams.realTime
      },
      buffers: {
        totalEvents: metrics.buffers.totalEvents,
        streams: metrics.buffers.streams.length
      },
      processors: {
        registered: metrics.processors.total
      },
      uptime: process.uptime(),
      timestamp: new Date()
    };
    
    // Determine overall health
    if (metrics.errorRate > 0.1 || metrics.buffers.totalEvents > 50000) {
      health.healthy = false;
      health.issues = [];
      
      if (metrics.errorRate > 0.1) {
        health.issues.push('High error rate detected');
      }
      
      if (metrics.buffers.totalEvents > 50000) {
        health.issues.push('Buffer overflow risk - high event backlog');
      }
    }
    
    res.json({
      success: true,
      health,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching pipeline health:', error);
    res.status(500).json({
      success: false,
      healthy: false,
      error: 'Pipeline health check failed',
      message: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * POST /data-pipeline/flush
 * Manually trigger buffer flush
 */
router.post('/flush', async (req, res) => {
  try {
    const { streamName } = req.body;
    
    if (streamName) {
      // Flush specific stream
      const buffer = req.pipeline.buffers.get(streamName);
      if (!buffer) {
        return res.status(404).json({
          error: 'Stream not found',
          message: `Stream ${streamName} does not exist`
        });
      }
      
      await req.pipeline.flushStreamBuffer(streamName, buffer);
      
      res.json({
        success: true,
        streamName,
        message: 'Stream buffer flushed successfully'
      });
    } else {
      // Flush all buffers
      await req.pipeline.flushBuffers();
      
      res.json({
        success: true,
        message: 'All buffers flushed successfully'
      });
    }
  } catch (error) {
    console.error('Error flushing buffers:', error);
    res.status(500).json({
      error: 'Failed to flush buffers',
      message: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Data Pipeline API error:', error);
  
  res.status(500).json({
    error: 'Internal data pipeline error',
    message: error.message,
    timestamp: new Date()
  });
});

export default router;