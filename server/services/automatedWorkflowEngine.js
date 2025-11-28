/**
 * FANZ Automated Workflow Engine
 * Intelligent rule-based automation system for cross-service actions
 * Phase 13 - Enterprise Integration
 */

const EventEmitter = require('events');

class AutomatedWorkflowEngine extends EventEmitter {
  constructor(orchestrationEngine, dataPipeline, commandCenter) {
    super();
    this.orchestrationEngine = orchestrationEngine;
    this.dataPipeline = dataPipeline;
    this.commandCenter = commandCenter;
    
    // Workflow states
    this.workflows = new Map();
    this.rules = new Map();
    this.triggers = new Map();
    this.executionHistory = [];
    this.activeWorkflows = new Map();
    
    // Performance tracking
    this.metrics = {
      workflowsExecuted: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      rulesTriggered: 0,
      automationSavings: 0
    };
    
    // Configuration
    this.config = {
      maxConcurrentWorkflows: 50,
      executionTimeout: 300000, // 5 minutes
      retryAttempts: 3,
      retryDelay: 5000,
      historyRetention: 30 // days
    };
    
    this.isRunning = false;
    this.cleanupInterval = null;
  }

  /**
   * Initialize the workflow engine
   */
  async initialize() {
    try {
      console.log('🤖 Initializing Automated Workflow Engine...');
      
      // Load default workflows and rules
      await this.loadDefaultWorkflows();
      await this.setupEventListeners();
      await this.startCleanupProcess();
      
      this.isRunning = true;
      this.emit('engine:initialized');
      
      console.log('✅ Automated Workflow Engine initialized successfully');
      
      // Register with command center
      if (this.commandCenter) {
        this.commandCenter.registerService({
          name: 'AutomatedWorkflowEngine',
          status: 'healthy',
          metrics: this.metrics,
          lastHeartbeat: new Date()
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Automated Workflow Engine:', error);
      this.emit('engine:error', error);
      throw error;
    }
  }

  /**
   * Load default workflows and automation rules
   */
  async loadDefaultWorkflows() {
    // Revenue optimization workflow
    this.createWorkflow('revenue-optimization', {
      name: 'Revenue Optimization Automation',
      description: 'Automatically optimize pricing and promotions based on AI insights',
      triggers: ['revenue-ai:insight-generated', 'analytics:revenue-decline'],
      conditions: [
        { type: 'revenue-threshold', operator: 'less_than', value: 0.8 },
        { type: 'engagement-score', operator: 'greater_than', value: 0.6 }
      ],
      actions: [
        { service: 'pricing-engine', action: 'optimize-pricing', params: {} },
        { service: 'promotion-engine', action: 'create-promotion', params: { type: 'limited-time' } },
        { service: 'notification-service', action: 'notify-creators', params: { template: 'pricing-update' } },
        { service: 'analytics-service', action: 'track-optimization', params: {} }
      ],
      cooldown: 3600000, // 1 hour
      priority: 'high'
    });

    // Content optimization workflow  
    this.createWorkflow('content-optimization', {
      name: 'Content Performance Optimization',
      description: 'Automatically optimize content strategy based on performance data',
      triggers: ['content-ai:performance-analysis', 'analytics:content-metrics'],
      conditions: [
        { type: 'content-performance', operator: 'less_than', value: 0.5 },
        { type: 'engagement-trend', operator: 'equals', value: 'declining' }
      ],
      actions: [
        { service: 'content-ai', action: 'generate-suggestions', params: {} },
        { service: 'creator-dashboard', action: 'update-recommendations', params: {} },
        { service: 'notification-service', action: 'send-tips', params: { type: 'content-optimization' } },
        { service: 'analytics-service', action: 'track-suggestions', params: {} }
      ],
      cooldown: 7200000, // 2 hours
      priority: 'medium'
    });

    // Fan engagement workflow
    this.createWorkflow('fan-engagement', {
      name: 'Fan Engagement Automation',
      description: 'Automatically boost fan engagement based on activity patterns',
      triggers: ['engagement-ai:low-activity-detected', 'user-analytics:churn-risk'],
      conditions: [
        { type: 'engagement-score', operator: 'less_than', value: 0.3 },
        { type: 'last-activity', operator: 'older_than', value: 604800000 } // 7 days
      ],
      actions: [
        { service: 'engagement-engine', action: 'create-personalized-campaign', params: {} },
        { service: 'content-service', action: 'recommend-content', params: { type: 're-engagement' } },
        { service: 'notification-service', action: 'send-comeback-offer', params: {} },
        { service: 'analytics-service', action: 'track-reengagement', params: {} }
      ],
      cooldown: 86400000, // 24 hours
      priority: 'medium'
    });

    // System health workflow
    this.createWorkflow('system-health', {
      name: 'System Health Automation',
      description: 'Automatically respond to system health issues',
      triggers: ['monitoring:service-down', 'performance:degradation-detected'],
      conditions: [
        { type: 'service-health', operator: 'equals', value: 'unhealthy' },
        { type: 'response-time', operator: 'greater_than', value: 5000 }
      ],
      actions: [
        { service: 'orchestration-engine', action: 'restart-service', params: {} },
        { service: 'load-balancer', action: 'reroute-traffic', params: {} },
        { service: 'notification-service', action: 'alert-ops-team', params: { urgency: 'high' } },
        { service: 'monitoring-service', action: 'increase-monitoring', params: {} }
      ],
      cooldown: 300000, // 5 minutes
      priority: 'critical'
    });

    console.log(`📋 Loaded ${this.workflows.size} default workflows`);
  }

  /**
   * Create a new workflow
   */
  createWorkflow(id, config) {
    const workflow = {
      id,
      ...config,
      created: new Date(),
      lastExecuted: null,
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: 0,
      status: 'active'
    };

    this.workflows.set(id, workflow);
    
    // Register triggers
    for (const trigger of config.triggers) {
      if (!this.triggers.has(trigger)) {
        this.triggers.set(trigger, new Set());
      }
      this.triggers.get(trigger).add(id);
    }

    this.emit('workflow:created', { workflowId: id, workflow });
    console.log(`🔄 Created workflow: ${config.name}`);
    
    return workflow;
  }

  /**
   * Set up event listeners for triggers
   */
  async setupEventListeners() {
    // Listen to orchestration engine events
    if (this.orchestrationEngine) {
      this.orchestrationEngine.on('service:status-change', (event) => {
        this.handleTrigger('monitoring:service-status-change', event);
      });
      
      this.orchestrationEngine.on('workflow:completed', (event) => {
        this.handleTrigger('orchestration:workflow-completed', event);
      });
    }

    // Listen to data pipeline events
    if (this.dataPipeline) {
      this.dataPipeline.on('insights:generated', (event) => {
        this.handleTrigger(`${event.source}:insight-generated`, event);
      });
      
      this.dataPipeline.on('metrics:threshold-exceeded', (event) => {
        this.handleTrigger('analytics:threshold-exceeded', event);
      });
    }

    // Listen to command center events
    if (this.commandCenter) {
      this.commandCenter.on('alert:created', (event) => {
        this.handleTrigger('monitoring:alert-created', event);
      });
      
      this.commandCenter.on('performance:degradation', (event) => {
        this.handleTrigger('performance:degradation-detected', event);
      });
    }

    console.log('👂 Event listeners configured');
  }

  /**
   * Handle incoming triggers
   */
  async handleTrigger(triggerName, eventData) {
    try {
      if (!this.triggers.has(triggerName)) {
        return; // No workflows for this trigger
      }

      const workflowIds = this.triggers.get(triggerName);
      const triggeredWorkflows = [];

      for (const workflowId of workflowIds) {
        const workflow = this.workflows.get(workflowId);
        if (workflow && await this.shouldExecuteWorkflow(workflow, eventData)) {
          triggeredWorkflows.push(workflowId);
        }
      }

      if (triggeredWorkflows.length > 0) {
        console.log(`🎯 Trigger '${triggerName}' activated ${triggeredWorkflows.length} workflows`);
        
        // Execute workflows in priority order
        const sortedWorkflows = triggeredWorkflows
          .map(id => this.workflows.get(id))
          .sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority));

        for (const workflow of sortedWorkflows) {
          await this.executeWorkflow(workflow.id, eventData);
        }

        this.metrics.rulesTriggered++;
      }
    } catch (error) {
      console.error(`❌ Error handling trigger '${triggerName}':`, error);
      this.emit('trigger:error', { triggerName, error });
    }
  }

  /**
   * Check if workflow should be executed
   */
  async shouldExecuteWorkflow(workflow, eventData) {
    try {
      // Check if workflow is active
      if (workflow.status !== 'active') {
        return false;
      }

      // Check cooldown
      if (workflow.lastExecuted && workflow.cooldown) {
        const timeSinceLastExecution = Date.now() - workflow.lastExecuted.getTime();
        if (timeSinceLastExecution < workflow.cooldown) {
          return false;
        }
      }

      // Check conditions
      if (workflow.conditions && workflow.conditions.length > 0) {
        for (const condition of workflow.conditions) {
          if (!await this.evaluateCondition(condition, eventData)) {
            return false;
          }
        }
      }

      // Check concurrent execution limit
      if (this.activeWorkflows.size >= this.config.maxConcurrentWorkflows) {
        return false;
      }

      return true;
    } catch (error) {
      console.error(`❌ Error evaluating workflow conditions:`, error);
      return false;
    }
  }

  /**
   * Evaluate a condition
   */
  async evaluateCondition(condition, eventData) {
    try {
      let value = eventData[condition.type] || await this.fetchConditionValue(condition.type, eventData);
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'greater_than':
          return value > condition.value;
        case 'less_than':
          return value < condition.value;
        case 'greater_equal':
          return value >= condition.value;
        case 'less_equal':
          return value <= condition.value;
        case 'contains':
          return String(value).includes(condition.value);
        case 'older_than':
          return (Date.now() - new Date(value).getTime()) > condition.value;
        case 'newer_than':
          return (Date.now() - new Date(value).getTime()) < condition.value;
        default:
          return true;
      }
    } catch (error) {
      console.error(`❌ Error evaluating condition:`, error);
      return false;
    }
  }

