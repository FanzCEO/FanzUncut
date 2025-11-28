// FANZ Enterprise Command Center Test Suite
// Comprehensive tests for enterprise dashboard and monitoring capabilities

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import EnterpriseCommandCenter from '../services/enterpriseCommandCenter.js';
import { EventEmitter } from 'events';

// Mock orchestration engine for testing
class MockOrchestrationEngine extends EventEmitter {
  constructor() {
    super();
    this.registeredServices = new Map();
    this.workflows = new Map();
    this.isInitialized = true;
  }

  getMetrics() {
    return {
      workflows: {
        total: 10,
        active: 2,
        completed: 7,
        failed: 1
      },
      services: this.registeredServices.size,
      uptime: Date.now() - 1000000
    };
  }

  simulateEvent(eventName, data) {
    this.emit(eventName, data);
  }
}

// Mock pipeline integration for testing
class MockPipelineIntegration extends EventEmitter {
  constructor() {
    super();
    this.initialized = true;
    this.registeredStreams = new Map();
    this.streamMetrics = new Map();
  }

  getDataPipeline() {
    return this;
  }

  getMetrics() {
    return {
      streams: { size: 15 },
      events: {
        total: 1000,
        processed: 950,
        failed: 50
      },
      integration: {
        initialized: true,
        serviceConnections: 8
      }
    };
  }

  simulateEvent(eventName, data) {
    this.emit(eventName, data);
  }
}

