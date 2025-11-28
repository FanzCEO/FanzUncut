// FANZ Enterprise Command Center Dashboard
// Comprehensive admin dashboard with real-time visibility into all services, performance metrics, and system health

import { EventEmitter } from 'events';

class EnterpriseCommandCenter extends EventEmitter {
  constructor(orchestrationEngine = null, pipelineIntegration = null) {
    super();
    this.orchestrationEngine = orchestrationEngine;
    this.pipelineIntegration = pipelineIntegration;
    this.dashboardMetrics = new Map();
    this.alertHistory = [];
    this.serviceStatus = new Map();
    this.performanceHistory = [];
    this.realTimeConnections = new Set();
    this.initialized = false;
    
    // Dashboard configuration
    this.config = {
      updateInterval: 5000, // 5 seconds
      historyRetention: 24 * 60 * 60 * 1000, // 24 hours
      alertRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
      performanceWindowSize: 100, // Keep last 100 data points
      criticalThresholds: {
        errorRate: 0.05, // 5%
        responseTime: 1000, // 1 second
        cpuUsage: 80, // 80%
        memoryUsage: 85, // 85%
        diskUsage: 90 // 90%
      }
    };
    
    this.updateTimer = null;
    this.startTime = Date.now();
  }

  /**
   * Initialize the Enterprise Command Center
   */
  async initialize() {
    if (this.initialized) {
      console.log('🏢 Enterprise Command Center already initialized');
      return this;
    }

    console.log('🏢 Initializing FANZ Enterprise Command Center...');

    try {
      // Setup data collection from pipeline integration
      if (this.pipelineIntegration) {
        await this.setupPipelineIntegration();
      }

      // Setup orchestration monitoring
      if (this.orchestrationEngine) {
        await this.setupOrchestrationMonitoring();
      }

      // Initialize dashboard metrics
      await this.initializeDashboardMetrics();

      // Setup real-time updates
      this.startRealTimeUpdates();

      // Setup alert processing
      this.setupAlertProcessing();

      this.initialized = true;
      console.log('✅ Enterprise Command Center initialized successfully');
      
      this.emit('initialized', {
        timestamp: new Date(),
        services: this.serviceStatus.size,
        metrics: this.dashboardMetrics.size
      });
      
      return this;
    } catch (error) {
      console.error('❌ Enterprise Command Center initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup integration with data pipeline
   */
  async setupPipelineIntegration() {
    if (!this.pipelineIntegration || !this.pipelineIntegration.initialized) {
      console.warn('Pipeline integration not available for Command Center');
      return;
    }

    console.log('🔗 Setting up pipeline integration for Command Center...');

    const dataPipeline = this.pipelineIntegration.getDataPipeline();

    // Subscribe to real-time updates
    dataPipeline.on('realTimeUpdate', (data) => {
      this.handleRealTimeUpdate(data);
    });

    // Subscribe to processed data
    dataPipeline.on('processedData', (data) => {
      this.handleProcessedData(data);
    });

    // Subscribe to alerts
    dataPipeline.on('alertTriggered', (alert) => {
      this.handleAlert(alert);
    });

    // Subscribe to stream registration events
    dataPipeline.on('streamRegistered', (stream) => {
      this.updateServiceStatus(stream.source, 'active', {
        stream: stream.name,
        type: stream.type,
        realTime: stream.realTime
      });
    });

    console.log('✅ Pipeline integration setup complete');
  }

  /**
   * Setup orchestration engine monitoring
   */
  async setupOrchestrationMonitoring() {
    if (!this.orchestrationEngine) {
      console.warn('Orchestration engine not available for Command Center');
      return;
    }

    console.log('⚙️ Setting up orchestration monitoring...');

    // Listen for workflow events
    this.orchestrationEngine.on('workflowStarted', (data) => {
      this.updateDashboardMetric('workflows.active', 1, 'increment');
      this.emit('workflowEvent', { type: 'started', ...data });
    });

    this.orchestrationEngine.on('workflowCompleted', (data) => {
      this.updateDashboardMetric('workflows.active', 1, 'decrement');
      this.updateDashboardMetric('workflows.completed', 1, 'increment');
      this.emit('workflowEvent', { type: 'completed', ...data });
    });

    this.orchestrationEngine.on('workflowFailed', (data) => {
      this.updateDashboardMetric('workflows.active', 1, 'decrement');
      this.updateDashboardMetric('workflows.failed', 1, 'increment');
      this.emit('workflowEvent', { type: 'failed', ...data });
      
      this.handleAlert({
        type: 'workflow_failure',
        severity: 'high',
        message: `Workflow ${data.workflowName} failed: ${data.error}`,
        timestamp: new Date(),
        data
      });
    });

    // Listen for service health updates
    this.orchestrationEngine.on('serviceHealthUpdate', (data) => {
      this.updateServiceStatus(data.serviceName, data.healthy ? 'healthy' : 'unhealthy', data);
    });

    console.log('✅ Orchestration monitoring setup complete');
  }

  /**
   * Initialize dashboard metrics with default values
   */
  async initializeDashboardMetrics() {
    console.log('📊 Initializing dashboard metrics...');

    const defaultMetrics = {
      // System metrics
      'system.uptime': Date.now() - this.startTime,
      'system.services.total': 0,
      'system.services.healthy': 0,
      'system.services.unhealthy': 0,
      'system.cpu': 0,
      'system.memory': 0,
      'system.disk': 0,
      
      // Workflow metrics
      'workflows.total': 0,
      'workflows.active': 0,
      'workflows.completed': 0,
      'workflows.failed': 0,
      
      // Pipeline metrics
      'pipeline.streams': 0,
      'pipeline.events.total': 0,
      'pipeline.events.processed': 0,
      'pipeline.events.failed': 0,
      
      // Business metrics
      'business.revenue.total': 0,
      'business.revenue.24h': 0,
      'business.users.active': 0,
      'business.users.total': 0,
      'business.content.uploads.24h': 0,
      'business.streams.active': 0,
      
      // Performance metrics
      'performance.response_time.avg': 0,
      'performance.error_rate': 0,
      'performance.throughput': 0,
      
      // Alert metrics
      'alerts.active': 0,
      'alerts.critical': 0,
      'alerts.high': 0,
      'alerts.medium': 0,
      'alerts.low': 0
    };

    for (const [key, value] of Object.entries(defaultMetrics)) {
      this.dashboardMetrics.set(key, {
        value,
        lastUpdated: new Date(),
        history: []
      });
    }

    console.log('✅ Dashboard metrics initialized');
  }

  /**
   * Start real-time updates
   */
  startRealTimeUpdates() {
    console.log('⚡ Starting real-time updates...');

    this.updateTimer = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
        await this.updatePerformanceHistory();
        this.cleanupHistory();
        this.broadcastUpdate();
      } catch (error) {
        console.error('Error during real-time update:', error);
      }
    }, this.config.updateInterval);

    console.log(`✅ Real-time updates started (${this.config.updateInterval}ms interval)`);
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    // System uptime
    this.updateDashboardMetric('system.uptime', Date.now() - this.startTime);

    // Node.js memory usage
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    this.updateDashboardMetric('system.memory', memPercent);

    // CPU usage (approximation)
    const usage = process.cpuUsage();
    const cpuPercent = Math.min((usage.user + usage.system) / 1000000, 100);
    this.updateDashboardMetric('system.cpu', cpuPercent);

    // Service status counts
    let healthyCount = 0;
    let unhealthyCount = 0;
    
    for (const [serviceName, status] of this.serviceStatus.entries()) {
      if (status.status === 'healthy' || status.status === 'active') {
        healthyCount++;
      } else {
        unhealthyCount++;
      }
    }

    this.updateDashboardMetric('system.services.total', this.serviceStatus.size);
    this.updateDashboardMetric('system.services.healthy', healthyCount);
    this.updateDashboardMetric('system.services.unhealthy', unhealthyCount);

    // Pipeline metrics
    if (this.pipelineIntegration && this.pipelineIntegration.initialized) {
      const pipelineMetrics = this.pipelineIntegration.getMetrics();
      this.updateDashboardMetric('pipeline.streams', pipelineMetrics.streams?.size || 0);
      
      if (pipelineMetrics.events) {
        this.updateDashboardMetric('pipeline.events.total', pipelineMetrics.events.total || 0);
        this.updateDashboardMetric('pipeline.events.processed', pipelineMetrics.events.processed || 0);
        this.updateDashboardMetric('pipeline.events.failed', pipelineMetrics.events.failed || 0);
      }
    }

    // Orchestration metrics
    if (this.orchestrationEngine) {
      const orchMetrics = this.orchestrationEngine.getMetrics();
      this.updateDashboardMetric('workflows.total', orchMetrics.workflows?.total || 0);
    }
  }

