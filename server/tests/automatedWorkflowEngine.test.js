/**
 * FANZ Automated Workflow Engine Tests
 * Comprehensive test suite for workflow automation system
 * Phase 13 - Enterprise Integration
 */

const { describe, beforeEach, afterEach, it } = require('@jest/globals');
const expect = require('expect');
const EventEmitter = require('events');
const AutomatedWorkflowEngine = require('../services/automatedWorkflowEngine');

// Mock dependencies
class MockOrchestrationEngine extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.workflows = new Map();
  }
  
  async executeServiceAction(service, action, params) {
    return { service, action, params, result: 'mock-success' };
  }
}

class MockDataPipeline extends EventEmitter {
  constructor() {
    super();
    this.streams = new Map();
  }
  
  async registerStream(streamName) {
    this.streams.set(streamName, { active: true });
    return true;
  }
}

class MockCommandCenter extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.alerts = [];
  }
  
  registerService(serviceInfo) {
    this.services.set(serviceInfo.name, serviceInfo);
    return true;
  }
  
  createAlert(alertInfo) {
    this.alerts.push({ ...alertInfo, id: `alert_${Date.now()}` });
    this.emit('alert:created', alertInfo);
  }
}

describe('AutomatedWorkflowEngine', () => {
  let workflowEngine;
  let mockOrchestrationEngine;
  let mockDataPipeline;
  let mockCommandCenter;

  beforeEach(async () => {
    mockOrchestrationEngine = new MockOrchestrationEngine();
    mockDataPipeline = new MockDataPipeline();
    mockCommandCenter = new MockCommandCenter();
    
    workflowEngine = new AutomatedWorkflowEngine(
      mockOrchestrationEngine,
      mockDataPipeline,
      mockCommandCenter
    );
  });

  afterEach(async () => {
    if (workflowEngine && workflowEngine.isRunning) {
      await workflowEngine.shutdown();
    }
    
    // Clear any remaining timers
    if (workflowEngine && workflowEngine.cleanupInterval) {
      clearInterval(workflowEngine.cleanupInterval);
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with all dependencies', async () => {
      const result = await workflowEngine.initialize();
      
      expect(result).toBe(true);
      expect(workflowEngine.isRunning).toBe(true);
      expect(workflowEngine.workflows.size).toBeGreaterThan(0);
      expect(mockCommandCenter.services.has('AutomatedWorkflowEngine')).toBe(true);
    });

    it('should load default workflows during initialization', async () => {
      await workflowEngine.initialize();
      
      expect(workflowEngine.workflows.has('revenue-optimization')).toBe(true);
      expect(workflowEngine.workflows.has('content-optimization')).toBe(true);
      expect(workflowEngine.workflows.has('fan-engagement')).toBe(true);
      expect(workflowEngine.workflows.has('system-health')).toBe(true);
    });

    it('should setup event listeners during initialization', async () => {
      await workflowEngine.initialize();
      
      expect(mockOrchestrationEngine.listenerCount('service:status-change')).toBeGreaterThan(0);
      expect(mockDataPipeline.listenerCount('insights:generated')).toBeGreaterThan(0);
      expect(mockCommandCenter.listenerCount('alert:created')).toBeGreaterThan(0);
    });

    it('should emit initialization event', async () => {
      let initEvent = false;
      workflowEngine.on('engine:initialized', () => {
        initEvent = true;
      });
      
      await workflowEngine.initialize();
      
      expect(initEvent).toBe(true);
    });
  });

  describe('Workflow Management', () => {
    beforeEach(async () => {
      await workflowEngine.initialize();
    });

    it('should create new workflow successfully', () => {
      const workflowId = 'test-workflow';
      const workflowConfig = {
        name: 'Test Workflow',
        description: 'Test workflow for unit testing',
        triggers: ['test:trigger'],
        conditions: [{ type: 'test-condition', operator: 'equals', value: 'test' }],
        actions: [{ service: 'test-service', action: 'test-action', params: {} }],
        priority: 'medium'
      };

      const workflow = workflowEngine.createWorkflow(workflowId, workflowConfig);

      expect(workflow).toBeDefined();
      expect(workflow.id).toBe(workflowId);
      expect(workflow.name).toBe(workflowConfig.name);
      expect(workflow.status).toBe('active');
      expect(workflowEngine.workflows.has(workflowId)).toBe(true);
    });

    it('should register triggers when creating workflow', () => {
      const workflowId = 'test-trigger-workflow';
      const triggers = ['test:trigger-1', 'test:trigger-2'];
      
      workflowEngine.createWorkflow(workflowId, {
        name: 'Test Trigger Workflow',
        triggers,
        actions: [{ service: 'test', action: 'test', params: {} }]
      });

      triggers.forEach(trigger => {
        expect(workflowEngine.triggers.has(trigger)).toBe(true);
        expect(workflowEngine.triggers.get(trigger).has(workflowId)).toBe(true);
      });
    });

    it('should get workflow statistics', () => {
      const stats = workflowEngine.getWorkflowStats();

      expect(stats).toHaveProperty('totalWorkflows');
      expect(stats).toHaveProperty('activeWorkflows');
      expect(stats).toHaveProperty('totalTriggers');
      expect(stats).toHaveProperty('metrics');
      expect(stats.metrics).toHaveProperty('successRate');
    });

    it('should update workflow status', () => {
      const workflowId = 'revenue-optimization'; // Default workflow
      const newStatus = 'paused';

      const updated = workflowEngine.updateWorkflowStatus(workflowId, newStatus);
      const workflow = workflowEngine.getWorkflow(workflowId);

      expect(updated).toBe(true);
      expect(workflow.status).toBe(newStatus);
    });
  });

  describe('Trigger Handling', () => {
    beforeEach(async () => {
      await workflowEngine.initialize();
    });

    it('should handle trigger events and execute workflows', async () => {
      let workflowStarted = false;
      let workflowCompleted = false;
      
      workflowEngine.on('workflow:started', () => {
        workflowStarted = true;
      });
      
      workflowEngine.on('workflow:completed', () => {
        workflowCompleted = true;
      });

      // Trigger a mock event
      await workflowEngine.handleTrigger('revenue-ai:insight-generated', {
        'revenue-threshold': 0.5, // Below threshold to trigger revenue optimization
        'engagement-score': 0.8    // Above threshold to meet conditions
      });

      // Allow time for async execution
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(workflowStarted).toBe(true);
      expect(workflowCompleted).toBe(true);
    });

    it('should not execute workflows when conditions are not met', async () => {
      let workflowStarted = false;
      
      workflowEngine.on('workflow:started', () => {
        workflowStarted = true;
      });

      // Trigger with conditions that don't match workflow requirements
      await workflowEngine.handleTrigger('revenue-ai:insight-generated', {
        'revenue-threshold': 0.9, // Above threshold, condition not met
        'engagement-score': 0.2   // Below threshold, condition not met
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(workflowStarted).toBe(false);
    });

    it('should execute workflows in priority order', async () => {
      const executionOrder = [];
      
      // Create high and low priority workflows
      workflowEngine.createWorkflow('high-priority', {
        name: 'High Priority Workflow',
        triggers: ['test:priority-trigger'],
        actions: [{ service: 'workflow-engine', action: 'log', params: { message: 'high' } }],
        priority: 'high'
      });
      
      workflowEngine.createWorkflow('low-priority', {
        name: 'Low Priority Workflow',
        triggers: ['test:priority-trigger'],
        actions: [{ service: 'workflow-engine', action: 'log', params: { message: 'low' } }],
        priority: 'low'
      });

      workflowEngine.on('workflow:started', (event) => {
        const workflow = workflowEngine.getWorkflow(event.workflowId);
        executionOrder.push(workflow.priority);
      });

      await workflowEngine.handleTrigger('test:priority-trigger', {});
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(executionOrder[0]).toBe('high');
      expect(executionOrder[1]).toBe('low');
    });
  });

  describe('Condition Evaluation', () => {
    beforeEach(async () => {
      await workflowEngine.initialize();
    });

    it('should evaluate equals conditions correctly', async () => {
      const condition = { type: 'test-value', operator: 'equals', value: 'match' };
      const eventData = { 'test-value': 'match' };

      const result = await workflowEngine.evaluateCondition(condition, eventData);

      expect(result).toBe(true);
    });

    it('should evaluate greater_than conditions correctly', async () => {
      const condition = { type: 'score', operator: 'greater_than', value: 0.5 };
      const eventData = { score: 0.8 };

      const result = await workflowEngine.evaluateCondition(condition, eventData);

      expect(result).toBe(true);
    });

    it('should evaluate less_than conditions correctly', async () => {
      const condition = { type: 'score', operator: 'less_than', value: 0.5 };
      const eventData = { score: 0.3 };

      const result = await workflowEngine.evaluateCondition(condition, eventData);

      expect(result).toBe(true);
    });

    it('should evaluate contains conditions correctly', async () => {
      const condition = { type: 'message', operator: 'contains', value: 'error' };
      const eventData = { message: 'System error occurred' };

      const result = await workflowEngine.evaluateCondition(condition, eventData);

      expect(result).toBe(true);
    });

    it('should return false for unmatched conditions', async () => {
      const condition = { type: 'test-value', operator: 'equals', value: 'expected' };
      const eventData = { 'test-value': 'actual' };

      const result = await workflowEngine.evaluateCondition(condition, eventData);

      expect(result).toBe(false);
    });
  });

  describe('Workflow Execution', () => {
    beforeEach(async () => {
      await workflowEngine.initialize();
    });

    it('should execute workflow actions in sequence', async () => {
      const workflowId = 'test-sequence-workflow';
      const actions = [
        { service: 'workflow-engine', action: 'log', params: { message: 'Action 1' } },
        { service: 'workflow-engine', action: 'wait', params: { duration: 10 } },
        { service: 'workflow-engine', action: 'log', params: { message: 'Action 2' } }
      ];
      
      workflowEngine.createWorkflow(workflowId, {
        name: 'Test Sequence Workflow',
        triggers: [],
        actions
      });

      const execution = await workflowEngine.executeWorkflow(workflowId, {});

      expect(execution.status).toBe('success');
      expect(execution.results).toHaveLength(3);
      expect(execution.results[0].status).toBe('success');
      expect(execution.results[1].status).toBe('success');
      expect(execution.results[2].status).toBe('success');
    });

    it('should handle action failures gracefully', async () => {
      const workflowId = 'test-error-workflow';
      const actions = [
        { service: 'workflow-engine', action: 'log', params: { message: 'Before error' } },
        { service: 'non-existent-service', action: 'invalid-action', params: {} },
        { service: 'workflow-engine', action: 'log', params: { message: 'After error' } }
      ];
      
      workflowEngine.createWorkflow(workflowId, {
        name: 'Test Error Workflow',
        triggers: [],
        actions
      });

      const execution = await workflowEngine.executeWorkflow(workflowId, {});

      expect(execution.status).toBe('success'); // Should continue despite errors
      expect(execution.results).toHaveLength(3);
      expect(execution.results[0].status).toBe('success');
      expect(execution.results[1].status).toBe('error');
      expect(execution.results[2].status).toBe('success');
    });

    it('should update workflow statistics after execution', async () => {
      const workflowId = 'revenue-optimization'; // Default workflow
      const initialStats = workflowEngine.getWorkflowStats();
      const workflow = workflowEngine.getWorkflow(workflowId);
      const initialExecutionCount = workflow.executionCount;

      await workflowEngine.executeWorkflow(workflowId, {});

      const updatedStats = workflowEngine.getWorkflowStats();
      const updatedWorkflow = workflowEngine.getWorkflow(workflowId);

      expect(updatedWorkflow.executionCount).toBe(initialExecutionCount + 1);
      expect(updatedStats.metrics.workflowsExecuted).toBe(initialStats.metrics.workflowsExecuted + 1);
    });
  });

  describe('Internal Actions', () => {
    beforeEach(async () => {
      await workflowEngine.initialize();
    });

    it('should execute wait action', async () => {
      const startTime = Date.now();
      const result = await workflowEngine.executeInternalAction(
        { action: 'wait' },
        { duration: 50 }
      );
      const endTime = Date.now();

      expect(result.action).toBe('wait');
      expect(result.duration).toBe(50);
      expect(endTime - startTime).toBeGreaterThanOrEqual(45); // Allow some timing variance
    });

    it('should execute log action', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = await workflowEngine.executeInternalAction(
        { action: 'log' },
        { message: 'Test log message' }
      );

      expect(result.action).toBe('log');
      expect(result.message).toBe('Test log message');
      expect(consoleSpy).toHaveBeenCalledWith('📝 Workflow log: Test log message');
      
      consoleSpy.mockRestore();
    });

    it('should execute send-alert action', async () => {
      const result = await workflowEngine.executeInternalAction(
        { action: 'send-alert' },
        { title: 'Test Alert', message: 'Test message', severity: 'info' }
      );

      expect(result.action).toBe('send-alert');
      expect(result.title).toBe('Test Alert');
      expect(mockCommandCenter.alerts.length).toBeGreaterThan(0);
      
      const alert = mockCommandCenter.alerts[mockCommandCenter.alerts.length - 1];
      expect(alert.title).toBe('Test Alert');
      expect(alert.message).toBe('Test message');
      expect(alert.severity).toBe('info');
    });

    it('should throw error for unknown internal action', async () => {
      await expect(workflowEngine.executeInternalAction(
        { action: 'unknown-action' },
        {}
      )).rejects.toThrow('Unknown internal action: unknown-action');
    });
  });

  describe('Cooldown Management', () => {
    beforeEach(async () => {
      await workflowEngine.initialize();
    });

    it('should respect workflow cooldown periods', async () => {
      const workflowId = 'cooldown-test-workflow';
      workflowEngine.createWorkflow(workflowId, {
        name: 'Cooldown Test Workflow',
        triggers: ['test:cooldown'],
        actions: [{ service: 'workflow-engine', action: 'log', params: { message: 'Executed' } }],
        cooldown: 1000 // 1 second cooldown
      });

      // Execute first time - should succeed
      await workflowEngine.executeWorkflow(workflowId, {});
      
      // Try to execute immediately - should be blocked by cooldown
      const workflow = workflowEngine.getWorkflow(workflowId);
      const shouldExecute = await workflowEngine.shouldExecuteWorkflow(workflow, {});
      
      expect(shouldExecute).toBe(false);
    });

    it('should allow execution after cooldown period', async () => {
      const workflowId = 'short-cooldown-workflow';
      workflowEngine.createWorkflow(workflowId, {
        name: 'Short Cooldown Workflow',
        triggers: ['test:short-cooldown'],
        actions: [{ service: 'workflow-engine', action: 'log', params: { message: 'Executed' } }],
        cooldown: 10 // 10ms cooldown
      });

      // Execute first time
      await workflowEngine.executeWorkflow(workflowId, {});
      
      // Wait for cooldown to pass
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should now be allowed to execute
      const workflow = workflowEngine.getWorkflow(workflowId);
      const shouldExecute = await workflowEngine.shouldExecuteWorkflow(workflow, {});
      
      expect(shouldExecute).toBe(true);
    });
  });

  describe('Execution History', () => {
    beforeEach(async () => {
      await workflowEngine.initialize();
    });

    it('should record execution history', async () => {
      const workflowId = 'history-test-workflow';
      workflowEngine.createWorkflow(workflowId, {
        name: 'History Test Workflow',
        triggers: [],
        actions: [{ service: 'workflow-engine', action: 'log', params: { message: 'Test' } }]
      });

      const initialHistoryLength = workflowEngine.executionHistory.length;
      
      await workflowEngine.executeWorkflow(workflowId, { testData: 'example' });
      
      const history = workflowEngine.getExecutionHistory(10);
      
      expect(history.length).toBe(initialHistoryLength + 1);
      
      const execution = history[0]; // Most recent first
      expect(execution.workflowId).toBe(workflowId);
      expect(execution.status).toBe('success');
      expect(execution.eventData.testData).toBe('example');
    });

    it('should limit execution history results', () => {
      // Add some mock execution history
      for (let i = 0; i < 10; i++) {
        workflowEngine.executionHistory.push({
          id: `exec_${i}`,
          workflowId: 'test',
          startTime: new Date(),
          status: 'success',
          createdAt: new Date()
        });
      }

      const limitedHistory = workflowEngine.getExecutionHistory(5);
      
      expect(limitedHistory.length).toBe(5);
    });
  });

  describe('Cleanup and Shutdown', () => {
    beforeEach(async () => {
      await workflowEngine.initialize();
    });

    it('should clean up old execution history', () => {
      // Add old execution records
      const oldDate = new Date(Date.now() - (31 * 24 * 60 * 60 * 1000)); // 31 days ago
      const recentDate = new Date(Date.now() - (1 * 24 * 60 * 60 * 1000)); // 1 day ago
      
      workflowEngine.executionHistory = [
        { id: 'old_exec', createdAt: oldDate },
        { id: 'recent_exec', createdAt: recentDate }
      ];

      const initialLength = workflowEngine.executionHistory.length;
      workflowEngine.cleanupExecutionHistory();
      const finalLength = workflowEngine.executionHistory.length;

      expect(finalLength).toBeLessThan(initialLength);
      expect(workflowEngine.executionHistory.find(exec => exec.id === 'recent_exec')).toBeDefined();
      expect(workflowEngine.executionHistory.find(exec => exec.id === 'old_exec')).toBeUndefined();
    });

    it('should shutdown gracefully', async () => {
      let shutdownEventEmitted = false;
      workflowEngine.on('engine:shutdown', () => {
        shutdownEventEmitted = true;
      });

      await workflowEngine.shutdown();

      expect(workflowEngine.isRunning).toBe(false);
      expect(shutdownEventEmitted).toBe(true);
    });

    it('should wait for active workflows during shutdown', async () => {
      // Simulate active workflow
      workflowEngine.activeWorkflows.set('test_exec', {
        workflowId: 'test',
        startTime: Date.now(),
        status: 'running'
      });

      const shutdownPromise = workflowEngine.shutdown();
      
      // Clear active workflows after a delay
      setTimeout(() => {
        workflowEngine.activeWorkflows.clear();
      }, 100);

      await shutdownPromise;

      expect(workflowEngine.isRunning).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await workflowEngine.initialize();
    });

    it('should handle initialization errors gracefully', async () => {
      const newEngine = new AutomatedWorkflowEngine(null, null, null);
      
      // Mock a method to throw an error
      newEngine.loadDefaultWorkflows = async () => {
        throw new Error('Initialization failed');
      };

      let errorEmitted = false;
      newEngine.on('engine:error', () => {
        errorEmitted = true;
      });

      await expect(newEngine.initialize()).rejects.toThrow('Initialization failed');
      expect(errorEmitted).toBe(true);
    });

    it('should handle trigger processing errors gracefully', async () => {
      let triggerErrorEmitted = false;
      workflowEngine.on('trigger:error', () => {
        triggerErrorEmitted = true;
      });

      // Force an error in trigger handling
      const originalEvaluateCondition = workflowEngine.evaluateCondition;
      workflowEngine.evaluateCondition = async () => {
        throw new Error('Condition evaluation failed');
      };

      await workflowEngine.handleTrigger('test:error-trigger', {});

      expect(triggerErrorEmitted).toBe(false); // Should not emit error for non-existent trigger
      
      // Restore original method
      workflowEngine.evaluateCondition = originalEvaluateCondition;
    });

    it('should handle workflow execution failures', async () => {
      const workflowId = 'failing-workflow';
      workflowEngine.createWorkflow(workflowId, {
        name: 'Failing Workflow',
        triggers: [],
        actions: [{ service: 'workflow-engine', action: 'unknown-action', params: {} }]
      });

      let workflowFailedEmitted = false;
      workflowEngine.on('workflow:failed', () => {
        workflowFailedEmitted = true;
      });

      await expect(workflowEngine.executeWorkflow(workflowId, {})).rejects.toThrow();
      expect(workflowFailedEmitted).toBe(true);
    });
  });

  describe('Performance and Metrics', () => {
    beforeEach(async () => {
      await workflowEngine.initialize();
    });

    it('should track execution metrics', async () => {
      const workflowId = 'metrics-test-workflow';
      workflowEngine.createWorkflow(workflowId, {
        name: 'Metrics Test Workflow',
        triggers: [],
        actions: [{ service: 'workflow-engine', action: 'log', params: { message: 'Metrics test' } }]
      });

      const initialMetrics = workflowEngine.getWorkflowStats().metrics;
      
      await workflowEngine.executeWorkflow(workflowId, {});
      
      const updatedMetrics = workflowEngine.getWorkflowStats().metrics;
      
      expect(updatedMetrics.workflowsExecuted).toBe(initialMetrics.workflowsExecuted + 1);
      expect(updatedMetrics.successfulExecutions).toBe(initialMetrics.successfulExecutions + 1);
      expect(updatedMetrics.averageExecutionTime).toBeGreaterThan(0);
    });

    it('should calculate success rate correctly', async () => {
      // Reset metrics for accurate calculation
      workflowEngine.metrics = {
        workflowsExecuted: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        rulesTriggered: 0,
        automationSavings: 0
      };

      const successWorkflowId = 'success-workflow';
      workflowEngine.createWorkflow(successWorkflowId, {
        name: 'Success Workflow',
        triggers: [],
        actions: [{ service: 'workflow-engine', action: 'log', params: { message: 'Success' } }]
      });

      // Execute successful workflow
      await workflowEngine.executeWorkflow(successWorkflowId, {});

      const stats = workflowEngine.getWorkflowStats();
      
      expect(parseFloat(stats.metrics.successRate)).toBe(100.0);
    });
  });
});

module.exports = {
  AutomatedWorkflowEngine,
  MockOrchestrationEngine,
  MockDataPipeline,
  MockCommandCenter
};