  /**
   * Fetch condition value from external sources
   */
  async fetchConditionValue(conditionType, eventData) {
    // This would integrate with your data sources to fetch real-time values
    // For now, return mock values
    switch (conditionType) {
      case 'revenue-threshold':
        return Math.random(); // Mock revenue ratio
      case 'engagement-score':
        return Math.random(); // Mock engagement score
      case 'content-performance':
        return Math.random(); // Mock performance score
      case 'service-health':
        return 'healthy'; // Mock service health
      case 'response-time':
        return Math.random() * 10000; // Mock response time
      default:
        return null;
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId, eventData) {
    const startTime = Date.now();
    let executionId = `exec_${workflowId}_${Date.now()}`;
    
    try {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow '${workflowId}' not found`);
      }

      console.log(`🚀 Executing workflow: ${workflow.name} (${executionId})`);
      
      // Mark as active
      this.activeWorkflows.set(executionId, {
        workflowId,
        startTime,
        status: 'running',
        eventData
      });

      this.emit('workflow:started', { workflowId, executionId, eventData });

      // Execute actions in sequence
      const results = [];
      for (let i = 0; i < workflow.actions.length; i++) {
        const action = workflow.actions[i];
        
        try {
          const result = await this.executeAction(action, eventData, { workflowId, executionId });
          results.push({ action: i, status: 'success', result });
        } catch (actionError) {
          console.error(`❌ Action ${i} failed in workflow ${workflowId}:`, actionError);
          results.push({ action: i, status: 'error', error: actionError.message });
          
          // Continue execution unless it's a critical failure
          if (action.critical === true) {
            throw actionError;
          }
        }
      }

      // Calculate execution time
      const executionTime = Date.now() - startTime;
      
      // Update workflow stats
      workflow.lastExecuted = new Date();
      workflow.executionCount++;
      workflow.successCount++;
      workflow.averageExecutionTime = 
        (workflow.averageExecutionTime * (workflow.executionCount - 1) + executionTime) / workflow.executionCount;

      // Record execution history
      const execution = {
        id: executionId,
        workflowId,
        startTime: new Date(startTime),
        endTime: new Date(),
        executionTime,
        status: 'success',
        eventData,
        results,
        createdAt: new Date()
      };
      
      this.executionHistory.push(execution);
      this.activeWorkflows.delete(executionId);
      
      // Update metrics
      this.metrics.workflowsExecuted++;
      this.metrics.successfulExecutions++;
      this.metrics.averageExecutionTime = 
        (this.metrics.averageExecutionTime * (this.metrics.workflowsExecuted - 1) + executionTime) / this.metrics.workflowsExecuted;

      this.emit('workflow:completed', { workflowId, executionId, execution });
      
      console.log(`✅ Workflow completed: ${workflow.name} (${executionTime}ms)`);
      
      return execution;
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Update failure stats
      const workflow = this.workflows.get(workflowId);
      if (workflow) {
        workflow.failureCount++;
      }
      
      // Record failed execution
      const execution = {
        id: executionId,
        workflowId,
        startTime: new Date(startTime),
        endTime: new Date(),
        executionTime,
        status: 'failed',
        eventData,
        error: error.message,
        createdAt: new Date()
      };
      
      this.executionHistory.push(execution);
      this.activeWorkflows.delete(executionId);
      
      // Update metrics
      this.metrics.workflowsExecuted++;
      this.metrics.failedExecutions++;
      
      this.emit('workflow:failed', { workflowId, executionId, execution, error });
      
      console.error(`❌ Workflow failed: ${workflow?.name || workflowId} (${executionTime}ms):`, error);
      
      throw error;
    }
  }

  /**
   * Execute a single action
   */
  async executeAction(action, eventData, context) {
    try {
      // Prepare action parameters
      const params = {
        ...action.params,
        eventData,
        workflowId: context.workflowId,
        executionId: context.executionId
      };

      // Route action to appropriate service
      if (this.orchestrationEngine && action.service !== 'workflow-engine') {
        return await this.orchestrationEngine.executeServiceAction(action.service, action.action, params);
      } else {
        // Handle internal workflow engine actions
        return await this.executeInternalAction(action, params);
      }
    } catch (error) {
      console.error(`❌ Action execution failed:`, error);
      throw error;
    }
  }

  /**
   * Execute internal workflow engine actions
   */
  async executeInternalAction(action, params) {
    switch (action.action) {
      case 'wait':
        await new Promise(resolve => setTimeout(resolve, params.duration || 1000));
        return { action: 'wait', duration: params.duration || 1000 };
        
      case 'log':
        console.log(`📝 Workflow log: ${params.message}`);
        return { action: 'log', message: params.message };
        
      case 'trigger-workflow':
        await this.executeWorkflow(params.workflowId, params.eventData || {});
        return { action: 'trigger-workflow', workflowId: params.workflowId };
        
      case 'send-alert':
        if (this.commandCenter) {
          this.commandCenter.createAlert({
            title: params.title || 'Workflow Alert',
            message: params.message,
            severity: params.severity || 'info',
            source: 'workflow-engine',
            metadata: params
          });
        }
        return { action: 'send-alert', title: params.title };
        
      default:
        throw new Error(`Unknown internal action: ${action.action}`);
    }
  }

  /**
   * Get priority value for sorting
   */
  getPriorityValue(priority) {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * Start cleanup process
   */
  async startCleanupProcess() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExecutionHistory();
    }, 3600000); // Run every hour
  }

  /**
   * Clean up old execution history
   */
  cleanupExecutionHistory() {
    const cutoffDate = new Date(Date.now() - (this.config.historyRetention * 24 * 60 * 60 * 1000));
    const beforeCount = this.executionHistory.length;
    
    this.executionHistory = this.executionHistory.filter(exec => 
      exec.createdAt > cutoffDate
    );
    
    const removedCount = beforeCount - this.executionHistory.length;
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} old workflow executions`);
    }
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStats() {
    const stats = {
      totalWorkflows: this.workflows.size,
      activeWorkflows: Array.from(this.workflows.values()).filter(w => w.status === 'active').length,
      totalTriggers: this.triggers.size,
      executionHistory: this.executionHistory.length,
      currentlyExecuting: this.activeWorkflows.size,
      metrics: { ...this.metrics }
    };

    // Calculate success rate
    stats.metrics.successRate = this.metrics.workflowsExecuted > 0 
      ? (this.metrics.successfulExecutions / this.metrics.workflowsExecuted * 100).toFixed(2)
      : 0;

    return stats;
  }

  /**
   * Get all workflows
   */
  getWorkflows() {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId) {
    return this.workflows.get(workflowId);
  }

  /**
   * Get execution history
   */
  getExecutionHistory(limit = 100) {
    return this.executionHistory
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Update workflow status
   */
  updateWorkflowStatus(workflowId, status) {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.status = status;
      this.emit('workflow:status-changed', { workflowId, status });
      return true;
    }
    return false;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down Automated Workflow Engine...');
    
    this.isRunning = false;
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Wait for active workflows to complete (with timeout)
    if (this.activeWorkflows.size > 0) {
      console.log(`⏳ Waiting for ${this.activeWorkflows.size} active workflows to complete...`);
      
      const timeout = setTimeout(() => {
        console.log('⚠️ Workflow engine shutdown timeout - forcing shutdown');
      }, 30000); // 30 second timeout
      
      while (this.activeWorkflows.size > 0 && this.isRunning !== 'force_shutdown') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      clearTimeout(timeout);
    }
    
    this.emit('engine:shutdown');
    console.log('✅ Automated Workflow Engine shut down successfully');
  }
}

module.exports = AutomatedWorkflowEngine;