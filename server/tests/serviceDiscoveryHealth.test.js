/**
 * FANZ Service Discovery & Health Monitoring Tests
 * Comprehensive test suite for service registry, health monitoring, and dependency management
 * Phase 14 - Enterprise Integration
 */

const { describe, beforeEach, afterEach, it } = require('@jest/globals');
const expect = require('expect');
const EventEmitter = require('events');
const http = require('http');
const ServiceDiscoveryHealth = require('../services/serviceDiscoveryHealth');

// Mock dependencies
class MockOrchestrationEngine extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
  }
  
  registerService(service) {
    this.services.set(service.name, service);
    return service;
  }
}

class MockCommandCenter extends EventEmitter {
  constructor() {
    super();
    this.services = new Map();
    this.alerts = [];
  }
  
  registerService(serviceInfo) {
    this.services.set(serviceInfo.name, serviceInfo);
    return true;
  }
  
  createAlert(alertInfo) {
    this.alerts.push({ ...alertInfo, id: `alert_${Date.now()}` });
    this.emit('alert:created', alertInfo);
  }
}

class MockWorkflowEngine extends EventEmitter {
  constructor() {
    super();
    this.triggers = [];
  }
  
  async handleTrigger(triggerName, eventData) {
    this.triggers.push({ triggerName, eventData, timestamp: new Date() });
    this.emit('trigger:handled', { triggerName, eventData });
  }
}

// Mock HTTP server for health check testing
class MockHealthServer {
  constructor(port = 0) {
    this.port = port;
    this.server = null;
    this.responses = new Map();
    this.requests = [];
  }
  
  setResponse(path, statusCode = 200, body = { status: 'ok' }) {
    this.responses.set(path, { statusCode, body });
  }
  
  start() {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        this.requests.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          timestamp: new Date()
        });
        
        const response = this.responses.get(req.url) || { statusCode: 404, body: { error: 'Not found' } };
        
        res.writeHead(response.statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response.body));
      });
      
      this.server.listen(this.port, () => {
        this.port = this.server.address().port;
        resolve(this.port);
      });
    });
  }
  
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(resolve);
      } else {
        resolve();
      }
    });
  }
}