  /**
   * Update performance history for charting
   */
  async updatePerformanceHistory() {
    const now = new Date();
    const performancePoint = {
      timestamp: now,
      cpu: this.dashboardMetrics.get('system.cpu')?.value || 0,
      memory: this.dashboardMetrics.get('system.memory')?.value || 0,
      responseTime: this.dashboardMetrics.get('performance.response_time.avg')?.value || 0,
      errorRate: this.dashboardMetrics.get('performance.error_rate')?.value || 0,
      throughput: this.dashboardMetrics.get('performance.throughput')?.value || 0
    };

    this.performanceHistory.push(performancePoint);

    // Keep only recent history
    if (this.performanceHistory.length > this.config.performanceWindowSize) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Handle real-time updates from pipeline
   */
  handleRealTimeUpdate(data) {
    const { streamName, currentValue, trend, timestamp } = data;
    
    // Update relevant dashboard metrics
    switch (streamName) {
      case 'revenue_optimization':
        this.updateDashboardMetric('business.revenue.24h', currentValue);
        break;
      case 'user_activity':
        this.updateDashboardMetric('business.users.active', currentValue);
        break;
      case 'system_performance':
        if (data.responseTime) {
          this.updateDashboardMetric('performance.response_time.avg', data.responseTime);
        }
        if (data.errorRate) {
          this.updateDashboardMetric('performance.error_rate', data.errorRate);
        }
        break;
    }

    // Emit to connected dashboards
    this.emit('realTimeUpdate', {
      stream: streamName,
      value: currentValue,
      trend,
      timestamp,
      metric: this.getMetricForStream(streamName)
    });
  }

  /**
   * Handle processed data from pipeline
   */
  handleProcessedData(data) {
    const { streamName, data: processedData, sourceStream } = data;

    // Update business metrics based on processed data
    switch (streamName) {
      case 'revenue_insights':
        if (processedData.totalRevenue) {
          this.updateDashboardMetric('business.revenue.total', processedData.totalRevenue);
        }
        break;
      case 'user_behavior':
        if (processedData.sessionData) {
          this.updateDashboardMetric('business.users.total', Object.keys(processedData.sessionData).length);
        }
        break;
      case 'content_performance':
        if (processedData.contentInteractions) {
          this.updateDashboardMetric('business.content.uploads.24h', Object.keys(processedData.contentInteractions).length);
        }
        break;
    }

    this.emit('dataProcessed', {
      stream: streamName,
      sourceStream,
      data: processedData,
      timestamp: new Date()
    });
  }

  /**
   * Handle alerts from various sources
   */
  handleAlert(alert) {
    const alertRecord = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alert,
      timestamp: alert.timestamp || new Date(),
      acknowledged: false
    };

    this.alertHistory.push(alertRecord);

    // Update alert counters
    this.updateDashboardMetric('alerts.active', 1, 'increment');
    this.updateDashboardMetric(`alerts.${alert.severity}`, 1, 'increment');

    // Emit to connected dashboards
    this.emit('alertReceived', alertRecord);

    console.log(`🚨 Alert received: [${alert.severity}] ${alert.message}`);

    // Auto-escalate critical alerts
    if (alert.severity === 'critical') {
      this.escalateCriticalAlert(alertRecord);
    }
  }

