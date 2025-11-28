// FANZ Unified Data Pipeline
// Central data aggregation and routing system for all platform services

import EventEmitter from 'events';
import { performance } from 'perf_hooks';

class UnifiedDataPipeline extends EventEmitter {
  constructor() {
    super();
    
    // Data streams and collectors
    this.dataStreams = new Map();
    this.aggregators = new Map();
    this.processors = new Map();
    this.pipelines = new Map();
    this.buffers = new Map();
    
    // Real-time analytics
    this.realTimeMetrics = new Map();
    this.alertThresholds = new Map();
    this.subscribers = new Map();
    
    // Configuration
    this.config = {
      maxBufferSize: 10000,
      flushInterval: 5000, // 5 seconds
      aggregationWindow: 60000, // 1 minute
      retentionPeriod: 86400000, // 24 hours
      alertCooldown: 300000, // 5 minutes
      batchSize: 100
    };
    
    // Performance metrics
    this.pipelineMetrics = {
      eventsProcessed: 0,
      bytesProcessed: 0,
      averageLatency: 0,
      errorRate: 0,
      throughput: 0,
      lastFlush: null
    };
    
    // Data processors
    this.setupDataProcessors();
    
    // Start background tasks
    this.startBackgroundProcessing();
    
    console.log('🌊 Unified Data Pipeline initialized');
  }

  // === DATA STREAM MANAGEMENT ===

  /**
   * Register a data stream from a service
   */
  registerStream(streamConfig) {
    const {
      name,
      source,
      type = 'metrics', // metrics, events, logs, analytics
      schema,
      aggregationRules = [],
      retention = this.config.retentionPeriod,
      realTime = false
    } = streamConfig;

    if (!name || !source) {
      throw new Error('Stream name and source are required');
    }

    this.dataStreams.set(name, {
      name,
      source,
      type,
      schema,
      aggregationRules,
      retention,
      realTime,
      registeredAt: new Date(),
      eventCount: 0,
      lastEvent: null,
      status: 'active'
    });

    // Initialize buffer for this stream
    this.buffers.set(name, []);

    // Setup real-time processing if enabled
    if (realTime) {
      this.setupRealTimeProcessor(name);
    }

    console.log(`📊 Data stream registered: ${name} (${type}) from ${source}`);
    
    this.emit('streamRegistered', { name, source, type, realTime });
    return true;
  }

  /**
   * Ingest data into a stream
   */
  async ingestData(streamName, data, metadata = {}) {
    const stream = this.dataStreams.get(streamName);
    if (!stream) {
      throw new Error(`Stream ${streamName} not found`);
    }

    const event = {
      id: this.generateEventId(),
      streamName,
      timestamp: new Date(),
      data,
      metadata: {
        ...metadata,
        source: stream.source,
        type: stream.type
      }
    };

    // Validate against schema if provided
    if (stream.schema) {
      this.validateEventSchema(event, stream.schema);
    }

    // Add to buffer
    const buffer = this.buffers.get(streamName);
    buffer.push(event);

    // Update stream statistics
    stream.eventCount++;
    stream.lastEvent = event.timestamp;

    // Trim buffer if too large
    if (buffer.length > this.config.maxBufferSize) {
      buffer.splice(0, buffer.length - this.config.maxBufferSize);
    }

    // Real-time processing
    if (stream.realTime) {
      await this.processRealTimeEvent(event);
    }

    // Apply aggregation rules
    await this.applyAggregationRules(streamName, event);

    // Update pipeline metrics
    this.updatePipelineMetrics(event);

    this.emit('dataIngested', { streamName, event });
    return event.id;
  }

  // === DATA PROCESSING ===

