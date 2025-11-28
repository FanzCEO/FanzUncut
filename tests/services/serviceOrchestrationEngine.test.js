// FANZ Service Orchestration Engine Tests
// Comprehensive test suite for service registry, workflow execution, and health monitoring

import { jest } from '@jest/globals';
import ServiceOrchestrationEngine from '../../server/services/serviceOrchestrationEngine.js';

// Mock services for testing
const createMockService = (name, healthy = true, methods = {}) => ({
  name,
  ...methods,
  healthCheck: jest.fn().mockResolvedValue({ healthy, component: name }),
  testMethod: jest.fn().mockResolvedValue({ success: true, service: name }),
  failingMethod: jest.fn().mockRejectedValue(new Error(`${name} method failed`)),
  rollbackMethod: jest.fn().mockResolvedValue({ rollback: true, service: name })
});

describe('Service Orchestration Engine', () => {
  let orchestrationEngine;
  let mockServiceA;
  let mockServiceB;
  let mockServiceC;

  beforeEach(() => {
    orchestrationEngine = new ServiceOrchestrationEngine();
    mockServiceA = createMockService('serviceA');
    mockServiceB = createMockService('serviceB');
    mockServiceC = createMockService('serviceC');
  });

  afterEach(async () => {
    if (orchestrationEngine) {
      await orchestrationEngine.shutdown();
    }
    jest.clearAllMocks();
  });

  describe('Service Registration', () => {
    test('should register a service successfully', () => {
      const result = orchestrationEngine.registerService({
        name: 'testService',
        instance: mockServiceA,
        capabilities: ['test-capability'],
        dependencies: []
      });

      expect(result).toBe(true);
      expect(orchestrationEngine.services.size).toBe(1);
      expect(orchestrationEngine.services.has('testService')).toBe(true);
    });

    test('should require name and instance for service registration', () => {
      expect(() => {
        orchestrationEngine.registerService({
          capabilities: ['test']
        });
      }).toThrow('Service name and instance are required');
    });

    test('should get registered service', () => {
      orchestrationEngine.registerService({
        name: 'testService',
        instance: mockServiceA,
        dependencies: ['dependency1']
      });

      const service = orchestrationEngine.getService('testService');
      expect(service.name).toBe('testService');
      expect(service.instance).toBe(mockServiceA);
      expect(service.dependencies).toEqual(['dependency1']);
    });

    test('should throw error for non-existent service', () => {
      expect(() => {
        orchestrationEngine.getService('nonExistent');
      }).toThrow('Service nonExistent not found');
    });

    test('should get all services', () => {
      orchestrationEngine.registerService({
        name: 'service1',
        instance: mockServiceA,
        capabilities: ['cap1']
      });

      orchestrationEngine.registerService({
        name: 'service2',
        instance: mockServiceB,
        capabilities: ['cap2']
      });

      const services = orchestrationEngine.getAllServices();
      expect(services).toHaveLength(2);
      expect(services.map(s => s.name)).toEqual(['service1', 'service2']);
    });
  });

  describe('Workflow Management', () => {
    beforeEach(() => {
      // Register services for workflow tests
      orchestrationEngine.registerService({
        name: 'serviceA',
        instance: mockServiceA,
        capabilities: ['methodA']
      });

      orchestrationEngine.registerService({
        name: 'serviceB',
        instance: mockServiceB,
        capabilities: ['methodB']
      });

      orchestrationEngine.registerService({
        name: 'serviceC',
        instance: mockServiceC,
        capabilities: ['methodC']
      });
    });

    test('should register a workflow successfully', () => {
      const result = orchestrationEngine.registerWorkflow({
        name: 'testWorkflow',
        description: 'Test workflow',
        steps: [
          { service: 'serviceA', action: 'testMethod', params: { test: true } }
        ]
      });

      expect(result).toBe(true);
      expect(orchestrationEngine.workflows.size).toBe(1);
      expect(orchestrationEngine.workflows.has('testWorkflow')).toBe(true);
    });

    test('should require name and steps for workflow registration', () => {
      expect(() => {
        orchestrationEngine.registerWorkflow({
          description: 'Invalid workflow'
        });
      }).toThrow('Workflow name and steps array are required');
    });

    test('should validate service existence in workflow steps', () => {
      expect(() => {
        orchestrationEngine.registerWorkflow({
          name: 'invalidWorkflow',
          steps: [
            { service: 'nonExistentService', action: 'testMethod' }
          ]
        });
      }).toThrow('Step 0 references unknown service: nonExistentService');
    });

    test('should validate required step fields', () => {
      expect(() => {
        orchestrationEngine.registerWorkflow({
          name: 'invalidWorkflow',
          steps: [
            { service: 'serviceA' } // Missing action
          ]
        });
      }).toThrow('Step 0 missing required service or action');
    });
  });

  describe('Workflow Execution', () => {
    beforeEach(() => {
      orchestrationEngine.registerService({
        name: 'serviceA',
        instance: mockServiceA
      });

      orchestrationEngine.registerService({
        name: 'serviceB',
        instance: mockServiceB
      });

      orchestrationEngine.registerWorkflow({
        name: 'simpleWorkflow',
        description: 'Simple test workflow',
        steps: [
          {
            service: 'serviceA',
            action: 'testMethod',
            params: { value: '${input.value}' },
            outputKey: 'resultA'
          },
          {
            service: 'serviceB',
            action: 'testMethod',
            params: { previous: '${resultA}' }
          }
        ]
      });
    });

    test('should execute workflow successfully', async () => {
      const result = await orchestrationEngine.executeWorkflow('simpleWorkflow', {
        input: { value: 'test123' }
      });

      expect(result.status).toBe('completed');
      expect(result.stepsExecuted).toBe(2);
      expect(mockServiceA.testMethod).toHaveBeenCalledWith({ value: 'test123' });
      expect(mockServiceB.testMethod).toHaveBeenCalled();
    });

    test('should handle workflow execution failure', async () => {
      // Register a workflow with a failing step
      orchestrationEngine.registerWorkflow({
        name: 'failingWorkflow',
        steps: [
          { service: 'serviceA', action: 'failingMethod' }
        ]
      });

      await expect(
        orchestrationEngine.executeWorkflow('failingWorkflow')
      ).rejects.toThrow('Workflow execution failed');
    });

    test('should throw error for non-existent workflow', async () => {
      await expect(
        orchestrationEngine.executeWorkflow('nonExistentWorkflow')
      ).rejects.toThrow('Workflow nonExistentWorkflow not found');
    });

    test('should resolve parameter placeholders', () => {
      const context = {
        user: { id: 123, name: 'testUser' },
        config: { timeout: 5000 }
      };

      const params = {
        userId: '${user.id}',
        userName: '${user.name}',
        timeout: '${config.timeout}',
        static: 'staticValue'
      };

      const resolved = orchestrationEngine.resolveParameters(params, context);
      
      expect(resolved).toEqual({
        userId: 123,
        userName: 'testUser',
        timeout: 5000,
        static: 'staticValue'
      });
    });

    test('should handle nested parameter resolution', () => {
      const context = { level1: { level2: { value: 'nested' } } };
      const params = { nested: '${level1.level2.value}' };
      
      const resolved = orchestrationEngine.resolveParameters(params, context);
      expect(resolved.nested).toBe('nested');
    });

    test('should handle concurrent workflow execution limit', async () => {
      // Set low limit for testing
      orchestrationEngine.config.maxConcurrentWorkflows = 1;

      // Start one execution
      const execution1 = orchestrationEngine.executeWorkflow('simpleWorkflow');
      
      // Try to start another immediately - should fail
      await expect(
        orchestrationEngine.executeWorkflow('simpleWorkflow')
      ).rejects.toThrow('Maximum concurrent workflows exceeded');

      // Clean up
      await execution1;
    });
  });

  describe('Rollback Functionality', () => {
    beforeEach(() => {
      orchestrationEngine.registerService({
        name: 'serviceA',
        instance: mockServiceA
      });

      orchestrationEngine.registerService({
        name: 'serviceB',
        instance: mockServiceB
      });
    });

    test('should execute rollback on workflow failure', async () => {
      orchestrationEngine.registerWorkflow({
        name: 'rollbackWorkflow',
        steps: [
          {
            service: 'serviceA',
            action: 'testMethod',
            rollback: 'rollbackMethod'
          },
          {
            service: 'serviceB',
            action: 'failingMethod', // This will fail
            rollback: 'rollbackMethod'
          }
        ],
        rollbackEnabled: true
      });

      try {
        await orchestrationEngine.executeWorkflow('rollbackWorkflow');
      } catch (error) {
        // Expected to fail
      }

      // Rollback should have been called for serviceA (completed step)
      expect(mockServiceA.rollbackMethod).toHaveBeenCalled();
    });

    test('should not execute rollback when disabled', async () => {
      orchestrationEngine.registerWorkflow({
        name: 'noRollbackWorkflow',
        steps: [
          {
            service: 'serviceA',
            action: 'testMethod',
            rollback: 'rollbackMethod'
          },
          {
            service: 'serviceB',
            action: 'failingMethod'
          }
        ],
        rollbackEnabled: false
      });

      try {
        await orchestrationEngine.executeWorkflow('noRollbackWorkflow');
      } catch (error) {
        // Expected to fail
      }

      // Rollback should NOT have been called
      expect(mockServiceA.rollbackMethod).not.toHaveBeenCalled();
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(() => {
      orchestrationEngine.config.circuitBreakerThreshold = 2; // Low threshold for testing
      
      orchestrationEngine.registerService({
        name: 'unreliableService',
        instance: mockServiceA
      });
    });

    test('should open circuit breaker after threshold failures', () => {
      const serviceName = 'unreliableService';
      
      // Simulate failures to reach threshold
      orchestrationEngine.recordServiceFailure(serviceName, new Error('Test failure 1'));
      orchestrationEngine.recordServiceFailure(serviceName, new Error('Test failure 2'));
      
      const breaker = orchestrationEngine.circuitBreakers.get(serviceName);
      expect(breaker.state).toBe('open');
      expect(orchestrationEngine.canExecuteOnService(serviceName)).toBe(false);
    });

    test('should close circuit breaker on success after half-open', () => {
      const serviceName = 'unreliableService';
      const breaker = orchestrationEngine.circuitBreakers.get(serviceName);
      
      // Set to half-open state
      breaker.state = 'half-open';
      
      // Record success
      orchestrationEngine.recordServiceSuccess(serviceName);
      
      expect(breaker.state).toBe('closed');
      expect(breaker.failures).toBe(0);
    });

    test('should allow execution when circuit is closed', () => {
      const serviceName = 'unreliableService';
      expect(orchestrationEngine.canExecuteOnService(serviceName)).toBe(true);
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(() => {
      orchestrationEngine.registerService({
        name: 'healthyService',
        instance: mockServiceA,
        healthCheck: () => Promise.resolve({ healthy: true })
      });

      orchestrationEngine.registerService({
        name: 'unhealthyService',
        instance: mockServiceB,
        healthCheck: () => Promise.resolve({ healthy: false })
      });
    });

    test('should perform health check on all services', async () => {
      await orchestrationEngine.performHealthCheck();

      expect(orchestrationEngine.metrics.servicesHealthy).toBe(1);
      expect(orchestrationEngine.metrics.lastHealthCheck).toBeDefined();
    });

    test('should identify healthy and unhealthy services', async () => {
      await orchestrationEngine.performHealthCheck();

      expect(orchestrationEngine.isServiceHealthy('healthyService')).toBe(true);
      expect(orchestrationEngine.isServiceHealthy('unhealthyService')).toBe(false);
    });

    test('should handle health check failures', async () => {
      orchestrationEngine.registerService({
        name: 'errorService',
        instance: mockServiceC,
        healthCheck: () => Promise.reject(new Error('Health check failed'))
      });

      await orchestrationEngine.performHealthCheck();

      expect(orchestrationEngine.isServiceHealthy('errorService')).toBe(false);
    });
  });

  describe('Event-Based Triggers', () => {
    beforeEach(() => {
      orchestrationEngine.registerService({
        name: 'serviceA',
        instance: mockServiceA
      });

      orchestrationEngine.registerWorkflow({
        name: 'triggeredWorkflow',
        steps: [
          { service: 'serviceA', action: 'testMethod' }
        ],
        triggers: [
          {
            type: 'event',
            event: 'user.created',
            conditions: [
              { field: 'userType', operator: 'equals', value: 'creator' }
            ]
          }
        ]
      });

      orchestrationEngine.setupTriggers();
    });

    test('should trigger workflow on matching event', async () => {
      // Allow some time for async execution
      const eventPromise = new Promise((resolve) => {
        orchestrationEngine.once('workflowCompleted', resolve);
      });

      // Emit event that matches trigger conditions
      orchestrationEngine.emit('user.created', {
        userType: 'creator',
        userId: 123
      });

      await eventPromise;
      expect(mockServiceA.testMethod).toHaveBeenCalled();
    });

    test('should not trigger workflow on non-matching conditions', (done) => {
      let triggered = false;
      
      orchestrationEngine.once('workflowStarted', () => {
        triggered = true;
      });

      // Emit event that doesn't match conditions
      orchestrationEngine.emit('user.created', {
        userType: 'fan', // Different from 'creator'
        userId: 123
      });

      // Wait and check that workflow wasn't triggered
      setTimeout(() => {
        expect(triggered).toBe(false);
        done();
      }, 100);
    });

    test('should match different trigger conditions', () => {
      const trigger = {
        conditions: [
          { field: 'amount', operator: 'greater_than', value: 100 },
          { field: 'currency', operator: 'equals', value: 'USD' },
          { field: 'description', operator: 'contains', value: 'subscription' },
          { field: 'userId', operator: 'exists' }
        ]
      };

      const matchingData = {
        amount: 150,
        currency: 'USD',
        description: 'Monthly subscription payment',
        userId: 456
      };

      const nonMatchingData = {
        amount: 50, // Less than 100
        currency: 'EUR', // Not USD
        description: 'One-time payment', // Doesn't contain 'subscription'
        // userId missing
      };

      expect(orchestrationEngine.matchesTriggerConditions(trigger, matchingData)).toBe(true);
      expect(orchestrationEngine.matchesTriggerConditions(trigger, nonMatchingData)).toBe(false);
    });
  });

  describe('Metrics and Monitoring', () => {
    beforeEach(() => {
      orchestrationEngine.registerService({
        name: 'serviceA',
        instance: mockServiceA
      });

      orchestrationEngine.registerWorkflow({
        name: 'testWorkflow',
        steps: [
          { service: 'serviceA', action: 'testMethod' }
        ]
      });
    });

    test('should track workflow execution metrics', async () => {
      const initialMetrics = orchestrationEngine.getMetrics();
      
      await orchestrationEngine.executeWorkflow('testWorkflow');
      
      const updatedMetrics = orchestrationEngine.getMetrics();
      expect(updatedMetrics.workflowsExecuted).toBeGreaterThan(initialMetrics.workflowsExecuted);
    });

    test('should get active executions', async () => {
      // Create a workflow with delayed execution
      const delayedService = {
        testMethod: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 100))
        )
      };

      orchestrationEngine.registerService({
        name: 'delayedService',
        instance: delayedService
      });

      orchestrationEngine.registerWorkflow({
        name: 'delayedWorkflow',
        steps: [
          { service: 'delayedService', action: 'testMethod' }
        ]
      });

      // Start execution but don't wait
      const executionPromise = orchestrationEngine.executeWorkflow('delayedWorkflow');
      
      // Check active executions
      const activeExecutions = orchestrationEngine.getActiveExecutions();
      expect(activeExecutions.length).toBe(1);
      expect(activeExecutions[0].workflowName).toBe('delayedWorkflow');
      expect(activeExecutions[0].status).toBe('running');

      // Wait for completion
      await executionPromise;
      
      // Should be empty after completion
      const completedExecutions = orchestrationEngine.getActiveExecutions();
      expect(completedExecutions.length).toBe(0);
    });

    test('should provide comprehensive metrics', () => {
      const metrics = orchestrationEngine.getMetrics();

      expect(metrics).toHaveProperty('workflowsExecuted');
      expect(metrics).toHaveProperty('averageExecutionTime');
      expect(metrics).toHaveProperty('services');
      expect(metrics).toHaveProperty('workflows');
      expect(metrics).toHaveProperty('circuitBreakers');
      
      expect(metrics.services).toHaveProperty('total');
      expect(metrics.services).toHaveProperty('healthy');
      expect(metrics.services).toHaveProperty('registered');
      
      expect(metrics.workflows).toHaveProperty('registered');
      expect(metrics.workflows).toHaveProperty('activeExecutions');
    });
  });

  describe('Service Method Invocation', () => {
    test('should call service method with object parameters', async () => {
      const params = { userId: 123, data: 'test' };
      await orchestrationEngine.callServiceMethod(mockServiceA, 'testMethod', params);
      
      expect(mockServiceA.testMethod).toHaveBeenCalledWith(params);
    });

    test('should call service method with array parameters', async () => {
      const params = ['arg1', 'arg2', 'arg3'];
      await orchestrationEngine.callServiceMethod(mockServiceA, 'testMethod', params);
      
      expect(mockServiceA.testMethod).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    test('should call service method with primitive parameters', async () => {
      await orchestrationEngine.callServiceMethod(mockServiceA, 'testMethod', 'stringParam');
      
      expect(mockServiceA.testMethod).toHaveBeenCalledWith('stringParam');
    });

    test('should throw error for non-existent method', async () => {
      await expect(
        orchestrationEngine.callServiceMethod(mockServiceA, 'nonExistentMethod', {})
      ).rejects.toThrow('Method nonExistentMethod not found on service instance');
    });
  });

  describe('Graceful Shutdown', () => {
    test('should shutdown gracefully', async () => {
      orchestrationEngine.registerService({
        name: 'serviceA',
        instance: mockServiceA
      });

      const shutdownPromise = orchestrationEngine.shutdown();
      await shutdownPromise;

      // Should complete without errors
      expect(true).toBe(true);
    });

    test('should wait for active executions during shutdown', async () => {
      const slowService = {
        slowMethod: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 200))
        )
      };

      orchestrationEngine.registerService({
        name: 'slowService',
        instance: slowService
      });

      orchestrationEngine.registerWorkflow({
        name: 'slowWorkflow',
        steps: [
          { service: 'slowService', action: 'slowMethod' }
        ]
      });

      // Start execution
      const executionPromise = orchestrationEngine.executeWorkflow('slowWorkflow');
      
      // Start shutdown (should wait for execution)
      const shutdownStart = Date.now();
      const shutdownPromise = orchestrationEngine.shutdown();
      
      // Both should complete
      await Promise.all([executionPromise, shutdownPromise]);
      
      const shutdownDuration = Date.now() - shutdownStart;
      expect(shutdownDuration).toBeGreaterThan(150); // Should wait for execution
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty workflow steps', () => {
      expect(() => {
        orchestrationEngine.registerWorkflow({
          name: 'emptyWorkflow',
          steps: []
        });
      }).not.toThrow(); // Empty steps should be allowed
    });

    test('should handle service registration with minimal config', () => {
      expect(() => {
        orchestrationEngine.registerService({
          name: 'minimalService',
          instance: mockServiceA
        });
      }).not.toThrow();
    });

    test('should handle workflow execution with empty input data', async () => {
      orchestrationEngine.registerService({
        name: 'serviceA',
        instance: mockServiceA
      });

      orchestrationEngine.registerWorkflow({
        name: 'emptyInputWorkflow',
        steps: [
          { service: 'serviceA', action: 'testMethod' }
        ]
      });

      const result = await orchestrationEngine.executeWorkflow('emptyInputWorkflow');
      expect(result.status).toBe('completed');
    });

    test('should handle nested object parameter resolution', () => {
      const context = {
        user: {
          profile: {
            settings: {
              theme: 'dark'
            }
          }
        }
      };

      const params = {
        nested: {
          theme: '${user.profile.settings.theme}',
          static: 'value'
        }
      };

      const resolved = orchestrationEngine.resolveParameters(params, context);
      expect(resolved.nested.theme).toBe('dark');
      expect(resolved.nested.static).toBe('value');
    });
  });
});

