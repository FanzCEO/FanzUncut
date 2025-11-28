// FANZ Service Orchestration API Routes
// REST API endpoints for managing service orchestration and workflows

import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for orchestration APIs
const orchestrationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many orchestration requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all orchestration routes
router.use(orchestrationLimit);

// Middleware to inject orchestration engine
router.use((req, res, next) => {
  if (!req.app.locals.orchestrationEngine) {
    return res.status(503).json({
      error: 'Orchestration engine not available',
      message: 'Service orchestration is currently offline'
    });
  }
  req.orchestration = req.app.locals.orchestrationEngine;
  next();
});

// === SERVICE MANAGEMENT ===

/**
 * GET /orchestration/services
 * Get all registered services
 */
router.get('/services', async (req, res) => {
  try {
    const services = req.orchestration.getAllServices();
    
    res.json({
      success: true,
      services,
      total: services.length,
      healthy: services.filter(s => s.healthy).length
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      error: 'Failed to fetch services',
      message: error.message
    });
  }
});

/**
 * GET /orchestration/services/:serviceName
 * Get detailed information about a specific service
 */
router.get('/services/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const service = req.orchestration.getService(serviceName);
    const isHealthy = req.orchestration.isServiceHealthy(serviceName);
    
    res.json({
      success: true,
      service: {
        ...service,
        healthy: isHealthy,
        healthDetails: req.orchestration.serviceHealth.get(serviceName)
      }
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Service not found',
        message: error.message
      });
    }
    
    console.error('Error fetching service:', error);
    res.status(500).json({
      error: 'Failed to fetch service',
      message: error.message
    });
  }
});

/**
 * POST /orchestration/services/:serviceName/health-check
 * Trigger health check for a specific service
 */
router.post('/services/:serviceName/health-check', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const service = req.orchestration.getService(serviceName);
    
    const healthResult = await Promise.race([
      service.healthCheck(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 10000)
      )
    ]);
    
    const isHealthy = healthResult && healthResult.healthy === true;
    
    res.json({
      success: true,
      service: serviceName,
      healthy: isHealthy,
      details: healthResult,
      timestamp: new Date()
    });
  } catch (error) {
    console.error(`Health check failed for ${req.params.serviceName}:`, error);
    res.status(500).json({
      error: 'Health check failed',
      service: req.params.serviceName,
      message: error.message,
      healthy: false,
      timestamp: new Date()
    });
  }
});

// === WORKFLOW MANAGEMENT ===

/**
 * GET /orchestration/workflows
 * Get all registered workflows
 */
