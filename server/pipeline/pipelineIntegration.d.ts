/**
 * Type declarations for pipelineIntegration.js
 */

declare class PipelineIntegration {
  orchestrationEngine: any;
  initialized: boolean;
  dataPipeline: any;
  metrics: any;

  constructor(orchestrationEngine: any);

  /**
   * Initialize the pipeline integration
   */
  initialize(): Promise<void>;

  /**
   * Process data through the pipeline
   */
  processData(data: any): Promise<any>;

  /**
   * Get pipeline metrics
   */
  getMetrics(): any;
}

export default PipelineIntegration;
