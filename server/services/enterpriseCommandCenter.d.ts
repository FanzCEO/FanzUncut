/**
 * Type declarations for enterpriseCommandCenter.js
 */

declare class EnterpriseCommandCenter {
  orchestrationEngine: any;
  pipelineIntegration: any;
  initialized: boolean;
  dashboards: Map<string, any>;
  metrics: any;

  constructor(orchestrationEngine: any, pipelineIntegration: any);

  /**
   * Initialize the command center
   */
  initialize(): Promise<void>;

  /**
   * Get dashboard data
   */
  getDashboard(dashboardId: string): any;

  /**
   * Get real-time metrics
   */
  getMetrics(): any;

  /**
   * Execute command
   */
  executeCommand(command: string, params: any): Promise<any>;
}

export default EnterpriseCommandCenter;