  /**
   * Setup alert processing and management
   */
  setupAlertProcessing() {
    console.log('🚨 Setting up alert processing...');

    // Process performance-based alerts
    setInterval(() => {
      this.checkPerformanceThresholds();
    }, 30000); // Check every 30 seconds

    console.log('✅ Alert processing setup complete');
  }

  /**
   * Check performance thresholds and trigger alerts
   */
  checkPerformanceThresholds() {
    const thresholds = this.config.criticalThresholds;

    // Check error rate
    const errorRate = this.dashboardMetrics.get('performance.error_rate')?.value || 0;
    if (errorRate > thresholds.errorRate) {
      this.handleAlert({
        type: 'performance_degradation',
        severity: 'high',
        message: `Error rate (${(errorRate * 100).toFixed(2)}%) exceeds threshold (${(thresholds.errorRate * 100).toFixed(2)}%)`,
        data: { errorRate, threshold: thresholds.errorRate }
      });
    }

    // Check response time
    const responseTime = this.dashboardMetrics.get('performance.response_time.avg')?.value || 0;
    if (responseTime > thresholds.responseTime) {
      this.handleAlert({
        type: 'slow_response',
        severity: 'medium',
        message: `Average response time (${responseTime}ms) exceeds threshold (${thresholds.responseTime}ms)`,
        data: { responseTime, threshold: thresholds.responseTime }
      });
    }

    // Check CPU usage
    const cpuUsage = this.dashboardMetrics.get('system.cpu')?.value || 0;
    if (cpuUsage > thresholds.cpuUsage) {
      this.handleAlert({
        type: 'high_cpu',
        severity: 'medium',
        message: `CPU usage (${cpuUsage.toFixed(2)}%) exceeds threshold (${thresholds.cpuUsage}%)`,
        data: { cpuUsage, threshold: thresholds.cpuUsage }
      });
    }

    // Check memory usage
    const memoryUsage = this.dashboardMetrics.get('system.memory')?.value || 0;
    if (memoryUsage > thresholds.memoryUsage) {
      this.handleAlert({
        type: 'high_memory',
        severity: 'high',
        message: `Memory usage (${memoryUsage.toFixed(2)}%) exceeds threshold (${thresholds.memoryUsage}%)`,
        data: { memoryUsage, threshold: thresholds.memoryUsage }
      });
    }
  }