router.get('/workflows', async (req, res) => {
  try {
    const workflows = Array.from(req.orchestration.workflows.entries()).map(([name, workflow]) => ({
      name,
      description: workflow.description,
      steps: workflow.steps.length,
      triggers: workflow.triggers.length,
      executionCount: workflow.executionCount,
      successCount: workflow.successCount,
      failureCount: workflow.failureCount,
      averageExecutionTime: workflow.averageExecutionTime,
      createdAt: workflow.createdAt
    }));
    
    res.json({
      success: true,
      workflows,
      total: workflows.length
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({
      error: 'Failed to fetch workflows',
      message: error.message
    });
  }
});

/**
 * GET /orchestration/workflows/:workflowName
 * Get detailed information about a specific workflow
 */
router.get('/workflows/:workflowName', async (req, res) => {
  try {
    const { workflowName } = req.params;
    const workflow = req.orchestration.workflows.get(workflowName);
    
    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `Workflow ${workflowName} does not exist`
      });
    }
    
    res.json({
      success: true,
      workflow: {
        ...workflow,
        // Include step validation status
        stepsValid: workflow.steps.every(step => 
          req.orchestration.services.has(step.service)
        )
      }
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({
      error: 'Failed to fetch workflow',
      message: error.message
    });
  }
});

/**
 * POST /orchestration/workflows
 * Register a new workflow
 */
router.post('/workflows', async (req, res) => {
  try {
    const workflowConfig = req.body;
    
    // Basic validation
    if (!workflowConfig.name || !workflowConfig.steps) {
      return res.status(400).json({
        error: 'Invalid workflow configuration',
        message: 'Workflow name and steps are required'
      });
    }
    
    // Check if workflow already exists
    if (req.orchestration.workflows.has(workflowConfig.name)) {
      return res.status(409).json({
        error: 'Workflow already exists',
        message: `Workflow ${workflowConfig.name} is already registered`
      });
    }
    
    const success = req.orchestration.registerWorkflow(workflowConfig);
    
    res.status(201).json({
      success,
      workflow: workflowConfig.name,
      steps: workflowConfig.steps.length,
      message: 'Workflow registered successfully'
    });
  } catch (error) {
    console.error('Error registering workflow:', error);
    res.status(400).json({
      error: 'Failed to register workflow',
      message: error.message
    });
  }
});

/**
 * POST /orchestration/workflows/:workflowName/execute
 * Execute a workflow with input data
 */
router.post('/workflows/:workflowName/execute', async (req, res) => {
  try {
    const { workflowName } = req.params;
    const { inputData = {}, options = {} } = req.body;
    
    // Add request metadata
    const executionOptions = {
      ...options,
      requestId: req.headers['x-request-id'] || `req_${Date.now()}`,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    };
    
    const result = await req.orchestration.executeWorkflow(
      workflowName, 
      inputData, 
      executionOptions
    );
    
    res.json({
      success: true,
      execution: result,
      message: 'Workflow executed successfully'
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: error.message
      });
    }
    
    if (error.message.includes('Maximum concurrent')) {
      return res.status(429).json({
        error: 'Too many concurrent executions',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Workflow execution failed',
      message: error.message
    });
  }
});

// === EXECUTION MONITORING ===

/**
 * GET /orchestration/executions
 * Get all active workflow executions
 */
router.get('/executions', async (req, res) => {
  try {
    const executions = req.orchestration.getActiveExecutions();
    
    res.json({
      success: true,
      executions,
      total: executions.length
    });
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({
      error: 'Failed to fetch executions',
      message: error.message
    });
  }
});

/**
 * GET /orchestration/executions/:executionId
 * Get detailed information about a specific execution
 */
router.get('/executions/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const execution = req.orchestration.activeExecutions.get(executionId);
    
    if (!execution) {
      return res.status(404).json({
        error: 'Execution not found',
        message: `Execution ${executionId} not found or has completed`
      });
    }
    
    res.json({
      success: true,
      execution: {
        id: execution.id,
        workflowName: execution.workflowName,
        status: execution.status,
        startedAt: execution.startedAt,
        currentStep: execution.currentStep,
        stepResults: execution.stepResults,
        inputData: execution.inputData,
        options: execution.options,
        error: execution.error
      }
    });
  } catch (error) {
    console.error('Error fetching execution:', error);
    res.status(500).json({
      error: 'Failed to fetch execution',
      message: error.message
    });
  }
});

// === METRICS AND MONITORING ===

/**
 * GET /orchestration/metrics
 * Get orchestration engine metrics and statistics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = req.orchestration.getMetrics();
    
    res.json({
      success: true,
      metrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
      message: error.message
    });
  }
});

/**
 * GET /orchestration/health
 * Get overall orchestration engine health status
 */