describe('Service Registry Integration', () => {
  test('should handle service registration errors gracefully', () => {
    const orchestrationEngine = new ServiceOrchestrationEngine();
    
    // Test invalid service registration
    expect(() => {
      orchestrationEngine.registerService({
        // Missing required fields
        capabilities: ['test']
      });
    }).toThrow('Service name and instance are required');
  });

  test('should emit events during service lifecycle', (done) => {
    const orchestrationEngine = new ServiceOrchestrationEngine();
    let eventCount = 0;

    orchestrationEngine.on('serviceRegistered', (data) => {
      expect(data.name).toBe('testService');
      expect(data.capabilities).toContain('test-capability');
      eventCount++;
      
      if (eventCount === 1) {
        done();
      }
    });

    orchestrationEngine.registerService({
      name: 'testService',
      instance: createMockService('testService'),
      capabilities: ['test-capability']
    });
  });
});

describe('Performance and Scalability', () => {
  test('should handle multiple concurrent workflow registrations', () => {
    const orchestrationEngine = new ServiceOrchestrationEngine();
    
    // Register a service first
    orchestrationEngine.registerService({
      name: 'testService',
      instance: createMockService('testService')
    });

    // Register multiple workflows concurrently
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        Promise.resolve().then(() => {
          orchestrationEngine.registerWorkflow({
            name: `workflow${i}`,
            description: `Test workflow ${i}`,
            steps: [
              { service: 'testService', action: 'testMethod', params: { id: i } }
            ]
          });
        })
      );
    }

    return Promise.all(promises).then(() => {
      expect(orchestrationEngine.workflows.size).toBe(10);
    });
  });

  test('should efficiently handle large parameter context objects', () => {
    const orchestrationEngine = new ServiceOrchestrationEngine();
    
    // Create large context object
    const largeContext = {
      user: { id: 1 },
      data: {}
    };

    // Add 1000 properties
    for (let i = 0; i < 1000; i++) {
      largeContext.data[`prop${i}`] = `value${i}`;
    }

    const params = {
      userId: '${user.id}',
      someData: '${data.prop500}'
    };

    const start = Date.now();
    const resolved = orchestrationEngine.resolveParameters(params, largeContext);
    const duration = Date.now() - start;

    expect(resolved.userId).toBe(1);
    expect(resolved.someData).toBe('value500');
    expect(duration).toBeLessThan(100); // Should be fast even with large context
  });
});