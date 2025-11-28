/**
 * FANZ Automated Workflow Engine API Routes
 * REST API endpoints for workflow management and monitoring
 * Phase 13 - Enterprise Integration
 */

import express from 'express';
const router = express.Router();

/**
 * Get workflow statistics and overview
 */
router.get('/stats', async (req, res) => {
  try {
    if (!req.app.locals.workflowEngine) {
      return res.status(503).json({ 
        error: 'Workflow Engine not available',
        message: 'The automated workflow engine is not initialized'
      });
    }

    const stats = req.app.locals.workflowEngine.getWorkflowStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching workflow stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch workflow statistics',
      message: error.message 
    });
  }
});

/**
 * Get all workflows
 */
router.get('/workflows', async (req, res) => {
  try {
    if (!req.app.locals.workflowEngine) {
      return res.status(503).json({ 
        error: 'Workflow Engine not available' 
      });
    }

    const { status, priority, limit } = req.query;
    let workflows = req.app.locals.workflowEngine.getWorkflows();

    // Apply filters
    if (status) {
      workflows = workflows.filter(w => w.status === status);
    }

    if (priority) {
      workflows = workflows.filter(w => w.priority === priority);
    }

    // Apply limit
    if (limit && !isNaN(parseInt(limit))) {
      workflows = workflows.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      data: workflows,
      count: workflows.length,
      timestamp: new Date().toISOString()
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
 * Get specific workflow by ID
 */
router.get('/workflows/:workflowId', async (req, res) => {
  try {
    if (!req.app.locals.workflowEngine) {
      return res.status(503).json({ 
        error: 'Workflow Engine not available' 
      });
    }

    const { workflowId } = req.params;
    const workflow = req.app.locals.workflowEngine.getWorkflow(workflowId);

    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `Workflow with ID '${workflowId}' does not exist`
      });
    }

    res.json({
      success: true,
      data: workflow,
      timestamp: new Date().toISOString()
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
 * Create new workflow
 */
router.post('/workflows', async (req, res) => {
  try {
    if (!req.app.locals.workflowEngine) {
      return res.status(503).json({ 
        error: 'Workflow Engine not available' 
      });
    }

    const { id, name, description, triggers, conditions, actions, cooldown, priority } = req.body;

    // Validate required fields
    if (!id || !name || !triggers || !actions) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'id, name, triggers, and actions are required'
      });
    }

    // Validate triggers array
    if (!Array.isArray(triggers) || triggers.length === 0) {
      return res.status(400).json({
        error: 'Invalid triggers',
        message: 'triggers must be a non-empty array'
      });
    }

    // Validate actions array
    if (!Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({
        error: 'Invalid actions',
        message: 'actions must be a non-empty array'
      });
    }

    // Check if workflow already exists
    if (req.app.locals.workflowEngine.getWorkflow(id)) {
      return res.status(409).json({
        error: 'Workflow already exists',
        message: `Workflow with ID '${id}' already exists`
      });
    }

    const workflowConfig = {
      name,
      description: description || '',
      triggers,
      conditions: conditions || [],
      actions,
      cooldown: cooldown || 0,
      priority: priority || 'medium'
    };

    const workflow = req.app.locals.workflowEngine.createWorkflow(id, workflowConfig);

    res.status(201).json({
      success: true,
      data: workflow,
      message: 'Workflow created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ 
      error: 'Failed to create workflow',
      message: error.message 
    });
  }
});

/**
 * Update workflow status
 */
router.patch('/workflows/:workflowId/status', async (req, res) => {
  try {
    if (!req.app.locals.workflowEngine) {
      return res.status(503).json({ 
        error: 'Workflow Engine not available' 
      });
    }

    const { workflowId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Missing status',
        message: 'status field is required'
      });
    }

    if (!['active', 'inactive', 'paused'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'status must be one of: active, inactive, paused'
      });
    }

    const updated = req.app.locals.workflowEngine.updateWorkflowStatus(workflowId, status);

    if (!updated) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `Workflow with ID '${workflowId}' does not exist`
      });
    }

    const workflow = req.app.locals.workflowEngine.getWorkflow(workflowId);

    res.json({
      success: true,
      data: workflow,
      message: 'Workflow status updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating workflow status:', error);
    res.status(500).json({ 
      error: 'Failed to update workflow status',
      message: error.message 
    });
  }
});

/**
 * Manually trigger a workflow
 */
