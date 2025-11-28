// FANZ Data Pipeline Integration
// Automatic registration and connection of all FANZ services to the unified data pipeline

import UnifiedDataPipeline from '../services/unifiedDataPipeline.js';

class PipelineIntegration {
  constructor(orchestrationEngine = null) {
    this.dataPipeline = new UnifiedDataPipeline();
    this.orchestrationEngine = orchestrationEngine;
    this.initialized = false;
    this.serviceConnections = new Map();
  }

  /**
   * Initialize data pipeline with all FANZ services
   */
  async initialize() {
    if (this.initialized) {
      console.log('🌊 Data pipeline integration already initialized');
      return this.dataPipeline;
    }

    console.log('🌊 Initializing FANZ Data Pipeline Integration...');

    try {
      // Register core platform streams
      await this.registerPlatformStreams();
      
      // Register analytics streams
      await this.registerAnalyticsStreams();
      
      // Register business intelligence streams
      await this.registerBusinessStreams();
      
      // Register monitoring streams
      await this.registerMonitoringStreams();
      
      // Setup service event listeners
      await this.setupServiceListeners();
      
      // Configure alert thresholds
      await this.configureAlerts();
      
      // Connect to orchestration engine if available
      if (this.orchestrationEngine) {
        await this.connectToOrchestration();
      }
      
      this.initialized = true;
      console.log('✅ Data Pipeline Integration initialization complete');
      
      return this.dataPipeline;
    } catch (error) {
      console.error('❌ Data pipeline integration initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register core platform data streams
   */
  async registerPlatformStreams() {
    console.log('📊 Registering platform data streams...');

    // User Activity Stream
    this.dataPipeline.registerStream({
      name: 'user_activity',
      source: 'userService',
      type: 'events',
      schema: {
        userId: 'string',
        action: 'string',
        timestamp: 'string',
        metadata: 'object'
      },
      aggregationRules: [
        {
          name: 'user_activity_hourly',
          condition: { field: 'action', operator: 'exists' },
          aggregation: { type: 'count', field: 'action', window: 3600000 },
          outputStream: 'user_activity_aggregated'
        }
      ],
      realTime: true
    });

    // Content Metrics Stream
    this.dataPipeline.registerStream({
      name: 'content_metrics',
      source: 'contentService',
      type: 'metrics',
      schema: {
        contentId: 'string',
        creatorId: 'string',
        views: 'number',
        likes: 'number',
        shares: 'number',
        revenue: 'number'
      },
      aggregationRules: [
        {
          name: 'content_performance',
          condition: { field: 'views', operator: 'gt', value: 0 },
          aggregation: { type: 'sum', field: 'views', window: 3600000 },
          outputStream: 'content_performance'
        }
      ],
      realTime: true
    });

    // Payment Events Stream
    this.dataPipeline.registerStream({
      name: 'payment_events',
      source: 'paymentService',
      type: 'events',
      schema: {
        transactionId: 'string',
        userId: 'string',
        creatorId: 'string',
        amount: 'number',
        currency: 'string',
        status: 'string',
        processor: 'string'
      },
      aggregationRules: [
        {
          name: 'revenue_aggregation',
          condition: { field: 'status', operator: 'eq', value: 'completed' },
          aggregation: { type: 'sum', field: 'amount', window: 3600000 },
          outputStream: 'revenue_insights'
        }
      ],
      realTime: true
    });

    // Streaming Metrics Stream
    this.dataPipeline.registerStream({
      name: 'streaming_metrics',
      source: 'streamingService',
      type: 'metrics',
      schema: {
        streamId: 'string',
        creatorId: 'string',
        viewers: 'number',
        duration: 'number',
        revenue: 'number',
        bitrate: 'number',
        quality: 'string'
      },
      realTime: true
    });

    // Social Engagement Stream
    this.dataPipeline.registerStream({
      name: 'social_engagement',
      source: 'socialService',
      type: 'events',
      schema: {
        userId: 'string',
        targetId: 'string',
        action: 'string',
        timestamp: 'string'
      },
      aggregationRules: [
        {
          name: 'engagement_metrics',
          condition: { field: 'action', operator: 'exists' },
          aggregation: { type: 'count', field: 'action', window: 3600000 },
          outputStream: 'engagement_metrics'
        }
      ],
      realTime: false
    });
  }

  /**
   * Register analytics and intelligence streams
   */
  async registerAnalyticsStreams() {
    console.log('🧠 Registering analytics streams...');

    // AI Insights Stream
    this.dataPipeline.registerStream({
      name: 'ai_insights',
      source: 'aiService',
      type: 'analytics',
      schema: {
        insightType: 'string',
        confidence: 'number',
        data: 'object',
        recommendations: 'object'
      },
      realTime: false
    });

    // Revenue Optimization Stream
    this.dataPipeline.registerStream({
      name: 'revenue_optimization',
      source: 'revenueOptimizationService',
      type: 'analytics',
      schema: {
        userId: 'string',
        optimizationType: 'string',
        previousValue: 'number',
        optimizedValue: 'number',
        expectedImpact: 'number'
      },
      aggregationRules: [
        {
          name: 'optimization_impact',
          condition: { field: 'expectedImpact', operator: 'gt', value: 0 },
          aggregation: { type: 'avg', field: 'expectedImpact', window: 86400000 },
          outputStream: 'optimization_insights'
        }
      ],
      realTime: true
    });

    // Search Analytics Stream
    this.dataPipeline.registerStream({
      name: 'search_analytics',
      source: 'searchService',
      type: 'events',
      schema: {
        query: 'string',
        userId: 'string',
        results: 'number',
        clickedResult: 'string',
        timestamp: 'string'
      },
      realTime: false
    });

    // Moderation Events Stream
    this.dataPipeline.registerStream({
      name: 'moderation_events',
      source: 'moderationService',
      type: 'events',
      schema: {
        contentId: 'string',
        action: 'string',
        reason: 'string',
        automated: 'boolean',
        moderatorId: 'string'
      },
      realTime: true
    });
  }

  /**
   * Register business intelligence streams
   */
  async registerBusinessStreams() {
    console.log('💼 Registering business intelligence streams...');

    // Creator Performance Stream
    this.dataPipeline.registerStream({
      name: 'creator_performance',
      source: 'analyticsService',
      type: 'analytics',
      schema: {
        creatorId: 'string',
        totalRevenue: 'number',
        subscribers: 'number',
        contentCount: 'number',
        averageRating: 'number',
        engagementRate: 'number'
      },
      aggregationRules: [
        {
          name: 'top_creators',
          condition: { field: 'totalRevenue', operator: 'gt', value: 1000 },
          aggregation: { type: 'max', field: 'totalRevenue', window: 86400000 },
          outputStream: 'top_creator_insights'
        }
      ],
      realTime: false
    });

    // Subscription Analytics Stream
    this.dataPipeline.registerStream({
      name: 'subscription_analytics',
      source: 'subscriptionService',
      type: 'metrics',
      schema: {
        subscriptionId: 'string',
        creatorId: 'string',
        subscriberId: 'string',
        tier: 'string',
        amount: 'number',
        status: 'string',
        churnRisk: 'number'
      },
      aggregationRules: [
        {
          name: 'churn_analysis',
          condition: { field: 'churnRisk', operator: 'gt', value: 0.7 },
          aggregation: { type: 'count', field: 'subscriptionId', window: 86400000 },
          outputStream: 'churn_alerts'
        }
      ],
      realTime: true
    });

    // Gamification Metrics Stream
    this.dataPipeline.registerStream({
      name: 'gamification_metrics',
      source: 'gamificationService',
      type: 'events',
      schema: {
        userId: 'string',
        achievementType: 'string',
        points: 'number',
        level: 'number',
        badgeId: 'string'
      },
      realTime: false
    });
  }

  /**
   * Register system monitoring streams
   */
  async registerMonitoringStreams() {
    console.log('🔍 Registering monitoring streams...');

    // System Performance Stream
    this.dataPipeline.registerStream({
      name: 'system_performance',
      source: 'systemMonitoring',
      type: 'metrics',
      schema: {
        service: 'string',
        cpu: 'number',
        memory: 'number',
        responseTime: 'number',
        errorRate: 'number',
        throughput: 'number'
      },
      aggregationRules: [
        {
          name: 'performance_alerts',
          condition: { field: 'errorRate', operator: 'gt', value: 0.05 },
          aggregation: { type: 'avg', field: 'errorRate', window: 300000 },
          outputStream: 'performance_alerts'
        }
      ],
      realTime: true
    });

    // Security Events Stream
    this.dataPipeline.registerStream({
      name: 'security_events',
      source: 'securityService',
      type: 'events',
      schema: {
        eventType: 'string',
        severity: 'string',
        userId: 'string',
        ipAddress: 'string',
        userAgent: 'string',
        blocked: 'boolean'
      },
      realTime: true
    });

    // API Gateway Metrics Stream
    this.dataPipeline.registerStream({
      name: 'api_gateway_metrics',
      source: 'apiGatewayService',
      type: 'metrics',
      schema: {
        endpoint: 'string',
        method: 'string',
        statusCode: 'number',
        responseTime: 'number',
        requestSize: 'number',
        responseSize: 'number'
      },
      aggregationRules: [
        {
          name: 'endpoint_performance',
          condition: { field: 'responseTime', operator: 'exists' },
          aggregation: { type: 'avg', field: 'responseTime', window: 300000 },
          outputStream: 'endpoint_performance'
        }
      ],
      realTime: true
    });

    // Application Logs Stream
    this.dataPipeline.registerStream({
      name: 'application_logs',
      source: 'logger',
      type: 'logs',
      schema: {
        level: 'string',
        message: 'string',
        timestamp: 'string',
        service: 'string',
        requestId: 'string',
        error: 'object'
      },
      realTime: false
    });
  }

  /**
   * Setup event listeners for automatic data ingestion
   */
  async setupServiceListeners() {
    console.log('🔗 Setting up service event listeners...');

    // Listen for orchestration events if available
    if (this.orchestrationEngine) {
      this.orchestrationEngine.on('workflowStarted', (data) => {
        this.ingestData('workflow_events', {
          eventType: 'workflow_started',
          workflowName: data.workflowName,
          executionId: data.executionId,
          timestamp: new Date()
        });
      });

      this.orchestrationEngine.on('workflowCompleted', (data) => {
        this.ingestData('workflow_events', {
          eventType: 'workflow_completed',
          workflowName: data.workflowName,
          executionId: data.executionId,
          duration: data.duration,
          timestamp: new Date()
        });
      });

      this.orchestrationEngine.on('serviceFailure', (data) => {
        this.ingestData('system_performance', {
          service: data.serviceName,
          errorRate: 1.0, // Mark as failure
          error: data.error,
          timestamp: new Date()
        });
      });
    }

    // Setup pipeline event listeners
    this.dataPipeline.on('streamRegistered', (data) => {
      console.log(`📊 Stream registered: ${data.name} from ${data.source}`);
    });

    this.dataPipeline.on('realTimeUpdate', (data) => {
      // Emit real-time updates for monitoring dashboards
      if (data.trend === 'decreasing' && data.streamName === 'revenue_optimization') {
        this.triggerAlert('revenue_decline', {
          stream: data.streamName,
          currentValue: data.currentValue,
          trend: data.trend,
          timestamp: data.timestamp
        });
      }
    });

    this.dataPipeline.on('processedData', (data) => {
      // Route processed data to appropriate handlers
      this.routeProcessedData(data);
    });
  }

  /**
   * Configure alert thresholds for key metrics
   */
  async configureAlerts() {
    console.log('🚨 Configuring alert thresholds...');

    // Revenue alerts
    this.dataPipeline.setAlertThreshold('totalRevenue', {
      operator: 'lt',
      value: 1000,
      severity: 'high'
    });

    // Performance alerts
    this.dataPipeline.setAlertThreshold('responseTime', {
      operator: 'gt',
      value: 1000,
      severity: 'medium'
    });

    // Error rate alerts
    this.dataPipeline.setAlertThreshold('errorRate', {
      operator: 'gt',
      value: 0.05,
      severity: 'critical'
    });

    // User activity alerts
    this.dataPipeline.setAlertThreshold('activeUsers', {
      operator: 'lt',
      value: 100,
      severity: 'low'
    });

    // Content moderation alerts
    this.dataPipeline.setAlertThreshold('moderationQueue', {
      operator: 'gt',
      value: 500,
      severity: 'high'
    });

    // Subscription churn alerts
    this.dataPipeline.setAlertThreshold('churnRate', {
      operator: 'gt',
      value: 0.15,
      severity: 'high'
    });
  }

  /**
   * Connect data pipeline to orchestration engine
   */
  async connectToOrchestration() {
    console.log('🎭 Connecting to service orchestration engine...');

    // Register workflow event stream
    this.dataPipeline.registerStream({
      name: 'workflow_events',
      source: 'orchestrationEngine',
      type: 'events',
      schema: {
        eventType: 'string',
        workflowName: 'string',
        executionId: 'string',
        duration: 'number',
        timestamp: 'string'
      },
      realTime: true
    });

    // Set up cross-system communication
    this.orchestrationEngine.on('healthCheckCompleted', (data) => {
      this.ingestData('system_performance', {
        service: 'orchestration',
        healthy: data.healthy,
        total: data.total,
        timestamp: data.timestamp
      });
    });
  }

  /**
   * Ingest data into a specific stream
   */
  async ingestData(streamName, data, metadata = {}) {
    try {
      const eventId = await this.dataPipeline.ingestData(streamName, data, {
        ...metadata,
        source: 'pipelineIntegration',
        timestamp: new Date()
      });
      return eventId;
    } catch (error) {
      console.error(`Error ingesting data to ${streamName}:`, error);
      return null;
    }
  }

  /**
   * Route processed data to appropriate handlers
   */
  routeProcessedData(data) {
    const { streamName, data: processedData, sourceStream } = data;

    switch (streamName) {
      case 'revenue_insights':
        this.handleRevenueInsights(processedData, sourceStream);
        break;
      
      case 'performance_alerts':
        this.handlePerformanceAlerts(processedData, sourceStream);
        break;
      
      case 'user_behavior':
        this.handleUserBehaviorInsights(processedData, sourceStream);
        break;
      
      case 'content_performance':
        this.handleContentPerformance(processedData, sourceStream);
        break;
      
      case 'churn_alerts':
        this.handleChurnAlerts(processedData, sourceStream);
        break;
      
      default:
        // Log unhandled stream for debugging
        console.log(`📊 Processed data from unhandled stream: ${streamName}`);
    }
  }

  /**
   * Handle revenue insights
   */
  handleRevenueInsights(data, sourceStream) {
    console.log(`💰 Revenue insights from ${sourceStream}:`, {
      totalRevenue: data.totalRevenue,
      topCreators: Object.keys(data.revenueByCreator || {}).length,
      timestamp: data.timestamp
    });

    // Trigger revenue optimization if needed
    if (this.orchestrationEngine && data.totalRevenue < 5000) {
      this.orchestrationEngine.executeWorkflow('revenueOptimization', {
        trigger: 'low_revenue',
        currentRevenue: data.totalRevenue,
        threshold: 5000
      }).catch(error => {
        console.error('Revenue optimization workflow failed:', error);
      });
    }
  }

  /**
   * Handle performance alerts
   */
  handlePerformanceAlerts(data, sourceStream) {
    console.log(`⚡ Performance alert from ${sourceStream}:`, {
      errorsByType: data.errorsByType,
      performanceMetrics: Object.keys(data.performanceMetrics || {}).length,
      securityEvents: data.securityEvents?.length || 0
    });

    // Auto-scale if performance issues detected
    if (Object.keys(data.errorsByType || {}).length > 10) {
      this.triggerAlert('high_error_rate', {
        source: sourceStream,
        errorTypes: Object.keys(data.errorsByType),
        count: Object.keys(data.errorsByType).length
      });
    }
  }

  /**
   * Handle user behavior insights
   */
  handleUserBehaviorInsights(data, sourceStream) {
    console.log(`👥 User behavior insights from ${sourceStream}:`, {
      sessions: Object.keys(data.sessionData || {}).length,
      contentInteractions: Object.keys(data.contentInteractions || {}).length,
      timestamp: data.timestamp
    });

    // Identify engagement opportunities
    const lowEngagementUsers = Object.entries(data.sessionData || {})
      .filter(([, userData]) => userData.totalSessions < 2)
      .length;

    if (lowEngagementUsers > 50) {
      this.triggerAlert('low_user_engagement', {
        lowEngagementUsers,
        totalUsers: Object.keys(data.sessionData || {}).length
      });
    }
  }

  /**
   * Handle content performance insights
   */
  handleContentPerformance(data, sourceStream) {
    console.log(`📹 Content performance from ${sourceStream}:`, {
      contentCount: Object.keys(data.contentInteractions || {}).length,
      timestamp: data.timestamp
    });

    // Identify top-performing content
    const topContent = Object.entries(data.contentInteractions || {})
      .sort(([,a], [,b]) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);

    if (topContent.length > 0) {
      console.log('🏆 Top performing content:', topContent);
    }
  }

  /**
   * Handle churn alerts
   */
  handleChurnAlerts(data, sourceStream) {
    console.log(`⚠️ Churn alert from ${sourceStream}:`, data);

    // Trigger retention workflow
    if (this.orchestrationEngine) {
      this.orchestrationEngine.executeWorkflow('customerRetention', {
        trigger: 'churn_risk',
        churnData: data
      }).catch(error => {
        console.error('Customer retention workflow failed:', error);
      });
    }
  }

  /**
   * Trigger alert with routing to appropriate channels
   */
  triggerAlert(alertType, data) {
    console.log(`🚨 Alert triggered: ${alertType}`, data);

    // In a real system, route to notification service, Slack, email, etc.
    this.ingestData('system_alerts', {
      alertType,
      data,
      severity: this.getAlertSeverity(alertType),
      timestamp: new Date()
    });
  }

  /**
   * Get alert severity based on type
   */
  getAlertSeverity(alertType) {
    const severityMap = {
      'revenue_decline': 'high',
      'high_error_rate': 'critical',
      'low_user_engagement': 'medium',
      'churn_risk': 'high',
      'performance_degradation': 'medium'
    };

    return severityMap[alertType] || 'low';
  }

  /**
   * Get data pipeline instance
   */
  getDataPipeline() {
    if (!this.initialized) {
      throw new Error('Pipeline integration not initialized. Call initialize() first.');
    }
    return this.dataPipeline;
  }

  /**
   * Get integration metrics
   */
  getMetrics() {
    const pipelineMetrics = this.dataPipeline.getMetrics();
    
    return {
      ...pipelineMetrics,
      integration: {
        initialized: this.initialized,
        serviceConnections: this.serviceConnections.size,
        orchestrationConnected: !!this.orchestrationEngine,
        alertsConfigured: this.dataPipeline.alertThresholds.size
      }
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Data Pipeline Integration shutting down...');
    
    if (this.dataPipeline) {
      await this.dataPipeline.shutdown();
    }
    
    this.serviceConnections.clear();
    this.initialized = false;
    
    console.log('✅ Data Pipeline Integration shutdown complete');
  }
}

export default PipelineIntegration;