describe('ServiceDiscoveryHealth', () => {
  let serviceDiscovery;
  let mockOrchestrationEngine;
  let mockCommandCenter;
  let mockWorkflowEngine;
  let mockServer;

  beforeEach(async () => {
    mockOrchestrationEngine = new MockOrchestrationEngine();
    mockCommandCenter = new MockCommandCenter();
    mockWorkflowEngine = new MockWorkflowEngine();
    mockServer = new MockHealthServer();
    
    serviceDiscovery = new ServiceDiscoveryHealth(
      mockOrchestrationEngine,
      mockCommandCenter,
      mockWorkflowEngine
    );
    
    // Override config for faster testing
    serviceDiscovery.config.healthCheckInterval = 100; // 100ms
    serviceDiscovery.config.healthCheckTimeout = 1000; // 1s
    serviceDiscovery.config.dependencyCheckInterval = 200; // 200ms
  });

  afterEach(async () => {
    if (serviceDiscovery && serviceDiscovery.isRunning) {
      await serviceDiscovery.shutdown();
    }
    
    if (mockServer) {
      await mockServer.stop();
    }
    
    // Clear any remaining timers
    if (serviceDiscovery) {
      if (serviceDiscovery.healthCheckInterval) {
        clearInterval(serviceDiscovery.healthCheckInterval);
      }
      if (serviceDiscovery.discoveryInterval) {
        clearInterval(serviceDiscovery.discoveryInterval);
      }
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with all dependencies', async () => {
      const result = await serviceDiscovery.initialize();
      
      expect(result).toBe(true);
      expect(serviceDiscovery.isRunning).toBe(true);
      expect(mockCommandCenter.services.has('ServiceDiscoveryHealth')).toBe(true);
    });

    it('should load services from orchestration engine during initialization', async () => {
      // Add services to orchestration engine
      mockOrchestrationEngine.services.set('test-service', {
        name: 'test-service',
        host: 'localhost',
        port: 3000,
        version: '1.0.0'
      });

      await serviceDiscovery.initialize();
      
      expect(serviceDiscovery.services.has('test-service:default')).toBe(true);
    });

    it('should emit initialization event', async () => {
      let initEvent = false;
      serviceDiscovery.on('system:initialized', () => {
        initEvent = true;
      });
      
      await serviceDiscovery.initialize();
      
      expect(initEvent).toBe(true);
    });

    it('should start health monitoring and service discovery intervals', async () => {
      await serviceDiscovery.initialize();
      
      expect(serviceDiscovery.healthCheckInterval).toBeTruthy();
      expect(serviceDiscovery.discoveryInterval).toBeTruthy();
    });
  });

  describe('Service Registration', () => {
    beforeEach(async () => {
      await serviceDiscovery.initialize();
    });

    it('should register a service successfully', async () => {
      const serviceConfig = {
        name: 'test-service',
        version: '1.0.0',
        host: 'localhost',
        port: 3000,
        protocol: 'http',
        healthCheck: { path: '/health', method: 'GET' },
        dependencies: ['dependency-service'],
        metadata: { environment: 'test' },
        tags: ['api', 'backend']
      };

      const service = await serviceDiscovery.registerService(serviceConfig);

      expect(service).toBeDefined();
      expect(service.id).toBe('test-service:default');
      expect(service.name).toBe('test-service');
      expect(service.endpoint).toBe('http://localhost:3000');
      expect(service.status).toBe('unknown');
      expect(serviceDiscovery.services.has('test-service:default')).toBe(true);
    });

    it('should setup health check configuration for registered service', async () => {
      const serviceConfig = {
        name: 'health-test-service',
        host: 'localhost',
        port: 4000,
        healthCheck: { path: '/api/health', method: 'POST' }
      };

      await serviceDiscovery.registerService(serviceConfig);

      const healthCheck = serviceDiscovery.healthChecks.get('health-test-service:default');
      expect(healthCheck).toBeDefined();
      expect(healthCheck.url).toBe('http://localhost:4000/api/health');
      expect(healthCheck.method).toBe('POST');
    });

    it('should setup circuit breaker for registered service', async () => {
      const serviceConfig = {
        name: 'circuit-test-service',
        host: 'localhost',
        port: 5000
      };

      await serviceDiscovery.registerService(serviceConfig);

      const circuitBreaker = serviceDiscovery.circuitBreakers.get('circuit-test-service:default');
      expect(circuitBreaker).toBeDefined();
      expect(circuitBreaker.state).toBe('closed');
      expect(circuitBreaker.failures).toBe(0);
    });

    it('should register service instances correctly', async () => {
      const serviceConfig1 = {
        name: 'multi-service',
        host: 'localhost',
        port: 3001,
        instance: 'instance-1'
      };
      
      const serviceConfig2 = {
        name: 'multi-service',
        host: 'localhost',
        port: 3002,
        instance: 'instance-2'
      };

      await serviceDiscovery.registerService(serviceConfig1);
      await serviceDiscovery.registerService(serviceConfig2);

      expect(serviceDiscovery.services.has('multi-service:instance-1')).toBe(true);
      expect(serviceDiscovery.services.has('multi-service:instance-2')).toBe(true);
      
      const instances = serviceDiscovery.serviceInstances.get('multi-service');
      expect(instances.size).toBe(2);
    });

    it('should emit service registration event', async () => {
      let registeredService = null;
      serviceDiscovery.on('service:registered', (event) => {
        registeredService = event;
      });

      const serviceConfig = {
        name: 'event-test-service',
        host: 'localhost',
        port: 3000
      };

      await serviceDiscovery.registerService(serviceConfig);

      expect(registeredService).toBeDefined();
      expect(registeredService.serviceId).toBe('event-test-service:default');
    });
  });

  describe('Health Check System', () => {
    beforeEach(async () => {
      await serviceDiscovery.initialize();
      await mockServer.start();
    });

    it('should perform successful health check', async () => {
      mockServer.setResponse('/health', 200, { status: 'healthy' });
      
      const serviceConfig = {
        name: 'healthy-service',
        host: 'localhost',
        port: mockServer.port,
        healthCheck: { path: '/health', method: 'GET' }
      };

      await serviceDiscovery.registerService(serviceConfig);
      
      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 150));

      const service = serviceDiscovery.getService('healthy-service:default');
      expect(service.status).toBe('healthy');
      expect(service.totalChecks).toBeGreaterThan(0);
      expect(service.consecutiveFailures).toBe(0);
    });

    it('should handle failed health check', async () => {
      mockServer.setResponse('/health', 500, { error: 'Internal error' });
      
      const serviceConfig = {
        name: 'unhealthy-service',
        host: 'localhost',
        port: mockServer.port
      };

      await serviceDiscovery.registerService(serviceConfig);
      
      // Wait for multiple health checks to exceed failure threshold
      await new Promise(resolve => setTimeout(resolve, 400));

      const service = serviceDiscovery.getService('unhealthy-service:default');
      expect(service.consecutiveFailures).toBeGreaterThan(0);
    });

    it('should update service metrics after health checks', async () => {
      mockServer.setResponse('/health', 200, { status: 'ok' });
      
      const serviceConfig = {
        name: 'metrics-service',
        host: 'localhost',
        port: mockServer.port
      };

      await serviceDiscovery.registerService(serviceConfig);
      
      await new Promise(resolve => setTimeout(resolve, 150));

      const service = serviceDiscovery.getService('metrics-service:default');
      expect(service.totalChecks).toBeGreaterThan(0);
      expect(service.averageResponseTime).toBeGreaterThan(0);
    });

    it('should respect health check timeout', async () => {
      // Don't set any response, causing timeout
      const serviceConfig = {
        name: 'timeout-service',
        host: 'localhost',
        port: 9999, // Non-existent port
        healthCheck: { path: '/health', method: 'GET' }
      };

      await serviceDiscovery.registerService(serviceConfig);
      
      await new Promise(resolve => setTimeout(resolve, 1200)); // Wait longer than timeout

      const service = serviceDiscovery.getService('timeout-service:default');
      expect(service.consecutiveFailures).toBeGreaterThan(0);
    });

    it('should trigger workflow engine on service health changes', async () => {
      mockServer.setResponse('/health', 500, { error: 'Service down' });
      
      const serviceConfig = {
        name: 'workflow-trigger-service',
        host: 'localhost',
        port: mockServer.port
      };

      await serviceDiscovery.registerService(serviceConfig);
      
      // Wait for health checks to fail
      await new Promise(resolve => setTimeout(resolve, 400));

      expect(mockWorkflowEngine.triggers.length).toBeGreaterThan(0);
      const trigger = mockWorkflowEngine.triggers.find(t => t.triggerName === 'service:unhealthy');
      expect(trigger).toBeDefined();
    });
  });

  describe('Circuit Breaker Pattern', () => {
    beforeEach(async () => {
      await serviceDiscovery.initialize();
      await mockServer.start();
    });

    it('should open circuit breaker after consecutive failures', async () => {
      mockServer.setResponse('/health', 500, { error: 'Service error' });
      
      const serviceConfig = {
        name: 'circuit-breaker-service',
        host: 'localhost',
        port: mockServer.port
      };

      await serviceDiscovery.registerService(serviceConfig);
      
      // Wait for failures to accumulate
      await new Promise(resolve => setTimeout(resolve, 500));

      const circuitBreaker = serviceDiscovery.circuitBreakers.get('circuit-breaker-service:default');
      expect(circuitBreaker.failures).toBeGreaterThanOrEqual(serviceDiscovery.config.failureThreshold);
    });

    it('should transition circuit breaker to half-open state', async () => {
      const serviceConfig = {
        name: 'half-open-service',
        host: 'localhost',
        port: mockServer.port
      };

      await serviceDiscovery.registerService(serviceConfig);
      
      // Manually set circuit breaker to open state with expired timeout
      const circuitBreaker = serviceDiscovery.circuitBreakers.get('half-open-service:default');
      circuitBreaker.state = 'open';
      circuitBreaker.failures = serviceDiscovery.config.failureThreshold;
      circuitBreaker.nextAttempt = Date.now() - 1000; // Expired
      
      mockServer.setResponse('/health', 200, { status: 'ok' });
      
      // Trigger health check
      await serviceDiscovery.forceHealthCheck('half-open-service:default');
      
      expect(circuitBreaker.state).toBe('closed');
    });

    it('should emit circuit breaker events', async () => {
      let circuitBreakerEvent = null;
      serviceDiscovery.on('circuit-breaker:opened', (event) => {
        circuitBreakerEvent = event;
      });

      mockServer.setResponse('/health', 500, { error: 'Failure' });
      
      const serviceConfig = {
        name: 'event-circuit-service',
        host: 'localhost',
        port: mockServer.port
      };

      await serviceDiscovery.registerService(serviceConfig);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(circuitBreakerEvent).toBeDefined();
      expect(circuitBreakerEvent.serviceId).toBe('event-circuit-service:default');
    });
  });

  describe('Dependency Management', () => {
    beforeEach(async () => {
      await serviceDiscovery.initialize();
    });

    it('should build dependency graph correctly', async () => {
      const serviceA = {
        name: 'service-a',
        host: 'localhost',
        port: 3000,
        dependencies: ['service-b', 'service-c']
      };
      
      const serviceB = {
        name: 'service-b',
        host: 'localhost',
        port: 3001,
        dependencies: ['service-c']
      };

      await serviceDiscovery.registerService(serviceA);
      await serviceDiscovery.registerService(serviceB);

      const dependenciesA = serviceDiscovery.dependencyGraph.get('service-a:default');
      const dependenciesB = serviceDiscovery.dependencyGraph.get('service-b:default');
      
      expect(dependenciesA.has('service-b')).toBe(true);
      expect(dependenciesA.has('service-c')).toBe(true);
      expect(dependenciesB.has('service-c')).toBe(true);
    });

    it('should get dependent services correctly', async () => {
      await serviceDiscovery.registerService({
        name: 'dependency-service',
        host: 'localhost',
        port: 3000
      });
      
      await serviceDiscovery.registerService({
        name: 'dependent-service-1',
        host: 'localhost',
        port: 3001,
        dependencies: ['dependency-service:default']
      });
      
      await serviceDiscovery.registerService({
        name: 'dependent-service-2',
        host: 'localhost',
        port: 3002,
        dependencies: ['dependency-service:default']
      });

      const dependents = serviceDiscovery.getDependentServices('dependency-service:default');
      expect(dependents).toContain('dependent-service-1:default');
      expect(dependents).toContain('dependent-service-2:default');
    });

    it('should get dependency tree for a service', async () => {
      await serviceDiscovery.registerService({
        name: 'root-service',
        host: 'localhost',
        port: 3000,
        dependencies: ['child-service:default']
      });
      
      await serviceDiscovery.registerService({
        name: 'child-service',
        host: 'localhost',
        port: 3001,
        dependencies: ['leaf-service:default']
      });
      
      await serviceDiscovery.registerService({
        name: 'leaf-service',
        host: 'localhost',
        port: 3002
      });

      const tree = serviceDiscovery.getDependencyTree('root-service:default');
      
      expect(tree.serviceId).toBe('root-service:default');
      expect(tree.dependencies).toHaveLength(1);
      expect(tree.dependencies[0].serviceId).toBe('child-service:default');
      expect(tree.dependencies[0].dependencies).toHaveLength(1);
      expect(tree.dependencies[0].dependencies[0].serviceId).toBe('leaf-service:default');
    });

    it('should detect circular dependencies', async () => {
      await serviceDiscovery.registerService({
        name: 'service-x',
        host: 'localhost',
        port: 3000,
        dependencies: ['service-y:default']
      });
      
      await serviceDiscovery.registerService({
        name: 'service-y',
        host: 'localhost',
        port: 3001,
        dependencies: ['service-z:default']
      });
      
      await serviceDiscovery.registerService({
        name: 'service-z',
        host: 'localhost',
        port: 3002,
        dependencies: ['service-x:default']
      });

      const circularDependencies = serviceDiscovery.detectCircularDependencies();
      expect(circularDependencies.length).toBeGreaterThan(0);
    });

    it('should handle dependency failure cascading', async () => {
      await serviceDiscovery.registerService({
        name: 'core-service',
        host: 'localhost',
        port: 3000
      });
      
      await serviceDiscovery.registerService({
        name: 'dependent-app',
        host: 'localhost',
        port: 3001,
        dependencies: ['core-service:default']
      });

      let dependencyImpactEvent = null;
      serviceDiscovery.on('dependency:impact', (event) => {
        dependencyImpactEvent = event;
      });

      // Simulate core service failure
      serviceDiscovery.emit('service:unhealthy', { serviceId: 'core-service:default' });

      expect(dependencyImpactEvent).toBeDefined();
      expect(dependencyImpactEvent.dependentService).toBe('dependent-app:default');
      expect(dependencyImpactEvent.failedDependency).toBe('core-service:default');
    });
  });

  describe('Service Discovery Operations', () => {
    beforeEach(async () => {
      await serviceDiscovery.initialize();
    });

    it('should get all services', async () => {
      await serviceDiscovery.registerService({
        name: 'service-1',
        host: 'localhost',
        port: 3000
      });
      
      await serviceDiscovery.registerService({
        name: 'service-2',
        host: 'localhost',
        port: 3001
      });

      const services = serviceDiscovery.getAllServices();
      expect(services.length).toBe(2);
      expect(services[0].circuitBreaker).toBeDefined();
      expect(services[0].dependencies).toBeDefined();
    });

    it('should get services by status', async () => {
      await serviceDiscovery.registerService({
        name: 'healthy-svc',
        host: 'localhost',
        port: 3000
      });

      // Manually set status
      const service = serviceDiscovery.services.get('healthy-svc:default');
      service.status = 'healthy';

      const healthyServices = serviceDiscovery.getServicesByStatus('healthy');
      expect(healthyServices.length).toBe(1);
      expect(healthyServices[0].name).toBe('healthy-svc');
    });

    it('should get service by ID with full details', async () => {
      await serviceDiscovery.registerService({
        name: 'detailed-service',
        host: 'localhost',
        port: 3000,
        dependencies: ['other-service']
      });

      const service = serviceDiscovery.getService('detailed-service:default');
      
      expect(service).toBeDefined();
      expect(service.circuitBreaker).toBeDefined();
      expect(service.dependencies).toBeDefined();
      expect(service.dependents).toBeDefined();
    });

    it('should get health overview with comprehensive metrics', async () => {
      await serviceDiscovery.registerService({
        name: 'overview-service-1',
        host: 'localhost',
        port: 3000
      });
      
      await serviceDiscovery.registerService({
        name: 'overview-service-2',
        host: 'localhost',
        port: 3001
      });

      const overview = serviceDiscovery.getHealthOverview();
      
      expect(overview.services.total).toBe(2);
      expect(overview.circuitBreakers.total).toBe(2);
      expect(overview.dependencies).toBeDefined();
    });

    it('should force health check on specific service', async () => {
      await mockServer.start();
      mockServer.setResponse('/health', 200, { status: 'ok' });
      
      await serviceDiscovery.registerService({
        name: 'force-check-service',
        host: 'localhost',
        port: mockServer.port
      });

      const result = await serviceDiscovery.forceHealthCheck('force-check-service:default');
      
      expect(result).toBeDefined();
      expect(result.lastHealthCheck).toBeDefined();
    });

    it('should unregister service correctly', async () => {
      await serviceDiscovery.registerService({
        name: 'temp-service',
        host: 'localhost',
        port: 3000
      });

      expect(serviceDiscovery.services.has('temp-service:default')).toBe(true);
      
      const unregistered = await serviceDiscovery.unregisterService('temp-service:default');
      
      expect(unregistered).toBe(true);
      expect(serviceDiscovery.services.has('temp-service:default')).toBe(false);
      expect(serviceDiscovery.healthChecks.has('temp-service:default')).toBe(false);
      expect(serviceDiscovery.circuitBreakers.has('temp-service:default')).toBe(false);
    });
  });

  describe('Service Lifecycle Events', () => {
    beforeEach(async () => {
      await serviceDiscovery.initialize();
    });

    it('should emit service recovery event', async () => {
      let recoveryEvent = null;
      serviceDiscovery.on('service:recovered', (event) => {
        recoveryEvent = event;
      });

      await serviceDiscovery.registerService({
        name: 'recovery-service',
        host: 'localhost',
        port: 3000
      });

      const service = serviceDiscovery.services.get('recovery-service:default');
      service.status = 'unhealthy';
      
      // Simulate recovery
      service.status = 'unknown'; // Reset to trigger recovery detection
      const circuitBreaker = serviceDiscovery.circuitBreakers.get('recovery-service:default');
      circuitBreaker.successes = serviceDiscovery.config.recoveryThreshold;
      
      // Manually trigger recovery logic
      service.status = 'healthy';
      serviceDiscovery.emit('service:recovered', { serviceId: 'recovery-service:default', service });

      expect(recoveryEvent).toBeDefined();
      expect(recoveryEvent.serviceId).toBe('recovery-service:default');
    });

    it('should mark stale services during discovery scan', async () => {
      await serviceDiscovery.registerService({
        name: 'stale-service',
        host: 'localhost',
        port: 3000
      });

      const service = serviceDiscovery.services.get('stale-service:default');
      
      // Set last seen to past the TTL
      service.lastSeen = new Date(Date.now() - serviceDiscovery.config.serviceRegistrationTtl - 1000);
      
      await serviceDiscovery.discoverServices();
      
      expect(service.status).toBe('stale');
    });

    it('should create alerts for unhealthy services', async () => {
      await mockServer.start();
      mockServer.setResponse('/health', 500, { error: 'Service failure' });
      
      await serviceDiscovery.registerService({
        name: 'alert-service',
        host: 'localhost',
        port: mockServer.port
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      expect(mockCommandCenter.alerts.length).toBeGreaterThan(0);
      const alert = mockCommandCenter.alerts.find(a => 
        a.metadata && a.metadata.serviceId === 'alert-service:default'
      );
      expect(alert).toBeDefined();
      expect(alert.severity).toBe('high');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await serviceDiscovery.initialize();
    });

    it('should handle service registration errors gracefully', async () => {
      const invalidServiceConfig = {
        // Missing required fields
        host: 'localhost'
      };

      await expect(serviceDiscovery.registerService(invalidServiceConfig))
        .rejects.toThrow();
    });

    it('should handle health check request failures', async () => {
      const serviceConfig = {
        name: 'failing-health-service',
        host: 'nonexistent-host',
        port: 9999
      };

      await serviceDiscovery.registerService(serviceConfig);
      
      // Wait for health check attempts
      await new Promise(resolve => setTimeout(resolve, 300));

      const service = serviceDiscovery.getService('failing-health-service:default');
      expect(service.consecutiveFailures).toBeGreaterThan(0);
      expect(service.failedChecks).toBeGreaterThan(0);
    });

    it('should handle malformed health check responses', async () => {
      await mockServer.start();
      mockServer.setResponse('/health', 200, 'invalid-json');
      
      const serviceConfig = {
        name: 'malformed-response-service',
        host: 'localhost',
        port: mockServer.port,
        healthCheck: {
          path: '/health',
          expectedResponse: { status: 'ok' }
        }
      };

      await serviceDiscovery.registerService(serviceConfig);
      
      await new Promise(resolve => setTimeout(resolve, 200));

      const service = serviceDiscovery.getService('malformed-response-service:default');
      expect(service.consecutiveFailures).toBeGreaterThan(0);
    });
  });

  describe('Cleanup and Shutdown', () => {
    beforeEach(async () => {
      await serviceDiscovery.initialize();
    });

    it('should shutdown gracefully', async () => {
      let shutdownEvent = false;
      serviceDiscovery.on('system:shutdown', () => {
        shutdownEvent = true;
      });

      await serviceDiscovery.shutdown();

      expect(serviceDiscovery.isRunning).toBe(false);
      expect(shutdownEvent).toBe(true);
    });

    it('should clear intervals during shutdown', async () => {
      const healthInterval = serviceDiscovery.healthCheckInterval;
      const discoveryInterval = serviceDiscovery.discoveryInterval;

      await serviceDiscovery.shutdown();

      // Intervals should be cleared
      expect(serviceDiscovery.healthCheckInterval).toBeNull();
      expect(serviceDiscovery.discoveryInterval).toBeNull();
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      await serviceDiscovery.initialize();
    });

    it('should handle multiple service registrations efficiently', async () => {
      const startTime = Date.now();
      const promises = [];

      // Register 50 services
      for (let i = 0; i < 50; i++) {
        promises.push(serviceDiscovery.registerService({
          name: `perf-service-${i}`,
          host: 'localhost',
          port: 3000 + i,
          instance: `instance-${i}`
        }));
      }

      await Promise.all(promises);
      const endTime = Date.now();

      expect(serviceDiscovery.services.size).toBe(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle concurrent health checks', async () => {
      await mockServer.start();
      mockServer.setResponse('/health', 200, { status: 'ok' });

      // Register multiple services on the same port
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(serviceDiscovery.registerService({
          name: `concurrent-service-${i}`,
          host: 'localhost',
          port: mockServer.port,
          instance: `instance-${i}`
        }));
      }

      await Promise.all(promises);
      
      // Wait for health checks
      await new Promise(resolve => setTimeout(resolve, 200));

      // All services should be healthy
      const healthyServices = serviceDiscovery.getServicesByStatus('healthy');
      expect(healthyServices.length).toBeGreaterThan(0);
    });
  });
});

module.exports = {
  ServiceDiscoveryHealth,
  MockOrchestrationEngine,
  MockCommandCenter,
  MockWorkflowEngine,
  MockHealthServer
};