router.get('/health', async (req, res) => {
  try {
    const metrics = req.orchestration.getMetrics();
    const healthPercentage = metrics.services.total > 0 
      ? (metrics.services.healthy / metrics.services.total) * 100 
      : 100;
    
    const status = {
      healthy: healthPercentage >= 80, // 80% healthy threshold
      services: {
        total: metrics.services.total,
        healthy: metrics.services.healthy,
        healthPercentage: Math.round(healthPercentage)
      },
      workflows: {
        registered: metrics.workflows.registered,
        activeExecutions: metrics.workflows.activeExecutions,
        totalExecuted: metrics.workflows.totalExecuted
      },
      circuitBreakers: {
        total: metrics.circuitBreakers.length,
        open: metrics.circuitBreakers.filter(cb => cb.state === 'open').length,
        halfOpen: metrics.circuitBreakers.filter(cb => cb.state === 'half-open').length
      },
      lastHealthCheck: metrics.lastHealthCheck,
      uptime: process.uptime()
    };
    
    res.json({
      success: true,
      status,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching health status:', error);
    res.status(500).json({
      error: 'Failed to fetch health status',
      message: error.message
    });
  }
});

// === CIRCUIT BREAKER MANAGEMENT ===

/**
 * GET /orchestration/circuit-breakers
 * Get circuit breaker status for all services
 */
router.get('/circuit-breakers', async (req, res) => {
  try {
    const circuitBreakers = Array.from(req.orchestration.circuitBreakers.entries()).map(([service, breaker]) => ({
      service,
      state: breaker.state,
      failures: breaker.failures,
      lastFailure: breaker.lastFailure ? new Date(breaker.lastFailure) : null,
      nextAttempt: breaker.nextAttempt ? new Date(breaker.nextAttempt) : null
    }));
    
    res.json({
      success: true,
      circuitBreakers,
      summary: {
        total: circuitBreakers.length,
        closed: circuitBreakers.filter(cb => cb.state === 'closed').length,
        open: circuitBreakers.filter(cb => cb.state === 'open').length,
        halfOpen: circuitBreakers.filter(cb => cb.state === 'half-open').length
      }
    });
  } catch (error) {
    console.error('Error fetching circuit breakers:', error);
    res.status(500).json({
      error: 'Failed to fetch circuit breakers',
      message: error.message
    });
  }
});

/**
 * POST /orchestration/circuit-breakers/:serviceName/reset
 * Reset circuit breaker for a specific service
 */
router.post('/circuit-breakers/:serviceName/reset', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const breaker = req.orchestration.circuitBreakers.get(serviceName);
    
    if (!breaker) {
      return res.status(404).json({
        error: 'Circuit breaker not found',
        message: `No circuit breaker found for service ${serviceName}`
      });
    }
    
    // Reset circuit breaker
    breaker.state = 'closed';
    breaker.failures = 0;
    breaker.lastFailure = null;
    breaker.nextAttempt = null;
    
    res.json({
      success: true,
      service: serviceName,
      message: 'Circuit breaker reset successfully',
      newState: breaker.state
    });
  } catch (error) {
    console.error('Error resetting circuit breaker:', error);
    res.status(500).json({
      error: 'Failed to reset circuit breaker',
      message: error.message
    });
  }
});

// === ADVANCED QUERIES ===

/**
 * GET /orchestration/workflows/:workflowName/executions/history
 * Get execution history for a specific workflow
 */
router.get('/workflows/:workflowName/executions/history', async (req, res) => {
  try {
    const { workflowName } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const workflow = req.orchestration.workflows.get(workflowName);
    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `Workflow ${workflowName} does not exist`
      });
    }
    
    // Note: This would typically query a persistent execution history store
    // For now, return workflow statistics
    res.json({
      success: true,
      workflow: workflowName,
      statistics: {
        totalExecutions: workflow.executionCount,
        successCount: workflow.successCount,
        failureCount: workflow.failureCount,
        averageExecutionTime: workflow.averageExecutionTime,
        successRate: workflow.executionCount > 0 
          ? (workflow.successCount / workflow.executionCount) * 100 
          : 0
      },
      // In a real implementation, this would return actual execution records
      executions: [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: 0
      }
    });
  } catch (error) {
    console.error('Error fetching workflow history:', error);
    res.status(500).json({
      error: 'Failed to fetch workflow history',
      message: error.message
    });
  }
});

/**
 * GET /orchestration/services/:serviceName/dependencies
 * Get dependency graph for a specific service
 */
router.get('/services/:serviceName/dependencies', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const service = req.orchestration.getService(serviceName);
    const dependencies = req.orchestration.dependencies.get(serviceName) || [];
    
    // Get reverse dependencies (services that depend on this one)
    const reverseDependencies = [];
    req.orchestration.dependencies.forEach((deps, name) => {
      if (deps.includes(serviceName)) {
        reverseDependencies.push(name);
      }
    });
    
    res.json({
      success: true,
      service: serviceName,
      dependencies: dependencies.map(dep => ({
        name: dep,
        healthy: req.orchestration.isServiceHealthy(dep),
        exists: req.orchestration.services.has(dep)
      })),
      reverseDependencies: reverseDependencies.map(dep => ({
        name: dep,
        healthy: req.orchestration.isServiceHealthy(dep)
      })),
      dependencyGraph: {
        incoming: dependencies.length,
        outgoing: reverseDependencies.length
      }
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Service not found',
        message: error.message
      });
    }
    
    console.error('Error fetching service dependencies:', error);
    res.status(500).json({
      error: 'Failed to fetch service dependencies',
      message: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Orchestration API error:', error);
  
  res.status(500).json({
    error: 'Internal orchestration error',
    message: error.message,
    timestamp: new Date()
  });
});

export default router;