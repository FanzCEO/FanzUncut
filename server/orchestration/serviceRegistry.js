// FANZ Service Registry & Orchestration Setup
// Registers all platform services and defines common workflows

import ServiceOrchestrationEngine from '../services/serviceOrchestrationEngine.js';

// Import all service instances
import { authService } from '../services/authService.js';
import { moderationService } from '../services/moderationService.js';
import { notificationService } from '../services/notificationService.js';
import { analyticsService } from '../services/analyticsService.js';
import apiGatewayService from '../services/apiGatewayService.js';

class ServiceRegistry {
  constructor() {
    this.orchestrationEngine = new ServiceOrchestrationEngine();
    this.initialized = false;
  }

  /**
   * Initialize and register all platform services
   */
  async initialize() {
    if (this.initialized) {
      console.log('🎭 Service registry already initialized');
      return this.orchestrationEngine;
    }

    console.log('🎭 Initializing FANZ Service Registry...');

    try {
      // Register core infrastructure services
      await this.registerInfrastructureServices();
      
      // Register business logic services
      await this.registerBusinessServices();
      
      // Register AI and analytics services
      await this.registerIntelligenceServices();
      
      // Define common workflows
      await this.registerWorkflows();
      
      // Set up event-based triggers
      this.orchestrationEngine.setupTriggers();
      
      this.initialized = true;
      console.log('✅ Service registry initialization complete');
      
      return this.orchestrationEngine;
    } catch (error) {
      console.error('❌ Service registry initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register infrastructure and gateway services
   */
  async registerInfrastructureServices() {
    console.log('📡 Registering infrastructure services...');

    try {
      // API Gateway Service
      this.orchestrationEngine.registerService({
        name: 'apiGateway',
        instance: apiGatewayService,
        healthCheck: () => apiGatewayService.getHealthStatus(),
        capabilities: ['routing', 'rate-limiting', 'load-balancing', 'circuit-breaker'],
        priority: 'critical',
        dependencies: [],
        timeout: 5000
      });
    } catch (error) {
      console.warn('⚠️  Could not register apiGateway service:', error.message);
    }
  }

  /**
   * Register core business logic services
   */
  async registerBusinessServices() {
    console.log('🏢 Registering business services...');

    try {
      // Auth Service
      this.orchestrationEngine.registerService({
        name: 'auth',
        instance: authService,
        healthCheck: async () => {
          try {
            // Simple health check - verify JWT functions work
            const testToken = authService.generateToken({ test: true }, '1s');
            const decoded = authService.verifyToken(testToken);
            return { healthy: !!decoded, component: 'auth' };
          } catch (error) {
            return { healthy: false, error: error.message };
          }
        },
        capabilities: ['authentication', 'authorization', 'jwt', 'session-management'],
        priority: 'critical',
        dependencies: [],
        timeout: 10000
      });
    } catch (error) {
      console.warn('⚠️  Could not register auth service:', error.message);
    }

    try {
      // Moderation Service
      this.orchestrationEngine.registerService({
        name: 'moderation',
        instance: moderationService,
        healthCheck: async () => {
          return { healthy: true, component: 'moderation' };
        },
        capabilities: ['content-moderation', 'ai-moderation', 'manual-review'],
        priority: 'high',
        dependencies: [],
        timeout: 15000
      });
    } catch (error) {
      console.warn('⚠️  Could not register moderation service:', error.message);
    }

    try {
      // Notification Service
      this.orchestrationEngine.registerService({
        name: 'notification',
        instance: notificationService,
        healthCheck: async () => {
          return { healthy: true, component: 'notification' };
        },
        capabilities: ['push-notifications', 'email', 'sms'],
        priority: 'medium',
        dependencies: [],
        timeout: 10000
      });
    } catch (error) {
      console.warn('⚠️  Could not register notification service:', error.message);
    }
  }

  /**
   * Register AI and analytics services (stub - advanced services optional)
   */
  async registerIntelligenceServices() {
    console.log('🤖 Registering intelligence services...');

    try {
      // Analytics Service
      this.orchestrationEngine.registerService({
        name: 'analytics',
        instance: analyticsService,
        healthCheck: async () => {
          return { healthy: true, component: 'analytics' };
        },
        capabilities: ['user-analytics', 'content-analytics', 'revenue-tracking'],
        priority: 'medium',
        dependencies: [],
        timeout: 15000
      });
    } catch (error) {
      console.warn('⚠️  Could not register analytics service:', error.message);
    }
  }

  /**
   * Register common workflows (stub - to be implemented)
   */
  async registerWorkflows() {
    console.log('🔄 Registering workflows...');
    
    // Workflows registration skipped for now
    // TODO: Implement common workflows when all services are available
  }
}

export default ServiceRegistry;