router.post('/workflows/:workflowId/trigger', async (req, res) => {
  try {
    if (!req.app.locals.workflowEngine) {
      return res.status(503).json({ 
        error: 'Workflow Engine not available' 
      });
    }

    const { workflowId } = req.params;
    const { eventData } = req.body;

    const workflow = req.app.locals.workflowEngine.getWorkflow(workflowId);
    if (!workflow) {
      return res.status(404).json({
        error: 'Workflow not found',
        message: `Workflow with ID '${workflowId}' does not exist`
      });
    }

    // Execute the workflow
    const execution = await req.app.locals.workflowEngine.executeWorkflow(
      workflowId, 
      eventData || { source: 'manual-trigger', timestamp: new Date().toISOString() }
    );

    res.json({
      success: true,
      data: execution,
      message: 'Workflow triggered successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering workflow:', error);
    res.status(500).json({ 
      error: 'Failed to trigger workflow',
      message: error.message 
    });
  }
});

/**
 * Get workflow execution history
 */
router.get('/executions', async (req, res) => {
  try {
    if (!req.app.locals.workflowEngine) {
      return res.status(503).json({ 
        error: 'Workflow Engine not available' 
      });
    }

    const { workflowId, status, limit } = req.query;
    const limitNum = limit ? parseInt(limit) : 100;
    
    let executions = req.app.locals.workflowEngine.getExecutionHistory(limitNum);

    // Filter by workflow ID if specified
    if (workflowId) {
      executions = executions.filter(exec => exec.workflowId === workflowId);
    }

    // Filter by status if specified
    if (status) {
      executions = executions.filter(exec => exec.status === status);
    }

    res.json({
      success: true,
      data: executions,
      count: executions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching execution history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch execution history',
      message: error.message 
    });
  }
});

/**
 * Get specific execution details
 */
router.get('/executions/:executionId', async (req, res) => {
  try {
    if (!req.app.locals.workflowEngine) {
      return res.status(503).json({ 
        error: 'Workflow Engine not available' 
      });
    }

    const { executionId } = req.params;
    const executions = req.app.locals.workflowEngine.getExecutionHistory();
    const execution = executions.find(exec => exec.id === executionId);

    if (!execution) {
      return res.status(404).json({
        error: 'Execution not found',
        message: `Execution with ID '${executionId}' does not exist`
      });
    }

    res.json({
      success: true,
      data: execution,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching execution details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch execution details',
      message: error.message 
    });
  }
});

/**
 * Get workflow triggers and their associated workflows
 */
router.get('/triggers', async (req, res) => {
  try {
    if (!req.app.locals.workflowEngine) {
      return res.status(503).json({ 
        error: 'Workflow Engine not available' 
      });
    }

    // Access triggers map from workflow engine
    const triggersMap = req.app.locals.workflowEngine.triggers;
    const triggers = {};

    for (const [triggerName, workflowIds] of triggersMap.entries()) {
      triggers[triggerName] = Array.from(workflowIds);
    }

    res.json({
      success: true,
      data: triggers,
      count: Object.keys(triggers).length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching triggers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch triggers',
      message: error.message 
    });
  }
});

/**
 * Test workflow conditions
 */
router.post('/test/conditions', async (req, res) => {
  try {
    if (!req.app.locals.workflowEngine) {
      return res.status(503).json({ 
        error: 'Workflow Engine not available' 
      });
    }

    const { conditions, eventData } = req.body;

    if (!conditions || !Array.isArray(conditions)) {
      return res.status(400).json({
        error: 'Invalid conditions',
        message: 'conditions must be an array'
      });
    }

    const results = [];
    for (const condition of conditions) {
      try {
        const result = await req.app.locals.workflowEngine.evaluateCondition(condition, eventData || {});
        results.push({
          condition,
          result,
          status: 'success'
        });
      } catch (error) {
        results.push({
          condition,
          result: false,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing conditions:', error);
    res.status(500).json({ 
      error: 'Failed to test conditions',
      message: error.message 
    });
  }
});

/**
 * Simulate trigger event
 */
router.post('/test/trigger', async (req, res) => {
  try {
    if (!req.app.locals.workflowEngine) {
      return res.status(503).json({ 
        error: 'Workflow Engine not available' 
      });
    }

    const { triggerName, eventData } = req.body;

    if (!triggerName) {
      return res.status(400).json({
        error: 'Missing trigger name',
        message: 'triggerName is required'
      });
    }

    // Simulate the trigger
    await req.app.locals.workflowEngine.handleTrigger(
      triggerName, 
      eventData || { source: 'test-trigger', timestamp: new Date().toISOString() }
    );

    res.json({
      success: true,
      message: `Trigger '${triggerName}' simulated successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error simulating trigger:', error);
    res.status(500).json({ 
      error: 'Failed to simulate trigger',
      message: error.message 
    });
  }
});

/**
 * Get workflow engine health status
 */
router.get('/health', async (req, res) => {
  try {
    const isAvailable = !!req.app.locals.workflowEngine;
    const isRunning = isAvailable ? req.app.locals.workflowEngine.isRunning : false;

    let stats = {};
    if (isAvailable) {
      stats = req.app.locals.workflowEngine.getWorkflowStats();
    }

    res.json({
      success: true,
      data: {
        available: isAvailable,
        running: isRunning,
        stats: stats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking workflow engine health:', error);
    res.status(500).json({ 
      error: 'Failed to check health status',
      message: error.message 
    });
  }
});

export default router;