  /**
   * Escalate critical alerts
   */
  escalateCriticalAlert(alert) {
    console.log(`🚨 CRITICAL ALERT ESCALATION: ${alert.message}`);
    
    // In a real system, this would:
    // - Send notifications to operations team
    // - Trigger automated remediation if available
    // - Create incident tickets
    // - Send SMS/email to on-call engineers
    
    this.emit('criticalAlertEscalated', {
      alert,
      escalatedAt: new Date(),
      escalationLevel: 1
    });
  }

  /**
   * Update dashboard metric
   */
  updateDashboardMetric(key, value, operation = 'set') {
    const existing = this.dashboardMetrics.get(key) || { value: 0, history: [] };
    
    let newValue;
    switch (operation) {
      case 'increment':
        newValue = existing.value + value;
        break;
      case 'decrement':
        newValue = Math.max(0, existing.value - value);
        break;
      case 'set':
      default:
        newValue = value;
        break;
    }

    // Add to history for trend analysis
    existing.history.push({
      value: newValue,
      timestamp: new Date()
    });

    // Keep history within limits
    if (existing.history.length > 100) {
      existing.history.shift();
    }

    this.dashboardMetrics.set(key, {
      value: newValue,
      lastUpdated: new Date(),
      history: existing.history
    });
  }

  /**
   * Update service status
   */
  updateServiceStatus(serviceName, status, metadata = {}) {
    this.serviceStatus.set(serviceName, {
      status,
      lastUpdate: new Date(),
      metadata
    });

    this.emit('serviceStatusUpdate', {
      serviceName,
      status,
      metadata,
      timestamp: new Date()
    });
  }

  /**
   * Get metric mapping for stream names
   */
  getMetricForStream(streamName) {
    const mapping = {
      'revenue_optimization': 'business.revenue.24h',
      'user_activity': 'business.users.active',
      'system_performance': 'performance.response_time.avg',
      'content_metrics': 'business.content.uploads.24h'
    };
    return mapping[streamName] || null;
  }

  /**
   * Broadcast update to all connected dashboards
   */
  broadcastUpdate() {
    const update = {
      timestamp: new Date(),
      metrics: this.getMetricsSummary(),
      services: this.getServicesSummary(),
      alerts: this.getActiveAlerts(),
      performance: this.getPerformanceSummary()
    };

    this.emit('dashboardUpdate', update);
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const summary = {};
    for (const [key, metric] of this.dashboardMetrics.entries()) {
      summary[key] = {
        value: metric.value,
        lastUpdated: metric.lastUpdated,
        trend: this.calculateTrend(metric.history)
      };
    }
    return summary;
  }

  /**
   * Get services summary
   */
  getServicesSummary() {
    const summary = {
      total: this.serviceStatus.size,
      healthy: 0,
      unhealthy: 0,
      services: []
    };

    for (const [serviceName, status] of this.serviceStatus.entries()) {
      if (status.status === 'healthy' || status.status === 'active') {
        summary.healthy++;
      } else {
        summary.unhealthy++;
      }

      summary.services.push({
        name: serviceName,
        status: status.status,
        lastUpdate: status.lastUpdate,
        metadata: status.metadata
      });
    }

    return summary;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return this.alertHistory
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => {
        const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      })
      .slice(0, 50); // Return top 50 active alerts
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    if (this.performanceHistory.length === 0) {
      return null;
    }

