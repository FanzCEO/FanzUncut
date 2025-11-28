// FANZ Service Orchestration Engine
// Central coordination system for all platform services with intelligent workflow management

import EventEmitter from 'events';
import { performance } from 'perf_hooks';

class ServiceOrchestrationEngine extends EventEmitter {
  constructor() {
    super();
    
    // Service registry and dependency mapping
    this.services = new Map();
    this.workflows = new Map();
    this.activeExecutions = new Map();
    this.serviceHealth = new Map();
    this.dependencies = new Map();
    
    // Performance and monitoring
    this.metrics = {
      workflowsExecuted: 0,
      averageExecutionTime: 0,
      failureRate: 0,
      servicesHealthy: 0,
      lastHealthCheck: null
    };
    
    // Configuration
    this.config = {
      maxConcurrentWorkflows: 100,
      healthCheckInterval: 30000, // 30 seconds
      workflowTimeout: 300000, // 5 minutes
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      circuitBreakerThreshold: 5
    };
    
    this.circuitBreakers = new Map();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    console.log('🎭 Service Orchestration Engine initialized');
  }

  // === SERVICE REGISTRY ===

  /**
   * Register a service with the orchestration engine
   */
  registerService(serviceConfig) {
    const {
      name,
      instance,
      healthCheck,
      dependencies = [],
      capabilities = [],
      priority = 'normal',
      timeout = 30000
    } = serviceConfig;

    if (!name || !instance) {
      throw new Error('Service name and instance are required');
    }

    this.services.set(name, {
      name,
      instance,
      healthCheck: healthCheck || (() => Promise.resolve({ healthy: true })),
      dependencies,
      capabilities,
      priority,
      timeout,
      registeredAt: new Date(),
      lastHealthy: new Date(),
      status: 'registered'
    });

    // Initialize dependencies map
    this.dependencies.set(name, dependencies);
    
    // Initialize circuit breaker
    this.circuitBreakers.set(name, {
      failures: 0,
      lastFailure: null,
      state: 'closed', // closed, open, half-open
      nextAttempt: null
    });

    console.log(`📋 Service registered: ${name} with ${dependencies.length} dependencies`);
    
    this.emit('serviceRegistered', { name, capabilities, dependencies });
    return true;
  }