  /**
   * Setup core data processors
   */
  setupDataProcessors() {
    // Metrics Processor
    this.processors.set('metrics', {
      name: 'metrics',
      process: this.processMetrics.bind(this),
      outputStreams: ['aggregated_metrics', 'alerts']
    });

    // Event Processor
    this.processors.set('events', {
      name: 'events',
      process: this.processEvents.bind(this),
      outputStreams: ['event_analytics', 'user_behavior']
    });

    // Log Processor
    this.processors.set('logs', {
      name: 'logs',
      process: this.processLogs.bind(this),
      outputStreams: ['log_analytics', 'error_tracking']
    });

    // Revenue Analytics Processor
    this.processors.set('revenue', {
      name: 'revenue',
      process: this.processRevenueAnalytics.bind(this),
      outputStreams: ['revenue_insights', 'creator_performance']
    });

    // User Behavior Processor
    this.processors.set('behavior', {
      name: 'behavior',
      process: this.processUserBehavior.bind(this),
      outputStreams: ['behavior_insights', 'engagement_metrics']
    });
  }

  /**
   * Process metrics data
   */
  async processMetrics(events) {
    const aggregated = {
      timestamp: new Date(),
      metrics: {},
      alerts: []
    };

    for (const event of events) {
      const { data } = event;
      
      // Aggregate numeric metrics
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'number') {
          if (!aggregated.metrics[key]) {
            aggregated.metrics[key] = {
              sum: 0,
              count: 0,
              min: value,
              max: value,
              avg: 0
            };
          }
          
          const metric = aggregated.metrics[key];
          metric.sum += value;
          metric.count++;
          metric.min = Math.min(metric.min, value);
          metric.max = Math.max(metric.max, value);
          metric.avg = metric.sum / metric.count;

          // Check alert thresholds
          const threshold = this.alertThresholds.get(key);
          if (threshold && this.shouldTriggerAlert(key, value, threshold)) {
            aggregated.alerts.push({
              metric: key,
              value,
              threshold,
              severity: this.calculateAlertSeverity(value, threshold),
              timestamp: event.timestamp
            });
          }
        }
      });
    }

    return aggregated;
  }

  /**
   * Process event data for analytics
   */
  async processEvents(events) {
    const analytics = {
      timestamp: new Date(),
      eventCounts: {},
      userActions: {},
      conversionFunnels: {},
      sessionMetrics: {}
    };

    for (const event of events) {
      const { data, metadata } = event;
      
      // Count events by type
      const eventType = data.eventType || metadata.eventType || 'unknown';
      analytics.eventCounts[eventType] = (analytics.eventCounts[eventType] || 0) + 1;

      // Track user actions
      if (data.userId) {
        if (!analytics.userActions[data.userId]) {
          analytics.userActions[data.userId] = [];
        }
        analytics.userActions[data.userId].push({
          action: eventType,
          timestamp: event.timestamp,
          context: data.context || {}
        });
      }

      // Conversion funnel analysis
      if (data.funnelStep) {
        const funnelKey = data.funnelName || 'default';
        if (!analytics.conversionFunnels[funnelKey]) {
          analytics.conversionFunnels[funnelKey] = {};
        }
        analytics.conversionFunnels[funnelKey][data.funnelStep] = 
          (analytics.conversionFunnels[funnelKey][data.funnelStep] || 0) + 1;
      }
    }

    return analytics;
  }

  /**
   * Process log data for insights
   */
  async processLogs(events) {
    const insights = {
      timestamp: new Date(),
      errorsByType: {},
      performanceMetrics: {},
      securityEvents: [],
      systemHealth: {}
    };

    for (const event of events) {
      const { data } = event;
      
      // Error tracking
      if (data.level === 'error' || data.error) {
        const errorType = data.error?.name || data.errorType || 'UnknownError';
        insights.errorsByType[errorType] = (insights.errorsByType[errorType] || 0) + 1;
      }

      // Performance metrics
      if (data.duration || data.responseTime) {
        const endpoint = data.endpoint || data.path || 'unknown';
        if (!insights.performanceMetrics[endpoint]) {
          insights.performanceMetrics[endpoint] = {
            count: 0,
            totalDuration: 0,
            avgDuration: 0,
            maxDuration: 0
          };
        }
        
        const perf = insights.performanceMetrics[endpoint];
        const duration = data.duration || data.responseTime;
        perf.count++;
        perf.totalDuration += duration;
        perf.avgDuration = perf.totalDuration / perf.count;
        perf.maxDuration = Math.max(perf.maxDuration, duration);
      }

      // Security event detection
      if (this.isSecurityEvent(data)) {
        insights.securityEvents.push({
          type: data.securityEventType || 'suspicious_activity',
          severity: data.severity || 'medium',
          details: data,
          timestamp: event.timestamp
        });
      }
    }

    return insights;
  }

  /**
   * Process revenue analytics data
   */
  async processRevenueAnalytics(events) {
    const insights = {
      timestamp: new Date(),
      totalRevenue: 0,
      revenueByCreator: {},
      revenueByCategory: {},
      conversionRates: {},
      subscriptionMetrics: {}
    };

    for (const event of events) {
      const { data } = event;
      
      // Revenue aggregation
      if (data.amount) {
        insights.totalRevenue += data.amount;
        
        // By creator
        if (data.creatorId) {
          insights.revenueByCreator[data.creatorId] = 
            (insights.revenueByCreator[data.creatorId] || 0) + data.amount;
        }
        
        // By category
        if (data.category) {
          insights.revenueByCategory[data.category] = 
            (insights.revenueByCategory[data.category] || 0) + data.amount;
        }
      }

      // Subscription metrics
      if (data.subscriptionEvent) {
        const eventType = data.subscriptionEvent;
        if (!insights.subscriptionMetrics[eventType]) {
          insights.subscriptionMetrics[eventType] = 0;
        }
        insights.subscriptionMetrics[eventType]++;
      }
    }

    return insights;
  }

  /**
   * Process user behavior data
   */
  async processUserBehavior(events) {
    const insights = {
      timestamp: new Date(),
      sessionData: {},
      engagementMetrics: {},
      contentInteractions: {},
      userJourney: {}
    };

    for (const event of events) {
      const { data } = event;
      
      // Session analysis
      if (data.sessionId && data.userId) {
        if (!insights.sessionData[data.userId]) {
          insights.sessionData[data.userId] = {
            sessions: {},
            totalSessions: 0,
            avgSessionDuration: 0
          };
        }
        
        const userSessions = insights.sessionData[data.userId];
        if (!userSessions.sessions[data.sessionId]) {
          userSessions.sessions[data.sessionId] = {
            startTime: event.timestamp,
            endTime: event.timestamp,
            actions: 0
          };
          userSessions.totalSessions++;
        }
        
        const session = userSessions.sessions[data.sessionId];
        session.endTime = event.timestamp;
        session.actions++;
      }

      // Content interactions
      if (data.contentId) {
        if (!insights.contentInteractions[data.contentId]) {
          insights.contentInteractions[data.contentId] = {
            views: 0,
            likes: 0,
            shares: 0,
            purchases: 0
          };
        }
        
        const interaction = insights.contentInteractions[data.contentId];
        const actionType = data.action || 'view';
        if (interaction.hasOwnProperty(actionType)) {
          interaction[actionType]++;
        }
      }
    }

    return insights;
  }

  // === REAL-TIME PROCESSING ===

  /**
   * Setup real-time processor for a stream
   */
  setupRealTimeProcessor(streamName) {
    this.realTimeMetrics.set(streamName, {
      currentValue: 0,
      trend: 'stable',
      lastUpdate: new Date(),
      history: []
    });
  }

  /**
   * Process real-time event
   */
  async processRealTimeEvent(event) {
    const { streamName, data, timestamp } = event;
    const metrics = this.realTimeMetrics.get(streamName);
    
    if (!metrics) return;

    // Update real-time metrics
    if (typeof data.value === 'number') {
      const previousValue = metrics.currentValue;
      metrics.currentValue = data.value;
      metrics.lastUpdate = timestamp;
      
      // Add to history
      metrics.history.push({ value: data.value, timestamp });
      
      // Keep history limited
      if (metrics.history.length > 100) {
        metrics.history.shift();
      }
      
      // Calculate trend
      metrics.trend = this.calculateTrend(metrics.history);
      
      // Emit real-time update
      this.emit('realTimeUpdate', {
        streamName,
        currentValue: metrics.currentValue,
        previousValue,
        trend: metrics.trend,
        timestamp
      });
    }
  }

  // === AGGREGATION RULES ===

  /**
   * Apply aggregation rules to incoming data
   */
  async applyAggregationRules(streamName, event) {
    const stream = this.dataStreams.get(streamName);
    if (!stream.aggregationRules.length) return;

    for (const rule of stream.aggregationRules) {
      try {
        await this.executeAggregationRule(rule, event);
      } catch (error) {
        console.error(`Error applying aggregation rule:`, error);
      }
    }
  }

  /**
   * Execute a single aggregation rule
   */
  async executeAggregationRule(rule, event) {
    const { name, condition, aggregation, outputStream } = rule;
    
    // Check if condition matches
    if (!this.evaluateCondition(condition, event)) {
      return;
    }

    // Get or create aggregator
    let aggregator = this.aggregators.get(name);
    if (!aggregator) {
      aggregator = {
        name,
        rule,
        data: {},
        lastReset: new Date(),
        eventCount: 0
      };
      this.aggregators.set(name, aggregator);
    }

    // Apply aggregation
    this.applyAggregation(aggregator, aggregation, event);
    aggregator.eventCount++;

    // Check if we should emit aggregated data
    if (this.shouldEmitAggregation(aggregator)) {
      await this.emitAggregatedData(aggregator, outputStream);
    }
  }

  /**
   * Apply aggregation logic
   */
  applyAggregation(aggregator, aggregation, event) {
    const { type, field, window } = aggregation;
    const value = this.getFieldValue(event.data, field);

    if (!aggregator.data[field]) {
      aggregator.data[field] = {
        count: 0,
        sum: 0,
        min: value,
        max: value,
        values: []
      };
    }

    const agg = aggregator.data[field];
    
    switch (type) {
      case 'sum':
        agg.sum += value;
        break;
      case 'avg':
        agg.sum += value;
        agg.count++;
        agg.avg = agg.sum / agg.count;
        break;
      case 'min':
        agg.min = Math.min(agg.min, value);
        break;
      case 'max':
        agg.max = Math.max(agg.max, value);
        break;
      case 'count':
        agg.count++;
        break;
      case 'unique':
        if (!agg.unique) agg.unique = new Set();
        agg.unique.add(value);
        agg.uniqueCount = agg.unique.size;
        break;
    }

    // Time-window management
    if (window) {
      agg.values.push({ value, timestamp: event.timestamp });
      const cutoff = new Date(Date.now() - window);
      agg.values = agg.values.filter(v => v.timestamp > cutoff);
    }
  }

  // === BACKGROUND PROCESSING ===

  /**
   * Start background processing tasks
   */
  startBackgroundProcessing() {
    // Flush buffers periodically
    setInterval(() => {
      this.flushBuffers();
    }, this.config.flushInterval);

    // Process aggregations
    setInterval(() => {
      this.processAggregations();
    }, this.config.aggregationWindow);

    // Cleanup old data
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000); // 1 hour
  }

  /**
   * Flush all stream buffers
   */
  async flushBuffers() {
    const flushPromises = [];

    for (const [streamName, buffer] of this.buffers.entries()) {
      if (buffer.length > 0) {
        flushPromises.push(this.flushStreamBuffer(streamName, buffer));
      }
    }

    await Promise.allSettled(flushPromises);
    this.pipelineMetrics.lastFlush = new Date();
  }

  /**
   * Flush a single stream buffer
   */
  async flushStreamBuffer(streamName, buffer) {
    const stream = this.dataStreams.get(streamName);
    if (!stream) return;

    // Process batch
    const batch = buffer.splice(0, this.config.batchSize);
    
    try {
      const processor = this.processors.get(stream.type);
      if (processor) {
        const result = await processor.process(batch);
        
        // Emit processed data to output streams
        for (const outputStream of processor.outputStreams) {
          this.emit('processedData', {
            streamName: outputStream,
            data: result,
            sourceStream: streamName,
            batchSize: batch.length
          });
        }
      }
    } catch (error) {
      console.error(`Error processing batch for ${streamName}:`, error);
      // Re-add failed events to buffer for retry
      buffer.unshift(...batch);
    }
  }

  // === ALERT SYSTEM ===

  /**
   * Set alert threshold for a metric
   */
  setAlertThreshold(metricName, threshold) {
    this.alertThresholds.set(metricName, {
      ...threshold,
      lastTriggered: null,
      triggerCount: 0
    });
  }

  /**
   * Check if alert should be triggered
   */
  shouldTriggerAlert(metricName, value, threshold) {
    const now = Date.now();
    
    // Check cooldown
    if (threshold.lastTriggered && 
        (now - threshold.lastTriggered) < this.config.alertCooldown) {
      return false;
    }

    // Check threshold conditions
    const { operator, value: thresholdValue } = threshold;
    let triggered = false;

    switch (operator) {
      case 'gt':
        triggered = value > thresholdValue;
        break;
      case 'lt':
        triggered = value < thresholdValue;
        break;
      case 'eq':
        triggered = value === thresholdValue;
        break;
      case 'gte':
        triggered = value >= thresholdValue;
        break;
      case 'lte':
        triggered = value <= thresholdValue;
        break;
    }

    if (triggered) {
      threshold.lastTriggered = now;
      threshold.triggerCount++;
    }

    return triggered;
  }

  // === SUBSCRIBER MANAGEMENT ===

  /**
   * Subscribe to processed data streams
   */
  subscribe(streamName, callback, filter = null) {
    if (!this.subscribers.has(streamName)) {
      this.subscribers.set(streamName, []);
    }

    const subscription = {
      id: this.generateSubscriptionId(),
      callback,
      filter,
      createdAt: new Date(),
      eventCount: 0
    };

    this.subscribers.get(streamName).push(subscription);
    
    return subscription.id;
  }

  /**
   * Unsubscribe from data stream
   */
  unsubscribe(subscriptionId) {
    for (const [streamName, subs] of this.subscribers.entries()) {
      const index = subs.findIndex(s => s.id === subscriptionId);
      if (index >= 0) {
        subs.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Notify subscribers of new data
   */
  notifySubscribers(streamName, data) {
    const subscribers = this.subscribers.get(streamName);
    if (!subscribers || subscribers.length === 0) return;

    for (const subscription of subscribers) {
      try {
        // Apply filter if present
        if (subscription.filter && !subscription.filter(data)) {
          continue;
        }

        subscription.callback(data);
        subscription.eventCount++;
      } catch (error) {
        console.error(`Error notifying subscriber ${subscription.id}:`, error);
      }
    }
  }

  // === METRICS AND MONITORING ===

  /**
   * Get pipeline metrics
   */
  getMetrics() {
    return {
      ...this.pipelineMetrics,
      streams: {
        total: this.dataStreams.size,
        active: Array.from(this.dataStreams.values()).filter(s => s.status === 'active').length,
        realTime: Array.from(this.dataStreams.values()).filter(s => s.realTime).length
      },
      processors: {
        total: this.processors.size,
        registered: Array.from(this.processors.keys())
      },
      aggregators: {
        total: this.aggregators.size,
        active: Array.from(this.aggregators.values()).filter(a => a.eventCount > 0).length
      },
      buffers: {
        totalEvents: Array.from(this.buffers.values()).reduce((sum, buffer) => sum + buffer.length, 0),
        streams: Array.from(this.buffers.entries()).map(([name, buffer]) => ({
          name,
          size: buffer.length
        }))
      },
      subscribers: {
        total: Array.from(this.subscribers.values()).reduce((sum, subs) => sum + subs.length, 0),
        byStream: Array.from(this.subscribers.entries()).map(([stream, subs]) => ({
          stream,
          count: subs.length
        }))
      }
    };
  }

  /**
   * Get real-time metrics for all streams
   */
  getRealTimeMetrics() {
    const metrics = {};
    
    for (const [streamName, data] of this.realTimeMetrics.entries()) {
      metrics[streamName] = {
        currentValue: data.currentValue,
        trend: data.trend,
        lastUpdate: data.lastUpdate,
        historyLength: data.history.length
      };
    }
    
    return metrics;
  }

  // === UTILITY METHODS ===

  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSubscriptionId() {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validateEventSchema(event, schema) {
    // Basic schema validation - in production, use a proper schema validator
    const { data } = event;
    
    for (const [field, type] of Object.entries(schema)) {
      if (data[field] !== undefined && typeof data[field] !== type) {
        throw new Error(`Schema validation failed: ${field} expected ${type}, got ${typeof data[field]}`);
      }
    }
  }

  evaluateCondition(condition, event) {
    if (!condition) return true;
    
    const { field, operator, value } = condition;
    const eventValue = this.getFieldValue(event.data, field);
    
    switch (operator) {
      case 'eq': return eventValue === value;
      case 'ne': return eventValue !== value;
      case 'gt': return eventValue > value;
      case 'lt': return eventValue < value;
      case 'gte': return eventValue >= value;
      case 'lte': return eventValue <= value;
      case 'contains': return String(eventValue).includes(value);
      default: return true;
    }
  }

  getFieldValue(data, field) {
    return field.split('.').reduce((obj, key) => obj?.[key], data);
  }

  calculateTrend(history) {
    if (history.length < 2) return 'stable';
    
    const recent = history.slice(-10);
    const first = recent[0].value;
    const last = recent[recent.length - 1].value;
    
    const change = ((last - first) / first) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  calculateAlertSeverity(value, threshold) {
    const diff = Math.abs(value - threshold.value) / threshold.value;
    
    if (diff > 0.5) return 'critical';
    if (diff > 0.2) return 'high';
    if (diff > 0.1) return 'medium';
    return 'low';
  }

  isSecurityEvent(data) {
    const securityIndicators = [
      'failed_login',
      'suspicious_activity',
      'rate_limit_exceeded',
      'unauthorized_access',
      'data_breach_attempt'
    ];
    
    return securityIndicators.some(indicator => 
      data.eventType === indicator || 
      data.securityEvent === indicator ||
      (data.message && data.message.toLowerCase().includes(indicator))
    );
  }

  updatePipelineMetrics(event) {
    this.pipelineMetrics.eventsProcessed++;
    
    const eventSize = JSON.stringify(event).length;
    this.pipelineMetrics.bytesProcessed += eventSize;
    
    // Calculate throughput (events per second)
    const now = Date.now();
    if (!this.lastThroughputCalc) {
      this.lastThroughputCalc = now;
      this.throughputEvents = 0;
    }
    
    this.throughputEvents++;
    
    if (now - this.lastThroughputCalc >= 1000) {
      this.pipelineMetrics.throughput = this.throughputEvents;
      this.lastThroughputCalc = now;
      this.throughputEvents = 0;
    }
  }

  shouldEmitAggregation(aggregator) {
    const timeSinceLastReset = Date.now() - aggregator.lastReset.getTime();
    return timeSinceLastReset >= this.config.aggregationWindow || 
           aggregator.eventCount >= this.config.batchSize;
  }

  async emitAggregatedData(aggregator, outputStream) {
    const data = {
      aggregatorName: aggregator.name,
      data: aggregator.data,
      eventCount: aggregator.eventCount,
      timeWindow: Date.now() - aggregator.lastReset.getTime(),
      timestamp: new Date()
    };

    this.emit('aggregatedData', {
      streamName: outputStream,
      data
    });

    // Reset aggregator
    aggregator.data = {};
    aggregator.eventCount = 0;
    aggregator.lastReset = new Date();
  }

  cleanupOldData() {
    const cutoff = new Date(Date.now() - this.config.retentionPeriod);
    
    // Cleanup real-time metrics history
    for (const metrics of this.realTimeMetrics.values()) {
      metrics.history = metrics.history.filter(h => h.timestamp > cutoff);
    }
    
    console.log('🧹 Cleaned up old data from pipeline');
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Unified Data Pipeline shutting down...');
    
    // Flush all remaining data
    await this.flushBuffers();
    
    // Remove all listeners
    this.removeAllListeners();
    
    console.log('✅ Unified Data Pipeline shutdown complete');
  }
}

export default UnifiedDataPipeline;