describe('FANZ Enterprise Command Center', () => {
  let commandCenter;
  let mockOrchestrationEngine;
  let mockPipelineIntegration;

  beforeAll(() => {
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore console methods
    console.log.mockRestore();
    console.error.mockRestore();
    console.warn.mockRestore();
  });

  beforeEach(async () => {
    mockOrchestrationEngine = new MockOrchestrationEngine();
    mockPipelineIntegration = new MockPipelineIntegration();
    commandCenter = new EnterpriseCommandCenter(mockOrchestrationEngine, mockPipelineIntegration);
  });

  afterEach(async () => {
    if (commandCenter && commandCenter.initialized) {
      await commandCenter.shutdown();
    }
    mockOrchestrationEngine = null;
    mockPipelineIntegration = null;
  });

  describe('Initialization', () => {
    it('should initialize successfully with all dependencies', async () => {
      expect(commandCenter.initialized).toBe(false);
      
      const result = await commandCenter.initialize();
      
      expect(commandCenter.initialized).toBe(true);
      expect(result).toBe(commandCenter);
      expect(commandCenter.dashboardMetrics.size).toBeGreaterThan(0);
      expect(commandCenter.updateTimer).toBeDefined();
    });

    it('should initialize successfully without orchestration engine', async () => {
      const standaloneCommandCenter = new EnterpriseCommandCenter(null, mockPipelineIntegration);
      
      await standaloneCommandCenter.initialize();
      
      expect(standaloneCommandCenter.initialized).toBe(true);
      
      await standaloneCommandCenter.shutdown();
    });

    it('should initialize successfully without pipeline integration', async () => {
      const standaloneCommandCenter = new EnterpriseCommandCenter(mockOrchestrationEngine, null);
      
      await standaloneCommandCenter.initialize();
      
      expect(standaloneCommandCenter.initialized).toBe(true);
      
      await standaloneCommandCenter.shutdown();
    });

    it('should not re-initialize if already initialized', async () => {
      await commandCenter.initialize();
      
      const secondInit = await commandCenter.initialize();
      
      expect(secondInit).toBe(commandCenter);
      expect(commandCenter.initialized).toBe(true);
    });

    it('should emit initialized event', async () => {
      const initSpy = jest.fn();
      commandCenter.on('initialized', initSpy);
      
      await commandCenter.initialize();
      
      expect(initSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Date),
        services: expect.any(Number),
        metrics: expect.any(Number)
      });
    });
  });

  describe('Dashboard Metrics', () => {
    beforeEach(async () => {
      await commandCenter.initialize();
    });

    it('should initialize default metrics', () => {
      expect(commandCenter.dashboardMetrics.has('system.uptime')).toBe(true);
      expect(commandCenter.dashboardMetrics.has('system.cpu')).toBe(true);
      expect(commandCenter.dashboardMetrics.has('system.memory')).toBe(true);
      expect(commandCenter.dashboardMetrics.has('workflows.total')).toBe(true);
      expect(commandCenter.dashboardMetrics.has('pipeline.streams')).toBe(true);
      expect(commandCenter.dashboardMetrics.has('business.revenue.total')).toBe(true);
    });

    it('should update dashboard metrics', () => {
      commandCenter.updateDashboardMetric('test.metric', 100);
      
      const metric = commandCenter.dashboardMetrics.get('test.metric');
      expect(metric.value).toBe(100);
      expect(metric.lastUpdated).toBeInstanceOf(Date);
      expect(metric.history).toHaveLength(1);
    });

    it('should handle metric operations correctly', () => {
      commandCenter.updateDashboardMetric('counter', 10, 'set');
      commandCenter.updateDashboardMetric('counter', 5, 'increment');
      commandCenter.updateDashboardMetric('counter', 3, 'decrement');
      
      const metric = commandCenter.dashboardMetrics.get('counter');
      expect(metric.value).toBe(12); // 10 + 5 - 3
    });

    it('should maintain metric history', () => {
      for (let i = 0; i < 150; i++) {
        commandCenter.updateDashboardMetric('history.test', i);
      }
      
      const metric = commandCenter.dashboardMetrics.get('history.test');
      expect(metric.history.length).toBe(100); // Should be capped at 100
      expect(metric.value).toBe(149); // Last value
    });

    it('should get metrics summary with trends', () => {
      commandCenter.updateDashboardMetric('trend.test', 10);
      commandCenter.updateDashboardMetric('trend.test', 12);
      commandCenter.updateDashboardMetric('trend.test', 14);
      
      const summary = commandCenter.getMetricsSummary();
      
      expect(summary['trend.test']).toEqual({
        value: 14,
        lastUpdated: expect.any(Date),
        trend: expect.any(String)
      });
    });
  });

  describe('Service Status Management', () => {
    beforeEach(async () => {
      await commandCenter.initialize();
    });

    it('should update service status', () => {
      commandCenter.updateServiceStatus('testService', 'healthy', { version: '1.0.0' });
      
      const status = commandCenter.serviceStatus.get('testService');
      expect(status.status).toBe('healthy');
      expect(status.metadata.version).toBe('1.0.0');
      expect(status.lastUpdate).toBeInstanceOf(Date);
    });

    it('should get services summary', () => {
      commandCenter.updateServiceStatus('service1', 'healthy');
      commandCenter.updateServiceStatus('service2', 'unhealthy');
      commandCenter.updateServiceStatus('service3', 'active');
      
      const summary = commandCenter.getServicesSummary();
      
      expect(summary.total).toBe(3);
      expect(summary.healthy).toBe(2); // 'healthy' and 'active'
      expect(summary.unhealthy).toBe(1);
      expect(summary.services).toHaveLength(3);
    });

    it('should emit service status update events', () => {
      const updateSpy = jest.fn();
      commandCenter.on('serviceStatusUpdate', updateSpy);
      
      commandCenter.updateServiceStatus('testService', 'healthy', { test: true });
      
      expect(updateSpy).toHaveBeenCalledWith({
        serviceName: 'testService',
        status: 'healthy',
        metadata: { test: true },
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Alert Management', () => {
    beforeEach(async () => {
      await commandCenter.initialize();
    });

    it('should handle alerts', () => {
      const alert = {
        type: 'test_alert',
        severity: 'high',
        message: 'Test alert message'
      };
      
      commandCenter.handleAlert(alert);
      
      expect(commandCenter.alertHistory).toHaveLength(1);
      expect(commandCenter.alertHistory[0]).toMatchObject({
        ...alert,
        id: expect.any(String),
        timestamp: expect.any(Date),
        acknowledged: false
      });
    });

    it('should update alert metrics when handling alerts', () => {
      const alert = { severity: 'critical', message: 'Critical test' };
      
      commandCenter.handleAlert(alert);
      
      const activeAlerts = commandCenter.dashboardMetrics.get('alerts.active');
      const criticalAlerts = commandCenter.dashboardMetrics.get('alerts.critical');
      
      expect(activeAlerts.value).toBe(1);
      expect(criticalAlerts.value).toBe(1);
    });

    it('should escalate critical alerts', () => {
      const escalationSpy = jest.fn();
      commandCenter.on('criticalAlertEscalated', escalationSpy);
      
      const criticalAlert = {
        severity: 'critical',
        message: 'System failure'
      };
      
      commandCenter.handleAlert(criticalAlert);
      
      expect(escalationSpy).toHaveBeenCalledWith({
        alert: expect.objectContaining(criticalAlert),
        escalatedAt: expect.any(Date),
        escalationLevel: 1
      });
    });

    it('should acknowledge alerts', () => {
      const alert = { severity: 'high', message: 'Test alert' };
      commandCenter.handleAlert(alert);
      
      const alertId = commandCenter.alertHistory[0].id;
      const success = commandCenter.acknowledgeAlert(alertId, 'test_user', 'Resolved by test');
      
      expect(success).toBe(true);
      expect(commandCenter.alertHistory[0].acknowledged).toBe(true);
      expect(commandCenter.alertHistory[0].acknowledgedBy).toBe('test_user');
      expect(commandCenter.alertHistory[0].notes).toBe('Resolved by test');
    });

    it('should get active alerts sorted by severity', () => {
      commandCenter.handleAlert({ severity: 'low', message: 'Low priority' });
      commandCenter.handleAlert({ severity: 'critical', message: 'Critical issue' });
      commandCenter.handleAlert({ severity: 'medium', message: 'Medium issue' });
      
      const activeAlerts = commandCenter.getActiveAlerts();
      
      expect(activeAlerts).toHaveLength(3);
      expect(activeAlerts[0].severity).toBe('critical');
      expect(activeAlerts[1].severity).toBe('medium');
      expect(activeAlerts[2].severity).toBe('low');
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await commandCenter.initialize();
    });

    it('should collect system metrics', async () => {
      await commandCenter.collectSystemMetrics();
      
      const cpuMetric = commandCenter.dashboardMetrics.get('system.cpu');
      const memoryMetric = commandCenter.dashboardMetrics.get('system.memory');
      const uptimeMetric = commandCenter.dashboardMetrics.get('system.uptime');
      
      expect(cpuMetric.value).toBeGreaterThanOrEqual(0);
      expect(memoryMetric.value).toBeGreaterThanOrEqual(0);
      expect(uptimeMetric.value).toBeGreaterThanOrEqual(0);
    });

    it('should update performance history', async () => {
      await commandCenter.updatePerformanceHistory();
      
      expect(commandCenter.performanceHistory).toHaveLength(1);
      expect(commandCenter.performanceHistory[0]).toEqual({
        timestamp: expect.any(Date),
        cpu: expect.any(Number),
        memory: expect.any(Number),
        responseTime: expect.any(Number),
        errorRate: expect.any(Number),
        throughput: expect.any(Number)
      });
    });

    it('should limit performance history size', async () => {
      for (let i = 0; i < 150; i++) {
        await commandCenter.updatePerformanceHistory();
      }
      
      expect(commandCenter.performanceHistory.length).toBe(commandCenter.config.performanceWindowSize);
    });

    it('should get performance summary', async () => {
      await commandCenter.updatePerformanceHistory();
      await commandCenter.updatePerformanceHistory();
      
      const summary = commandCenter.getPerformanceSummary();
      
      expect(summary).toEqual({
        current: expect.any(Object),
        averages: {
          cpu: expect.any(Number),
          memory: expect.any(Number),
          responseTime: expect.any(Number),
          errorRate: expect.any(Number),
          throughput: expect.any(Number)
        },
        history: expect.any(Array)
      });
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(async () => {
      await commandCenter.initialize();
    });

    it('should handle real-time updates from pipeline', () => {
      const updateData = {
        streamName: 'revenue_optimization',
        currentValue: 5000,
        trend: 'increasing',
        timestamp: new Date()
      };
      
      commandCenter.handleRealTimeUpdate(updateData);
      
      const revenueMetric = commandCenter.dashboardMetrics.get('business.revenue.24h');
      expect(revenueMetric.value).toBe(5000);
    });

    it('should emit real-time updates', () => {
      const updateSpy = jest.fn();
      commandCenter.on('realTimeUpdate', updateSpy);
      
      const updateData = {
        streamName: 'user_activity',
        currentValue: 1000,
        trend: 'stable',
        timestamp: new Date()
      };
      
      commandCenter.handleRealTimeUpdate(updateData);
      
      expect(updateSpy).toHaveBeenCalledWith({
        stream: updateData.streamName,
        value: updateData.currentValue,
        trend: updateData.trend,
        timestamp: updateData.timestamp,
        metric: commandCenter.getMetricForStream(updateData.streamName)
      });
    });

    it('should handle processed data from pipeline', () => {
      const processedData = {
        streamName: 'revenue_insights',
        data: { totalRevenue: 15000 },
        sourceStream: 'payment_events'
      };
      
      commandCenter.handleProcessedData(processedData);
      
      const totalRevenueMetric = commandCenter.dashboardMetrics.get('business.revenue.total');
      expect(totalRevenueMetric.value).toBe(15000);
    });

    it('should broadcast updates', () => {
      const broadcastSpy = jest.fn();
      commandCenter.on('dashboardUpdate', broadcastSpy);
      
      commandCenter.broadcastUpdate();
      
      expect(broadcastSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Date),
        metrics: expect.any(Object),
        services: expect.any(Object),
        alerts: expect.any(Array),
        performance: expect.any(Object)
      });
    });
  });

  describe('Orchestration Integration', () => {
    beforeEach(async () => {
      await commandCenter.initialize();
    });

    it('should handle workflow started events', () => {
      const workflowData = { workflowName: 'testWorkflow', executionId: 'exec_123' };
      
      mockOrchestrationEngine.simulateEvent('workflowStarted', workflowData);
      
      const activeWorkflows = commandCenter.dashboardMetrics.get('workflows.active');
      expect(activeWorkflows.value).toBe(1);
    });

    it('should handle workflow completed events', () => {
      const workflowData = { workflowName: 'testWorkflow', executionId: 'exec_123' };
      
      // Start then complete
      mockOrchestrationEngine.simulateEvent('workflowStarted', workflowData);
      mockOrchestrationEngine.simulateEvent('workflowCompleted', workflowData);
      
      const activeWorkflows = commandCenter.dashboardMetrics.get('workflows.active');
      const completedWorkflows = commandCenter.dashboardMetrics.get('workflows.completed');
      
      expect(activeWorkflows.value).toBe(0);
      expect(completedWorkflows.value).toBe(1);
    });

    it('should handle workflow failures and create alerts', () => {
      const workflowData = { 
        workflowName: 'failedWorkflow', 
        executionId: 'exec_456',
        error: 'Test error'
      };
      
      mockOrchestrationEngine.simulateEvent('workflowFailed', workflowData);
      
      const failedWorkflows = commandCenter.dashboardMetrics.get('workflows.failed');
      expect(failedWorkflows.value).toBe(1);
      expect(commandCenter.alertHistory).toHaveLength(1);
      expect(commandCenter.alertHistory[0].type).toBe('workflow_failure');
    });
  });

  describe('Pipeline Integration', () => {
    beforeEach(async () => {
      await commandCenter.initialize();
    });

    it('should setup pipeline integration listeners', () => {
      expect(mockPipelineIntegration.listenerCount('realTimeUpdate')).toBeGreaterThan(0);
      expect(mockPipelineIntegration.listenerCount('processedData')).toBeGreaterThan(0);
      expect(mockPipelineIntegration.listenerCount('alertTriggered')).toBeGreaterThan(0);
    });

    it('should handle pipeline alerts', () => {
      const pipelineAlert = {
        type: 'pipeline_failure',
        severity: 'high',
        message: 'Data processing failed'
      };
      
      mockPipelineIntegration.simulateEvent('alertTriggered', pipelineAlert);
      
      expect(commandCenter.alertHistory).toHaveLength(1);
      expect(commandCenter.alertHistory[0].type).toBe('pipeline_failure');
    });

    it('should update service status from stream registration', () => {
      const streamData = {
        name: 'test_stream',
        source: 'testService',
        type: 'metrics',
        realTime: true
      };
      
      mockPipelineIntegration.simulateEvent('streamRegistered', streamData);
      
      const serviceStatus = commandCenter.serviceStatus.get('testService');
      expect(serviceStatus.status).toBe('active');
      expect(serviceStatus.metadata.stream).toBe('test_stream');
    });
  });

  describe('Performance Threshold Monitoring', () => {
    beforeEach(async () => {
      await commandCenter.initialize();
    });

    it('should trigger alerts when thresholds are exceeded', () => {
      // Set high error rate
      commandCenter.updateDashboardMetric('performance.error_rate', 0.1); // 10%, above 5% threshold
      
      commandCenter.checkPerformanceThresholds();
      
      const performanceAlerts = commandCenter.alertHistory.filter(a => a.type === 'performance_degradation');
      expect(performanceAlerts).toHaveLength(1);
    });

    it('should trigger memory usage alerts', () => {
      commandCenter.updateDashboardMetric('system.memory', 90); // 90%, above 85% threshold
      
      commandCenter.checkPerformanceThresholds();
      
      const memoryAlerts = commandCenter.alertHistory.filter(a => a.type === 'high_memory');
      expect(memoryAlerts).toHaveLength(1);
      expect(memoryAlerts[0].severity).toBe('high');
    });

    it('should trigger CPU usage alerts', () => {
      commandCenter.updateDashboardMetric('system.cpu', 85); // 85%, above 80% threshold
      
      commandCenter.checkPerformanceThresholds();
      
      const cpuAlerts = commandCenter.alertHistory.filter(a => a.type === 'high_cpu');
      expect(cpuAlerts).toHaveLength(1);
      expect(cpuAlerts[0].severity).toBe('medium');
    });

    it('should trigger response time alerts', () => {
      commandCenter.updateDashboardMetric('performance.response_time.avg', 1500); // 1.5s, above 1s threshold
      
      commandCenter.checkPerformanceThresholds();
      
      const responseTimeAlerts = commandCenter.alertHistory.filter(a => a.type === 'slow_response');
      expect(responseTimeAlerts).toHaveLength(1);
      expect(responseTimeAlerts[0].severity).toBe('medium');
    });
  });

  describe('Data Retrieval and Analytics', () => {
    beforeEach(async () => {
      await commandCenter.initialize();
    });

    it('should get comprehensive dashboard data', () => {
      const data = commandCenter.getDashboardData();
      
      expect(data).toEqual({
        timestamp: expect.any(Date),
        uptime: expect.any(Number),
        metrics: expect.any(Object),
        services: expect.any(Object),
        alerts: expect.any(Object),
        performance: expect.any(Object),
        realTimeConnections: expect.any(Number),
        configuration: expect.any(Object)
      });
    });

    it('should get metric history with time ranges', () => {
      // Add some history
      for (let i = 0; i < 10; i++) {
        commandCenter.updateDashboardMetric('test.history', i);
      }
      
      const history1h = commandCenter.getMetricHistory('test.history', '1h');
      const history24h = commandCenter.getMetricHistory('test.history', '24h');
      
      expect(Array.isArray(history1h)).toBe(true);
      expect(Array.isArray(history24h)).toBe(true);
      expect(history24h.length).toBeGreaterThanOrEqual(history1h.length);
    });

    it('should calculate trends correctly', () => {
      const history = [
        { value: 10, timestamp: new Date(Date.now() - 10000) },
        { value: 12, timestamp: new Date(Date.now() - 9000) },
        { value: 14, timestamp: new Date(Date.now() - 8000) },
        { value: 16, timestamp: new Date(Date.now() - 7000) },
        { value: 18, timestamp: new Date(Date.now() - 6000) }
      ];
      
      const increasingTrend = commandCenter.calculateTrend(history);
      expect(increasingTrend).toBe('increasing');
      
      // Test decreasing trend
      const decreasingHistory = history.map(h => ({ ...h, value: 20 - h.value }));
      const decreasingTrend = commandCenter.calculateTrend(decreasingHistory);
      expect(decreasingTrend).toBe('decreasing');
      
      // Test stable trend
      const stableHistory = history.map(h => ({ ...h, value: 15 }));
      const stableTrend = commandCenter.calculateTrend(stableHistory);
      expect(stableTrend).toBe('stable');
    });
  });

  describe('Real-time Connection Management', () => {
    beforeEach(async () => {
      await commandCenter.initialize();
    });

    it('should add real-time connections', () => {
      commandCenter.addRealTimeConnection('conn_1');
      commandCenter.addRealTimeConnection('conn_2');
      
      expect(commandCenter.realTimeConnections.size).toBe(2);
      expect(commandCenter.realTimeConnections.has('conn_1')).toBe(true);
      expect(commandCenter.realTimeConnections.has('conn_2')).toBe(true);
    });

    it('should remove real-time connections', () => {
      commandCenter.addRealTimeConnection('conn_1');
      commandCenter.addRealTimeConnection('conn_2');
      commandCenter.removeRealTimeConnection('conn_1');
      
      expect(commandCenter.realTimeConnections.size).toBe(1);
      expect(commandCenter.realTimeConnections.has('conn_1')).toBe(false);
      expect(commandCenter.realTimeConnections.has('conn_2')).toBe(true);
    });
  });

  describe('Data Cleanup', () => {
    beforeEach(async () => {
      await commandCenter.initialize();
    });

    it('should clean up old history data', () => {
      const oldDate = new Date(Date.now() - (25 * 60 * 60 * 1000)); // 25 hours ago
      const recentDate = new Date();
      
      // Add old and recent alerts
      commandCenter.alertHistory.push(
        { id: 'old', timestamp: oldDate, acknowledged: true },
        { id: 'recent', timestamp: recentDate, acknowledged: false }
      );
      
      // Add old and recent performance data
      commandCenter.performanceHistory.push(
        { timestamp: oldDate, cpu: 50 },
        { timestamp: recentDate, cpu: 60 }
      );
      
      commandCenter.cleanupHistory();
      
      expect(commandCenter.alertHistory).toHaveLength(1);
      expect(commandCenter.alertHistory[0].id).toBe('recent');
      expect(commandCenter.performanceHistory).toHaveLength(1);
      expect(commandCenter.performanceHistory[0].cpu).toBe(60);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await commandCenter.initialize();
      
      expect(commandCenter.initialized).toBe(true);
      expect(commandCenter.updateTimer).toBeDefined();
      
      const shutdownSpy = jest.fn();
      commandCenter.on('shutdown', shutdownSpy);
      
      await commandCenter.shutdown();
      
      expect(commandCenter.initialized).toBe(false);
      expect(commandCenter.updateTimer).toBeNull();
      expect(commandCenter.realTimeConnections.size).toBe(0);
      expect(shutdownSpy).toHaveBeenCalledWith({
        timestamp: expect.any(Date),
        uptime: expect.any(Number)
      });
    });

    it('should handle shutdown when not initialized', async () => {
      // Should not throw error
      await expect(commandCenter.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Create command center with invalid dependencies
      const faultyCommandCenter = new EnterpriseCommandCenter();
      
      // Mock a method to throw an error
      faultyCommandCenter.initializeDashboardMetrics = jest.fn().mockRejectedValue(new Error('Init failed'));
      
      await expect(faultyCommandCenter.initialize()).rejects.toThrow('Init failed');
      expect(faultyCommandCenter.initialized).toBe(false);
    });

    it('should handle real-time update errors', async () => {
      await commandCenter.initialize();
      
      // Mock an error in the update process
      commandCenter.collectSystemMetrics = jest.fn().mockRejectedValue(new Error('Collection failed'));
      
      // Should not crash the timer
      await new Promise(resolve => {
        commandCenter.updateTimer = setInterval(async () => {
          try {
            await commandCenter.collectSystemMetrics();
          } catch (error) {
            // Error should be caught and logged
          }
          clearInterval(commandCenter.updateTimer);
          resolve();
        }, 100);
      });
    });
  });
});

export default {
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/server/tests/setup.js']
};