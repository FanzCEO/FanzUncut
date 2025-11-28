/**
 * Type declarations for automatedWorkflowEngine.js
 */

declare class AutomatedWorkflowEngine {
  orchestrationEngine: any;
  dataPipeline: any;
  commandCenter: any;
  initialized: boolean;
  workflows: Map<string, any>;
  rules: Map<string, any>;
  triggers: Map<string, any>;
  executionHistory: any[];
  activeWorkflows: Map<string, any>;
  metrics: any;
  config: any;
  isRunning: boolean;
  cleanupInterval: any;

  constructor(orchestrationEngine: any, dataPipeline: any, commandCenter: any);

  /**
   * Initialize the workflow engine
   */
  initialize(): Promise<void>;

  /**
   * Register a workflow
   */
  registerWorkflow(workflowId: string, workflow: any): void;

  /**
   * Execute a workflow
   */
  executeWorkflow(workflowId: string, context: any): Promise<any>;

  /**
   * Get workflow metrics
   */
  getMetrics(): any;

  /**
   * Start the workflow engine
   */
  start(): void;

  /**
   * Stop the workflow engine
   */
  stop(): void;
}

export default AutomatedWorkflowEngine;