  /**
   * Get service instance by name
   */
  getService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    return service;
  }

  /**
   * Get all registered services
   */
  getAllServices() {
    return Array.from(this.services.entries()).map(([name, service]) => ({
      name,
      status: service.status,
      capabilities: service.capabilities,
      dependencies: service.dependencies,
      priority: service.priority,
      healthy: this.isServiceHealthy(name)
    }));
  }

  // === WORKFLOW ORCHESTRATION ===

  /**
   * Register a workflow with multiple service interactions
   */
  registerWorkflow(workflowConfig) {
    const {
      name,
      description,
      steps,
      triggers = [],
      timeout = this.config.workflowTimeout,
      retryPolicy = 'exponential',
      rollbackEnabled = true
    } = workflowConfig;

    if (!name || !steps || !Array.isArray(steps)) {
      throw new Error('Workflow name and steps array are required');
    }

    // Validate steps
    steps.forEach((step, index) => {
      if (!step.service || !step.action) {
        throw new Error(`Step ${index} missing required service or action`);
      }
      
      // Verify service exists
      if (!this.services.has(step.service)) {
        throw new Error(`Step ${index} references unknown service: ${step.service}`);
      }
    });

    this.workflows.set(name, {
      name,
      description,
      steps,
      triggers,
      timeout,
      retryPolicy,
      rollbackEnabled,
      createdAt: new Date(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: 0
    });

    console.log(`⚡ Workflow registered: ${name} with ${steps.length} steps`);
    
    this.emit('workflowRegistered', { name, steps: steps.length, triggers });
    return true;
  }

  /**
   * Execute a workflow with input data
   */
  async executeWorkflow(workflowName, inputData = {}, options = {}) {
    const executionId = `${workflowName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const workflow = this.workflows.get(workflowName);
      if (!workflow) {
        throw new Error(`Workflow ${workflowName} not found`);
      }

      // Check concurrent execution limit
      if (this.activeExecutions.size >= this.config.maxConcurrentWorkflows) {
        throw new Error('Maximum concurrent workflows exceeded');
      }

      const execution = {
        id: executionId,
        workflowName,
        status: 'running',
        startedAt: new Date(),
        inputData,
        currentStep: 0,
        stepResults: [],
        rollbackStack: [],
        options,
        metrics: {
          startTime: performance.now()
        }
      };

      this.activeExecutions.set(executionId, execution);
      
      console.log(`🚀 Executing workflow: ${workflowName} (${executionId})`);
      
      this.emit('workflowStarted', { executionId, workflowName, inputData });

      // Execute workflow steps
      const result = await this.executeWorkflowSteps(workflow, execution);
      
      // Mark as completed
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.result = result;
      execution.metrics.endTime = performance.now();
      execution.metrics.duration = execution.metrics.endTime - execution.metrics.startTime;

      // Update workflow statistics
      workflow.executionCount++;
      workflow.successCount++;
      workflow.averageExecutionTime = 
        (workflow.averageExecutionTime * (workflow.successCount - 1) + execution.metrics.duration) / 
        workflow.successCount;

      this.activeExecutions.delete(executionId);
      this.metrics.workflowsExecuted++;
      
      console.log(`✅ Workflow completed: ${workflowName} in ${execution.metrics.duration.toFixed(2)}ms`);
      
      this.emit('workflowCompleted', { executionId, workflowName, result, duration: execution.metrics.duration });
      
      return {
        executionId,
        status: 'completed',
        result,
        duration: execution.metrics.duration,
        stepsExecuted: execution.stepResults.length
      };

    } catch (error) {
      console.error(`❌ Workflow execution failed: ${workflowName}`, error);
      
      const execution = this.activeExecutions.get(executionId);
      if (execution) {
        execution.status = 'failed';
        execution.error = error.message;
        execution.completedAt = new Date();
        
        // Attempt rollback if enabled
        if (execution.rollbackStack.length > 0) {
          await this.rollbackExecution(execution);
        }
        
        this.activeExecutions.delete(executionId);
      }

      const workflow = this.workflows.get(workflowName);
      if (workflow) {
        workflow.failureCount++;
      }

      this.emit('workflowFailed', { executionId, workflowName, error: error.message });
      
      throw new Error(`Workflow execution failed: ${error.message}`);
    }
  }

  /**
   * Execute individual workflow steps
   */
  async executeWorkflowSteps(workflow, execution) {
    let context = { ...execution.inputData };
    
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      execution.currentStep = i;
      
      console.log(`📋 Executing step ${i + 1}/${workflow.steps.length}: ${step.service}.${step.action}`);
      
      try {
        // Check if service is healthy and circuit breaker allows
        if (!this.canExecuteOnService(step.service)) {
          throw new Error(`Service ${step.service} is not available`);
        }

        const stepResult = await this.executeStep(step, context, execution);
        
        execution.stepResults.push({
          stepIndex: i,
          service: step.service,
          action: step.action,
          result: stepResult,
          executedAt: new Date()
        });

        // Update context with step result
        if (step.outputKey) {
          context[step.outputKey] = stepResult;
        } else {
          // Merge result into context if it's an object
          if (typeof stepResult === 'object' && stepResult !== null) {
            context = { ...context, ...stepResult };
          }
        }

        // Add to rollback stack if step supports rollback
        if (step.rollback && workflow.rollbackEnabled) {
          execution.rollbackStack.push({
            step,
            rollbackData: stepResult.rollbackData || stepResult
          });
        }

      } catch (error) {
        console.error(`❌ Step ${i + 1} failed: ${step.service}.${step.action}`, error);
        
        // Record circuit breaker failure
        this.recordServiceFailure(step.service, error);
        
        // Handle retry logic
        if (step.retries > 0) {
          console.log(`🔄 Retrying step ${i + 1} (${step.retries} attempts remaining)`);
          step.retries--;
          i--; // Retry the same step
          await this.delay(this.config.retryDelay);
          continue;
        }
        
        throw new Error(`Step ${i + 1} (${step.service}.${step.action}) failed: ${error.message}`);
      }
    }
    
    return context;
  }

  /**
   * Execute a single workflow step
   */
  async executeStep(step, context, execution) {
    const service = this.getService(step.service);
    const { action, params = {}, timeout = service.timeout } = step;

    // Resolve parameters from context
    const resolvedParams = this.resolveParameters(params, context);
    
    const stepStartTime = performance.now();
    
    // Execute with timeout
    const result = await Promise.race([
      this.callServiceMethod(service.instance, action, resolvedParams),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Step timeout after ${timeout}ms`)), timeout)
      )
    ]);

    const stepDuration = performance.now() - stepStartTime;
    
    console.log(`✅ Step completed in ${stepDuration.toFixed(2)}ms: ${step.service}.${step.action}`);
    
    return result;
  }

  /**
   * Resolve parameter placeholders from context
   */
  resolveParameters(params, context) {
    if (typeof params !== 'object' || params === null) {
      return params;
    }

    const resolved = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        // Parameter placeholder
        const contextKey = value.slice(2, -1);
        resolved[key] = this.getNestedValue(context, contextKey);
      } else if (typeof value === 'object') {
        resolved[key] = this.resolveParameters(value, context);
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }

  /**
   * Get nested value from object using dot notation
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Call service method safely
   */
  async callServiceMethod(serviceInstance, method, params) {
    if (typeof serviceInstance[method] !== 'function') {
      throw new Error(`Method ${method} not found on service instance`);
    }

    // Handle different parameter patterns
    if (Array.isArray(params)) {
      return await serviceInstance[method](...params);
    } else if (typeof params === 'object' && params !== null) {
      return await serviceInstance[method](params);
    } else {
      return await serviceInstance[method](params);
    }
  }

  // === ROLLBACK SUPPORT ===

  /**
   * Rollback a failed execution
   */
  async rollbackExecution(execution) {
    console.log(`🔄 Rolling back execution: ${execution.id}`);
    
    const rollbackResults = [];
    
    // Execute rollback steps in reverse order
    for (let i = execution.rollbackStack.length - 1; i >= 0; i--) {
      const { step, rollbackData } = execution.rollbackStack[i];
      
      try {
        if (step.rollback) {
          const service = this.getService(step.service);
          const rollbackResult = await this.callServiceMethod(
            service.instance, 
            step.rollback, 
            rollbackData
          );
          
          rollbackResults.push({
            step: step.service + '.' + step.rollback,
            result: rollbackResult,
            success: true
          });
          
          console.log(`↩️ Rollback step completed: ${step.service}.${step.rollback}`);
        }
      } catch (rollbackError) {
        console.error(`❌ Rollback step failed: ${step.service}.${step.rollback}`, rollbackError);
        rollbackResults.push({
          step: step.service + '.' + step.rollback,
          error: rollbackError.message,
          success: false
        });
      }
    }
    
    execution.rollbackResults = rollbackResults;
    this.emit('workflowRolledBack', { executionId: execution.id, rollbackResults });
    
    return rollbackResults;
  }

  // === CIRCUIT BREAKER PATTERN ===

  /**
   * Check if service can be called (circuit breaker logic)
   */
  canExecuteOnService(serviceName) {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) return true;

    const now = Date.now();

    switch (breaker.state) {
      case 'closed':
        return true;
      
      case 'open':
        if (now >= breaker.nextAttempt) {
          breaker.state = 'half-open';
          return true;
        }
        return false;
      
      case 'half-open':
        return true;
      
      default:
        return true;
    }
  }

  /**
   * Record service failure for circuit breaker
   */
  recordServiceFailure(serviceName, error) {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) return;

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= this.config.circuitBreakerThreshold) {
      breaker.state = 'open';
      breaker.nextAttempt = Date.now() + (30000); // 30 second cool-down
      console.log(`🔒 Circuit breaker opened for service: ${serviceName}`);
    }

    this.emit('serviceFailure', { serviceName, error: error.message, failures: breaker.failures });
  }

  /**
   * Record service success for circuit breaker
   */
  recordServiceSuccess(serviceName) {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) return;

    if (breaker.state === 'half-open') {
      breaker.state = 'closed';
      breaker.failures = 0;
      console.log(`✅ Circuit breaker closed for service: ${serviceName}`);
    }
  }

  // === HEALTH MONITORING ===

  /**
   * Start periodic health monitoring of all services
   */
  startHealthMonitoring() {
    setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on all registered services
   */
  async performHealthCheck() {
    console.log('🏥 Performing health check on all services...');
    
    const healthPromises = Array.from(this.services.entries()).map(async ([serviceName, service]) => {
      try {
        const healthResult = await Promise.race([
          service.healthCheck(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);

        const isHealthy = healthResult && healthResult.healthy === true;
        
        this.serviceHealth.set(serviceName, {
          healthy: isHealthy,
          lastCheck: new Date(),
          details: healthResult
        });

        if (isHealthy) {
          service.lastHealthy = new Date();
          service.status = 'healthy';
          this.recordServiceSuccess(serviceName);
        } else {
          service.status = 'unhealthy';
          this.recordServiceFailure(serviceName, new Error('Health check failed'));
        }

        return { serviceName, healthy: isHealthy };
        
      } catch (error) {
        console.error(`❌ Health check failed for ${serviceName}:`, error.message);
        
        this.serviceHealth.set(serviceName, {
          healthy: false,
          lastCheck: new Date(),
          error: error.message
        });

        service.status = 'error';
        this.recordServiceFailure(serviceName, error);
        
        return { serviceName, healthy: false, error: error.message };
      }
    });

    const results = await Promise.allSettled(healthPromises);
    const healthyServices = results.filter(result => 
      result.status === 'fulfilled' && result.value.healthy
    ).length;

    this.metrics.servicesHealthy = healthyServices;
    this.metrics.lastHealthCheck = new Date();

    console.log(`🏥 Health check completed: ${healthyServices}/${this.services.size} services healthy`);
    
    this.emit('healthCheckCompleted', { 
      healthy: healthyServices, 
      total: this.services.size,
      timestamp: this.metrics.lastHealthCheck
    });
  }

  /**
   * Check if a specific service is healthy
   */
  isServiceHealthy(serviceName) {
    const health = this.serviceHealth.get(serviceName);
    return health ? health.healthy : false;
  }

  // === WORKFLOW TRIGGERS ===

  /**
   * Set up event-based workflow triggers
   */
  setupTriggers() {
    this.workflows.forEach((workflow, workflowName) => {
      workflow.triggers.forEach(trigger => {
        if (trigger.type === 'event') {
          this.on(trigger.event, async (data) => {
            if (this.matchesTriggerConditions(trigger, data)) {
              try {
                console.log(`🎯 Trigger activated: ${trigger.event} -> ${workflowName}`);
                await this.executeWorkflow(workflowName, data, { triggeredBy: trigger.event });
              } catch (error) {
                console.error(`❌ Triggered workflow failed: ${workflowName}`, error);
              }
            }
          });
        }
      });
    });
  }

  /**
   * Check if trigger conditions are met
   */
  matchesTriggerConditions(trigger, data) {
    if (!trigger.conditions) return true;

    return trigger.conditions.every(condition => {
      const value = this.getNestedValue(data, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'greater_than':
          return value > condition.value;
        case 'less_than':
          return value < condition.value;
        case 'contains':
          return typeof value === 'string' && value.includes(condition.value);
        case 'exists':
          return value !== undefined && value !== null;
        default:
          return true;
      }
    });
  }

  // === METRICS AND MONITORING ===

  /**
   * Get orchestration engine metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      services: {
        total: this.services.size,
        healthy: this.metrics.servicesHealthy,
        registered: Array.from(this.services.keys())
      },
      workflows: {
        registered: this.workflows.size,
        activeExecutions: this.activeExecutions.size,
        totalExecuted: this.metrics.workflowsExecuted
      },
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([service, breaker]) => ({
        service,
        state: breaker.state,
        failures: breaker.failures,
        lastFailure: breaker.lastFailure
      }))
    };
  }

  /**
   * Get active workflow executions
   */
  getActiveExecutions() {
    return Array.from(this.activeExecutions.values()).map(execution => ({
      id: execution.id,
      workflowName: execution.workflowName,
      status: execution.status,
      startedAt: execution.startedAt,
      currentStep: execution.currentStep,
      stepsCompleted: execution.stepResults.length
    }));
  }

  // === UTILITY METHODS ===

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Service Orchestration Engine shutting down...');
    
    // Wait for active executions to complete (with timeout)
    const activeCount = this.activeExecutions.size;
    if (activeCount > 0) {
      console.log(`⏳ Waiting for ${activeCount} active executions to complete...`);
      
      const shutdownTimeout = 30000; // 30 seconds
      const checkInterval = 1000; // 1 second
      let waited = 0;
      
      while (this.activeExecutions.size > 0 && waited < shutdownTimeout) {
        await this.delay(checkInterval);
        waited += checkInterval;
      }
      
      if (this.activeExecutions.size > 0) {
        console.log(`⚠️ Force shutdown with ${this.activeExecutions.size} executions still active`);
      }
    }
    
    this.removeAllListeners();
    console.log('✅ Service Orchestration Engine shutdown complete');
  }
}

export default ServiceOrchestrationEngine;