// FANZ Pipeline Integration Test Suite
// Comprehensive tests for data pipeline integration and cross-service connections

import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import PipelineIntegration from '../pipeline/pipelineIntegration.js';
import ServiceOrchestrationEngine from '../orchestration/serviceOrchestrationEngine.js';
import { EventEmitter } from 'events';

// Mock orchestration engine for testing
class MockOrchestrationEngine extends EventEmitter {
  constructor() {
    super();
    this.registeredServices = new Map();
    this.workflows = new Map();
    this.isInitialized = true;
  }

  async executeWorkflow(name, context) {
    return {
      executionId: `exec_${Date.now()}`,
      workflowName: name,
      context,
      status: 'success',
      duration: 1000
    };
  }

  getMetrics() {
    return {
      services: this.registeredServices.size,
      workflows: this.workflows.size,
      uptime: Date.now() - 1000000
    };
  }

  simulateEvent(eventName, data) {
    this.emit(eventName, data);
  }
}

describe('FANZ Pipeline Integration', () => {
  let pipelineIntegration;
  let mockOrchestrationEngine;

  beforeAll(() => {
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore console methods
    console.log.mockRestore();
    console.error.mockRestore();
  });

  beforeEach(async () => {
    mockOrchestrationEngine = new MockOrchestrationEngine();
    pipelineIntegration = new PipelineIntegration(mockOrchestrationEngine);
  });

  afterEach(async () => {
    if (pipelineIntegration && pipelineIntegration.initialized) {
      await pipelineIntegration.shutdown();
    }
    mockOrchestrationEngine = null;
  });

  describe('Initialization', () => {
    it('should initialize successfully with orchestration engine', async () => {
      expect(pipelineIntegration.initialized).toBe(false);
      
      const dataPipeline = await pipelineIntegration.initialize();
      
      expect(pipelineIntegration.initialized).toBe(true);
      expect(dataPipeline).toBeDefined();
      expect(dataPipeline.registeredStreams.size).toBeGreaterThan(0);
    });

    it('should initialize successfully without orchestration engine', async () => {
      const standalonePipeline = new PipelineIntegration(null);
      
      const dataPipeline = await standalonePipeline.initialize();
      
      expect(standalonePipeline.initialized).toBe(true);
      expect(dataPipeline).toBeDefined();
      
      await standalonePipeline.shutdown();
    });

    it('should not re-initialize if already initialized', async () => {
      await pipelineIntegration.initialize();
      
      const secondInit = await pipelineIntegration.initialize();
      
      expect(secondInit).toBeDefined();
      expect(pipelineIntegration.initialized).toBe(true);
    });

    it('should register all required data streams', async () => {
      await pipelineIntegration.initialize();
      const dataPipeline = pipelineIntegration.getDataPipeline();
      
      // Check for core platform streams
      expect(dataPipeline.registeredStreams.has('user_activity')).toBe(true);
      expect(dataPipeline.registeredStreams.has('content_metrics')).toBe(true);
      expect(dataPipeline.registeredStreams.has('payment_events')).toBe(true);
      expect(dataPipeline.registeredStreams.has('streaming_metrics')).toBe(true);
      
      // Check for analytics streams
      expect(dataPipeline.registeredStreams.has('ai_insights')).toBe(true);
      expect(dataPipeline.registeredStreams.has('revenue_optimization')).toBe(true);
      
      // Check for business streams
      expect(dataPipeline.registeredStreams.has('creator_performance')).toBe(true);
      expect(dataPipeline.registeredStreams.has('subscription_analytics')).toBe(true);
      
      // Check for monitoring streams
      expect(dataPipeline.registeredStreams.has('system_performance')).toBe(true);
      expect(dataPipeline.registeredStreams.has('security_events')).toBe(true);
    });
  });

  describe('Data Ingestion', () => {
    beforeEach(async () => {
      await pipelineIntegration.initialize();
    });

    it('should ingest data into a registered stream', async () => {
      const testData = {
        userId: 'user_123',
        action: 'login',
        timestamp: new Date(),
        metadata: { ip: '192.168.1.1' }
      };

      const eventId = await pipelineIntegration.ingestData('user_activity', testData);
      
      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    });

    it('should handle invalid stream names gracefully', async () => {
      const testData = { test: 'data' };
      
      const eventId = await pipelineIntegration.ingestData('invalid_stream', testData);
      
      expect(eventId).toBeNull();
    });

    it('should add metadata to ingested data', async () => {
      const testData = { userId: 'user_123', action: 'view' };
      const customMetadata = { source: 'test', priority: 'high' };
      
      const eventId = await pipelineIntegration.ingestData('user_activity', testData, customMetadata);
      
      expect(eventId).toBeDefined();
    });
  });

  describe('Orchestration Engine Integration', () => {
    beforeEach(async () => {
      await pipelineIntegration.initialize();
    });

    it('should listen for orchestration engine events', async () => {
      const workflowData = {
        workflowName: 'testWorkflow',
        executionId: 'exec_123',
        duration: 5000
      };

      // Mock ingestion
      jest.spyOn(pipelineIntegration, 'ingestData').mockResolvedValue('event_123');

      mockOrchestrationEngine.simulateEvent('workflowStarted', workflowData);
      
      // Allow event to be processed
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(pipelineIntegration.ingestData).toHaveBeenCalledWith('workflow_events', {
        eventType: 'workflow_started',
        workflowName: workflowData.workflowName,
        executionId: workflowData.executionId,
        timestamp: expect.any(Date)
      });
    });

    it('should handle service failure events', async () => {
      const failureData = {
        serviceName: 'testService',
        error: new Error('Service failed')
      };

      jest.spyOn(pipelineIntegration, 'ingestData').mockResolvedValue('event_456');

      mockOrchestrationEngine.simulateEvent('serviceFailure', failureData);
      
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(pipelineIntegration.ingestData).toHaveBeenCalledWith('system_performance', {
        service: failureData.serviceName,
        errorRate: 1.0,
        error: failureData.error,
        timestamp: expect.any(Date)
      });
    });

    it('should trigger workflows based on data insights', async () => {
      const lowRevenueData = {
        totalRevenue: 3000, // Below threshold of 5000
        revenueByCreator: {},
        timestamp: new Date()
      };

      jest.spyOn(mockOrchestrationEngine, 'executeWorkflow').mockResolvedValue({ success: true });

      pipelineIntegration.handleRevenueInsights(lowRevenueData, 'revenue_stream');

      expect(mockOrchestrationEngine.executeWorkflow).toHaveBeenCalledWith('revenueOptimization', {
        trigger: 'low_revenue',
        currentRevenue: 3000,
        threshold: 5000
      });
    });
  });

  describe('Alert System', () => {
    beforeEach(async () => {
      await pipelineIntegration.initialize();
    });

    it('should configure alert thresholds', async () => {
      const dataPipeline = pipelineIntegration.getDataPipeline();
      
      expect(dataPipeline.alertThresholds.size).toBeGreaterThan(0);
      expect(dataPipeline.alertThresholds.has('totalRevenue')).toBe(true);
      expect(dataPipeline.alertThresholds.has('errorRate')).toBe(true);
    });

    it('should trigger alerts for critical metrics', async () => {
      jest.spyOn(pipelineIntegration, 'ingestData').mockResolvedValue('alert_123');

      pipelineIntegration.triggerAlert('high_error_rate', {
        source: 'test_source',
        errorTypes: ['timeout', 'connection'],
        count: 15
      });

      expect(pipelineIntegration.ingestData).toHaveBeenCalledWith('system_alerts', {
        alertType: 'high_error_rate',
        data: {
          source: 'test_source',
          errorTypes: ['timeout', 'connection'],
          count: 15
        },
        severity: 'critical',
        timestamp: expect.any(Date)
      });
    });

    it('should determine correct alert severity', () => {
      expect(pipelineIntegration.getAlertSeverity('revenue_decline')).toBe('high');
      expect(pipelineIntegration.getAlertSeverity('high_error_rate')).toBe('critical');
      expect(pipelineIntegration.getAlertSeverity('low_user_engagement')).toBe('medium');
      expect(pipelineIntegration.getAlertSeverity('unknown_type')).toBe('low');
    });
  });

  describe('Data Processing and Routing', () => {
    beforeEach(async () => {
      await pipelineIntegration.initialize();
    });

    it('should route processed data to appropriate handlers', () => {
      const revenueData = {
        streamName: 'revenue_insights',
        data: { totalRevenue: 10000, revenueByCreator: { creator1: 5000 } },
        sourceStream: 'payment_events'
      };

      jest.spyOn(pipelineIntegration, 'handleRevenueInsights').mockImplementation(() => {});

      pipelineIntegration.routeProcessedData(revenueData);

      expect(pipelineIntegration.handleRevenueInsights).toHaveBeenCalledWith(
        revenueData.data,
        revenueData.sourceStream
      );
    });

    it('should handle performance alerts correctly', () => {
      const performanceData = {
        errorsByType: { timeout: 5, connection: 3 },
        performanceMetrics: { cpu: 80, memory: 70 },
        securityEvents: []
      };

      jest.spyOn(pipelineIntegration, 'triggerAlert').mockImplementation(() => {});

      pipelineIntegration.handlePerformanceAlerts(performanceData, 'monitoring_stream');

      // Should not trigger alert if error count is <= 10
      expect(pipelineIntegration.triggerAlert).not.toHaveBeenCalled();

      // Test with high error count
      performanceData.errorsByType = { timeout: 8, connection: 5, other: 3 };
      
      pipelineIntegration.handlePerformanceAlerts(performanceData, 'monitoring_stream');

      expect(pipelineIntegration.triggerAlert).toHaveBeenCalledWith('high_error_rate', {
        source: 'monitoring_stream',
        errorTypes: ['timeout', 'connection', 'other'],
        count: 3
      });
    });

    it('should identify low engagement users', () => {
      const behaviorData = {
        sessionData: {
          user1: { totalSessions: 1 },
          user2: { totalSessions: 5 },
          user3: { totalSessions: 1 }
        },
        contentInteractions: {}
      };

      // Mock the alert trigger to test logic
      jest.spyOn(pipelineIntegration, 'triggerAlert').mockImplementation(() => {});

      pipelineIntegration.handleUserBehaviorInsights(behaviorData, 'user_stream');

      // Should not trigger alert for only 2 low engagement users (threshold is 50)
      expect(pipelineIntegration.triggerAlert).not.toHaveBeenCalled();

      // Add more low engagement users
      for (let i = 4; i <= 60; i++) {
        behaviorData.sessionData[`user${i}`] = { totalSessions: 1 };
      }

      pipelineIntegration.handleUserBehaviorInsights(behaviorData, 'user_stream');

      expect(pipelineIntegration.triggerAlert).toHaveBeenCalledWith('low_user_engagement', {
        lowEngagementUsers: 58, // 59 total low engagement users
        totalUsers: 60
      });
    });

    it('should handle churn alerts and trigger retention workflows', async () => {
      const churnData = { churnRate: 0.25, affectedUsers: 100 };

      jest.spyOn(mockOrchestrationEngine, 'executeWorkflow').mockResolvedValue({ success: true });

      pipelineIntegration.handleChurnAlerts(churnData, 'subscription_stream');

      expect(mockOrchestrationEngine.executeWorkflow).toHaveBeenCalledWith('customerRetention', {
        trigger: 'churn_risk',
        churnData
      });
    });
  });

  describe('Metrics and Monitoring', () => {
    beforeEach(async () => {
      await pipelineIntegration.initialize();
    });

    it('should provide comprehensive metrics', () => {
      const metrics = pipelineIntegration.getMetrics();
      
      expect(metrics).toHaveProperty('integration');
      expect(metrics.integration.initialized).toBe(true);
      expect(metrics.integration.orchestrationConnected).toBe(true);
      expect(metrics.integration).toHaveProperty('serviceConnections');
      expect(metrics.integration).toHaveProperty('alertsConfigured');
    });

    it('should throw error when getting pipeline before initialization', () => {
      const uninitializedPipeline = new PipelineIntegration();
      
      expect(() => {
        uninitializedPipeline.getDataPipeline();
      }).toThrow('Pipeline integration not initialized. Call initialize() first.');
    });
  });

  describe('Graceful Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await pipelineIntegration.initialize();
      
      expect(pipelineIntegration.initialized).toBe(true);
      
      await pipelineIntegration.shutdown();
      
      expect(pipelineIntegration.initialized).toBe(false);
      expect(pipelineIntegration.serviceConnections.size).toBe(0);
    });

    it('should handle shutdown when not initialized', async () => {
      // Should not throw error
      await expect(pipelineIntegration.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      // Mock a failure in data pipeline initialization
      const failingPipeline = new PipelineIntegration();
      failingPipeline.dataPipeline.initialize = jest.fn().mockRejectedValue(new Error('Init failed'));

      await expect(failingPipeline.initialize()).rejects.toThrow('Init failed');
      expect(failingPipeline.initialized).toBe(false);
    });

    it('should handle data ingestion errors', async () => {
      await pipelineIntegration.initialize();
      
      // Mock pipeline ingestion failure
      pipelineIntegration.dataPipeline.ingestData = jest.fn().mockRejectedValue(new Error('Ingestion failed'));

      const result = await pipelineIntegration.ingestData('user_activity', { test: 'data' });
      
      expect(result).toBeNull();
    });

    it('should handle workflow execution errors', async () => {
      await pipelineIntegration.initialize();
      
      mockOrchestrationEngine.executeWorkflow = jest.fn().mockRejectedValue(new Error('Workflow failed'));

      // Should not throw error but log it
      expect(() => {
        pipelineIntegration.handleRevenueInsights({ totalRevenue: 1000 }, 'test_stream');
      }).not.toThrow();
    });
  });

  describe('Real-time Processing', () => {
    beforeEach(async () => {
      await pipelineIntegration.initialize();
    });

    it('should handle real-time data updates', async () => {
      const dataPipeline = pipelineIntegration.getDataPipeline();
      
      // Mock real-time update event
      const updateData = {
        streamName: 'revenue_optimization',
        trend: 'decreasing',
        currentValue: 100,
        timestamp: new Date()
      };

      jest.spyOn(pipelineIntegration, 'triggerAlert').mockImplementation(() => {});

      // Simulate real-time update event
      dataPipeline.emit('realTimeUpdate', updateData);

      expect(pipelineIntegration.triggerAlert).toHaveBeenCalledWith('revenue_decline', {
        stream: updateData.streamName,
        currentValue: updateData.currentValue,
        trend: updateData.trend,
        timestamp: updateData.timestamp
      });
    });

    it('should process data events automatically', async () => {
      const dataPipeline = pipelineIntegration.getDataPipeline();
      
      const processedData = {
        streamName: 'content_performance',
        data: { contentInteractions: { video1: { views: 1000 } } },
        sourceStream: 'content_metrics'
      };

      jest.spyOn(pipelineIntegration, 'routeProcessedData').mockImplementation(() => {});

      dataPipeline.emit('processedData', processedData);

      expect(pipelineIntegration.routeProcessedData).toHaveBeenCalledWith(processedData);
    });
  });

  describe('Content Performance Analysis', () => {
    beforeEach(async () => {
      await pipelineIntegration.initialize();
    });

    it('should identify top performing content', () => {
      const contentData = {
        contentInteractions: {
          content1: { views: 1000, likes: 50 },
          content2: { views: 5000, likes: 200 },
          content3: { views: 2000, likes: 100 },
          content4: { views: 3000, likes: 150 },
          content5: { views: 800, likes: 30 },
          content6: { views: 4000, likes: 180 }
        },
        timestamp: new Date()
      };

      // Mock console.log to capture output
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      pipelineIntegration.handleContentPerformance(contentData, 'content_stream');

      // Should log top 5 performing content based on views
      expect(logSpy).toHaveBeenCalledWith(
        '🏆 Top performing content:',
        expect.arrayContaining([
          ['content2', expect.objectContaining({ views: 5000 })],
          ['content6', expect.objectContaining({ views: 4000 })],
          ['content4', expect.objectContaining({ views: 3000 })],
          ['content3', expect.objectContaining({ views: 2000 })],
          ['content1', expect.objectContaining({ views: 1000 })]
        ])
      );

      logSpy.mockRestore();
    });
  });
});

export default {
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/server/tests/setup.js']
};