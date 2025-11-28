/**
 * Type declarations for serviceRegistry.js
 */

declare class ServiceRegistry {
  orchestrationEngine: any;
  initialized: boolean;

  constructor();

  /**
   * Initialize and register all platform services
   */
  initialize(): Promise<any>;

  /**
   * Register infrastructure services
   */
  registerInfrastructureServices(): Promise<void>;

  /**
   * Register business logic services
   */
  registerBusinessServices(): Promise<void>;

  /**
   * Register AI and analytics services
   */
  registerIntelligenceServices(): Promise<void>;

  /**
   * Define common workflows
   */
  registerWorkflows(): Promise<void>;
}

export default ServiceRegistry;