    const recent = this.performanceHistory.slice(-10); // Last 10 points
    const avg = (arr) => arr.reduce((sum, val) => sum + val, 0) / arr.length;

    return {
      current: this.performanceHistory[this.performanceHistory.length - 1],
      averages: {
        cpu: avg(recent.map(p => p.cpu)),
        memory: avg(recent.map(p => p.memory)),
        responseTime: avg(recent.map(p => p.responseTime)),
        errorRate: avg(recent.map(p => p.errorRate)),
        throughput: avg(recent.map(p => p.throughput))
      },
      history: this.performanceHistory
    };
  }

  /**
   * Calculate trend for metric history
   */
  calculateTrend(history) {
    if (history.length < 2) return 'stable';

    const recent = history.slice(-5); // Last 5 points
    const older = history.slice(-10, -5); // Previous 5 points

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, item) => sum + item.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.value, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId, acknowledgedBy, notes = '') {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();
    alert.notes = notes;

    // Update alert counters
    this.updateDashboardMetric('alerts.active', 1, 'decrement');
    this.updateDashboardMetric(`alerts.${alert.severity}`, 1, 'decrement');

    this.emit('alertAcknowledged', alert);
    return true;
  }

  /**
   * Clean up old history data
   */
  cleanupHistory() {
    const cutoff = Date.now() - this.config.historyRetention;

    // Clean up alert history
    this.alertHistory = this.alertHistory.filter(alert => 
      alert.timestamp.getTime() > cutoff || !alert.acknowledged
    );

    // Clean up performance history
    this.performanceHistory = this.performanceHistory.filter(point => 
      point.timestamp.getTime() > cutoff
    );
  }

  /**
   * Add real-time connection
   */
  addRealTimeConnection(connectionId) {
    this.realTimeConnections.add(connectionId);
    console.log(`📡 Real-time connection added: ${connectionId} (${this.realTimeConnections.size} total)`);
  }

  /**
   * Remove real-time connection
   */
  removeRealTimeConnection(connectionId) {
    this.realTimeConnections.delete(connectionId);
    console.log(`📡 Real-time connection removed: ${connectionId} (${this.realTimeConnections.size} total)`);
  }

  /**
   * Get comprehensive dashboard data
   */
  getDashboardData() {
    return {
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      metrics: this.getMetricsSummary(),
      services: this.getServicesSummary(),
      alerts: {
        active: this.getActiveAlerts(),
        total: this.alertHistory.length,
        summary: {
          critical: this.alertHistory.filter(a => a.severity === 'critical' && !a.acknowledged).length,
          high: this.alertHistory.filter(a => a.severity === 'high' && !a.acknowledged).length,
          medium: this.alertHistory.filter(a => a.severity === 'medium' && !a.acknowledged).length,
          low: this.alertHistory.filter(a => a.severity === 'low' && !a.acknowledged).length
        }
      },
      performance: this.getPerformanceSummary(),
      realTimeConnections: this.realTimeConnections.size,
      configuration: {
        updateInterval: this.config.updateInterval,
        criticalThresholds: this.config.criticalThresholds
      }
    };
  }

  /**
   * Get historical data for a specific metric
   */
  getMetricHistory(metricKey, timeRange = '24h') {
    const metric = this.dashboardMetrics.get(metricKey);
    if (!metric || !metric.history) return [];

    const now = Date.now();
    let cutoff;

    switch (timeRange) {
      case '1h':
        cutoff = now - (60 * 60 * 1000);
        break;
      case '6h':
        cutoff = now - (6 * 60 * 60 * 1000);
        break;
      case '24h':
        cutoff = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoff = now - (7 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoff = now - (24 * 60 * 60 * 1000);
    }

    return metric.history.filter(point => point.timestamp.getTime() > cutoff);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Enterprise Command Center shutting down...');

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    this.realTimeConnections.clear();
    this.initialized = false;

    this.emit('shutdown', {
      timestamp: new Date(),
      uptime: Date.now() - this.startTime
    });

    console.log('✅ Enterprise Command Center shutdown complete');
  }
}

export default EnterpriseCommandCenter;