/**
 * Type declarations for serviceDiscoveryHealth.js
 */

declare class ServiceDiscoveryHealth {
  orchestrationEngine: any;
  commandCenter: any;
  workflowEngine: any;
  initialized: boolean;
  services: Map<string, any>;
  healthChecks: Map<string, any>;
  metrics: any;
  config: any;
  isMonitoring: boolean;
  monitoringInterval: any;

  constructor(orchestrationEngine: any, commandCenter: any, workflowEngine: any);

  /**
   * Initialize the service discovery and health monitoring system
   */
  initialize(): Promise<void>;

  /**
   * Register a service
   */
  registerService(serviceId: string, service: any): void;

  /**
   * Get service health status
   */
  getServiceHealth(serviceId: string): any;

  /**
   * Get all services health
   */
  getAllServicesHealth(): any;

  /**
   * Get health metrics
   */
  getMetrics(): any;

  /**
   * Start health monitoring
   */
  startMonitoring(): void;

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void;
}

export default ServiceDiscoveryHealth;
