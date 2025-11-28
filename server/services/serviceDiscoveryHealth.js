/**
 * FANZ Service Discovery & Health Monitoring System
 * Enterprise-grade service registry with health checks, dependency mapping, and automated failover
 * Phase 14 - Enterprise Integration
 */

const EventEmitter = require('events');
const http = require('http');
const https = require('https');

class ServiceDiscoveryHealth extends EventEmitter {
  constructor(orchestrationEngine, commandCenter, workflowEngine) {
    super();
    this.orchestrationEngine = orchestrationEngine;
    this.commandCenter = commandCenter;
    this.workflowEngine = workflowEngine;
    
    // Service registry
    this.services = new Map();
    this.serviceInstances = new Map();
    this.dependencyGraph = new Map();
    this.healthChecks = new Map();
    
    // Health monitoring
    this.healthCheckInterval = null;
    this.healthMetrics = new Map();
    this.failureThresholds = new Map();
    this.circuitBreakers = new Map();
    
    // Configuration
    this.config = {
      healthCheckInterval: 30000, // 30 seconds
      healthCheckTimeout: 10000,  // 10 seconds
      failureThreshold: 3,        // failures before marking unhealthy
      recoveryThreshold: 2,       // successes before marking healthy
      circuitBreakerTimeout: 60000, // 1 minute
      dependencyCheckInterval: 300000, // 5 minutes
      serviceRegistrationTtl: 300000, // 5 minutes
      maxRetries: 3
    };
    
    // Metrics tracking
    this.metrics = {
      totalServices: 0,
      healthyServices: 0,
      unhealthyServices: 0,
      circuitBreakersOpen: 0,
      totalHealthChecks: 0,
      failedHealthChecks: 0,
      averageResponseTime: 0,
      uptime: new Date(),
      lastFullScan: null
    };
    
    this.isRunning = false;
    this.discoveryInterval = null;
  }

  /**
   * Initialize the service discovery and health monitoring system
   */
  async initialize() {
    try {
      console.log('🔍 Initializing Service Discovery & Health Monitoring System...');
      
      // Load known services from orchestration engine
      await this.loadKnownServices();
      
      // Start health monitoring
      await this.startHealthMonitoring();
      
      // Start service discovery
      await this.startServiceDiscovery();
      
      // Setup dependency monitoring
      await this.setupDependencyMonitoring();
      
      this.isRunning = true;
      this.emit('system:initialized');
      
      console.log('✅ Service Discovery & Health Monitoring System initialized successfully');
      
      // Register with command center
      if (this.commandCenter) {
        this.commandCenter.registerService({
          name: 'ServiceDiscoveryHealth',
          status: 'healthy',
          metrics: this.metrics,
          lastHeartbeat: new Date()
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Service Discovery & Health Monitoring System:', error);
      this.emit('system:error', error);
      throw error;
    }
  }

  /**
   * Load known services from orchestration engine
   */
  async loadKnownServices() {
    try {
      if (this.orchestrationEngine) {
        const knownServices = this.orchestrationEngine.services || new Map();
        
        for (const [serviceName, serviceInfo] of knownServices) {
          await this.registerService({
            name: serviceName,
            version: serviceInfo.version || '1.0.0',
            host: serviceInfo.host || 'localhost',
            port: serviceInfo.port || 3000,
            protocol: serviceInfo.protocol || 'http',
            healthCheck: serviceInfo.healthCheck || { path: '/health', method: 'GET' },
            dependencies: serviceInfo.dependencies || [],
            metadata: serviceInfo.metadata || {},
            tags: serviceInfo.tags || [],
            instance: serviceInfo.instance || 'default'
          });
        }
      }
      
      console.log(`📋 Loaded ${this.services.size} known services from orchestration engine`);
    } catch (error) {
      console.error('❌ Error loading known services:', error);
    }
  }

  /**
   * Register a service in the discovery system
   */
  async registerService(serviceConfig) {
    try {
      const {
        name,
        version = '1.0.0',
        host = 'localhost',
        port = 3000,
        protocol = 'http',
        healthCheck = { path: '/health', method: 'GET' },
        dependencies = [],
        metadata = {},
        tags = [],
        instance = 'default'
      } = serviceConfig;
      
      const serviceId = `${name}:${instance}`;
      const serviceEndpoint = `${protocol}://${host}:${port}`;
      
      const service = {
        id: serviceId,
        name,
        version,
        host,
        port,
        protocol,
        endpoint: serviceEndpoint,
        healthCheck,
        dependencies,
        metadata,
        tags,
        instance,
        status: 'unknown',
        lastSeen: new Date(),
        registeredAt: new Date(),
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        totalChecks: 0,
        failedChecks: 0,
        averageResponseTime: 0,
        lastHealthCheck: null,
        lastHealthStatus: null
      };
      
      // Register main service
      this.services.set(serviceId, service);
      
      // Register instance
      if (!this.serviceInstances.has(name)) {
        this.serviceInstances.set(name, new Set());
      }
      this.serviceInstances.get(name).add(serviceId);
      
      // Setup health check
      this.setupHealthCheck(serviceId);
      
      // Build dependency graph
      this.updateDependencyGraph(serviceId, dependencies);
      
      // Setup circuit breaker
      this.setupCircuitBreaker(serviceId);
      
      this.emit('service:registered', { serviceId, service });
      console.log(`🎯 Registered service: ${serviceId} at ${serviceEndpoint}`);
      
      return service;
    } catch (error) {
      console.error('❌ Error registering service:', error);
      throw error;
    }
  }

  /**
   * Setup health check for a service
   */
  setupHealthCheck(serviceId) {
    const service = this.services.get(serviceId);
    if (!service) return;
    
    const healthCheckConfig = {
      serviceId,
      url: `${service.endpoint}${service.healthCheck.path}`,
      method: service.healthCheck.method || 'GET',
      timeout: this.config.healthCheckTimeout,
      expectedStatus: service.healthCheck.expectedStatus || [200, 204],
      expectedResponse: service.healthCheck.expectedResponse,
      headers: service.healthCheck.headers || {}
    };
    
    this.healthChecks.set(serviceId, healthCheckConfig);
  }

  /**
   * Setup circuit breaker for a service
   */
  setupCircuitBreaker(serviceId) {
    this.circuitBreakers.set(serviceId, {
      state: 'closed', // closed, open, half-open
      failures: 0,
      successes: 0,
      lastFailure: null,
      lastSuccess: null,
      openedAt: null,
      nextAttempt: null
    });
  }

  /**
   * Update dependency graph
   */
  updateDependencyGraph(serviceId, dependencies) {
    this.dependencyGraph.set(serviceId, new Set(dependencies));
    
    // Update reverse dependencies
    for (const dependency of dependencies) {
      if (!this.dependencyGraph.has(dependency)) {
        this.dependencyGraph.set(dependency, new Set());
      }
    }
  }

  /**
   * Start health monitoring
   */
  async startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
    
    console.log(`💓 Health monitoring started (interval: ${this.config.healthCheckInterval}ms)`);
  }

  /**
   * Perform health checks on all registered services
   */
  async performHealthChecks() {
    const startTime = Date.now();
    const promises = [];
    
    for (const [serviceId, healthCheck] of this.healthChecks) {
      promises.push(this.performSingleHealthCheck(serviceId, healthCheck));
    }
    
    await Promise.allSettled(promises);
    
    // Update metrics
    this.updateHealthMetrics();
    this.metrics.lastFullScan = new Date();
    
    const duration = Date.now() - startTime;
    console.log(`💓 Health check cycle completed in ${duration}ms (${this.services.size} services)`);
  }

  /**
   * Perform health check on a single service
   */
  async performSingleHealthCheck(serviceId, healthCheckConfig) {
    const service = this.services.get(serviceId);
    if (!service) return;
    
    const circuitBreaker = this.circuitBreakers.get(serviceId);
    
    // Check circuit breaker state
    if (circuitBreaker.state === 'open') {
      const now = Date.now();
      if (now < circuitBreaker.nextAttempt) {
        return; // Skip check while circuit breaker is open
      } else {
        circuitBreaker.state = 'half-open';
        console.log(`🔄 Circuit breaker half-open for ${serviceId}`);
      }
    }
    
    const startTime = Date.now();
    
    try {
      const result = await this.makeHealthCheckRequest(healthCheckConfig);
      const responseTime = Date.now() - startTime;
      
      // Update service metrics
      service.totalChecks++;
      service.lastHealthCheck = new Date();
      service.lastHealthStatus = 'healthy';
      service.consecutiveFailures = 0;
      service.consecutiveSuccesses++;
      service.averageResponseTime = 
        (service.averageResponseTime * (service.totalChecks - 1) + responseTime) / service.totalChecks;
      
      // Update circuit breaker
      circuitBreaker.successes++;
      circuitBreaker.lastSuccess = new Date();
      
      if (circuitBreaker.state === 'half-open' && circuitBreaker.successes >= this.config.recoveryThreshold) {
        circuitBreaker.state = 'closed';
        circuitBreaker.failures = 0;
        console.log(`✅ Circuit breaker closed for ${serviceId}`);
        this.emit('circuit-breaker:closed', { serviceId });
      }
      
      // Update service status
      const previousStatus = service.status;
      service.status = 'healthy';
      service.lastSeen = new Date();
      
      if (previousStatus !== 'healthy') {
        console.log(`🟢 Service recovered: ${serviceId}`);
        this.emit('service:recovered', { serviceId, service });
        
        // Trigger recovery workflows
        if (this.workflowEngine) {
          await this.workflowEngine.handleTrigger('service:recovered', {
            serviceId,
            serviceName: service.name,
            endpoint: service.endpoint,
            responseTime
          });
        }
      }
      
      this.metrics.totalHealthChecks++;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Update service metrics
      service.totalChecks++;
      service.failedChecks++;
      service.lastHealthCheck = new Date();
      service.lastHealthStatus = 'unhealthy';
      service.consecutiveSuccesses = 0;
      service.consecutiveFailures++;
      
      // Update circuit breaker
      circuitBreaker.failures++;
      circuitBreaker.lastFailure = new Date();
      
      if (circuitBreaker.failures >= this.config.failureThreshold) {
        circuitBreaker.state = 'open';
        circuitBreaker.openedAt = new Date();
        circuitBreaker.nextAttempt = Date.now() + this.config.circuitBreakerTimeout;
        console.log(`🔴 Circuit breaker opened for ${serviceId}`);
        this.emit('circuit-breaker:opened', { serviceId, error });
      }
      
      // Update service status
      const previousStatus = service.status;
      
      if (service.consecutiveFailures >= this.config.failureThreshold) {
        service.status = 'unhealthy';
        
        if (previousStatus !== 'unhealthy') {
          console.log(`🔴 Service unhealthy: ${serviceId} - ${error.message}`);
          this.emit('service:unhealthy', { serviceId, service, error });
          
          // Create alert
          if (this.commandCenter) {
            this.commandCenter.createAlert({
              title: `Service Health Alert`,
              message: `Service ${serviceId} is unhealthy: ${error.message}`,
              severity: 'high',
              source: 'service-discovery',
              metadata: {
                serviceId,
                serviceName: service.name,
                endpoint: service.endpoint,
                error: error.message,
                consecutiveFailures: service.consecutiveFailures
              }
            });
          }
          
          // Trigger failure workflows
          if (this.workflowEngine) {
            await this.workflowEngine.handleTrigger('service:unhealthy', {
              serviceId,
              serviceName: service.name,
              endpoint: service.endpoint,
              error: error.message,
              consecutiveFailures: service.consecutiveFailures
            });
          }
        }
      }
      
      this.metrics.totalHealthChecks++;
      this.metrics.failedHealthChecks++;
      
      console.error(`❌ Health check failed for ${serviceId}: ${error.message}`);
    }
  }

  /**
   * Make HTTP health check request
   */
  async makeHealthCheckRequest(healthCheckConfig) {
    return new Promise((resolve, reject) => {
      const { url, method, timeout, expectedStatus, expectedResponse, headers } = healthCheckConfig;
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method.toUpperCase(),
        timeout,
        headers: {
          'User-Agent': 'FANZ-ServiceDiscovery/1.0',
          'Accept': 'application/json, text/plain, */*',
          ...headers
        }
      };
      
      const req = httpModule.request(options, (res) => {
        let data = '';
        
        res.on('data', chunk => {
          data += chunk;
        });
        
        res.on('end', () => {
          // Check status code
          if (!expectedStatus.includes(res.statusCode)) {
            return reject(new Error(`Unexpected status code: ${res.statusCode}`));
          }
          
          // Check response content if specified
          if (expectedResponse) {
            try {
              const responseData = JSON.parse(data);
              if (!this.matchesExpectedResponse(responseData, expectedResponse)) {
                return reject(new Error('Response does not match expected format'));
              }
            } catch (error) {
              return reject(new Error('Invalid JSON response'));
            }
          }
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
      
      req.setTimeout(timeout);
      req.end();
    });
  }

  /**
   * Check if response matches expected format
   */
  matchesExpectedResponse(actual, expected) {
    if (typeof expected === 'object' && expected !== null) {
      for (const [key, value] of Object.entries(expected)) {
        if (actual[key] !== value) {
          return false;
        }
      }
      return true;
    }
    return actual === expected;
  }

  /**
   * Start service discovery
   */
  async startServiceDiscovery() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    this.discoveryInterval = setInterval(async () => {
      await this.discoverServices();
    }, this.config.dependencyCheckInterval);
    
    console.log(`🔍 Service discovery started (interval: ${this.config.dependencyCheckInterval}ms)`);
  }

  /**
   * Discover new services
   */
  async discoverServices() {
    try {
      // Check for services that haven't been seen recently
      const now = new Date();
      const staleThreshold = now.getTime() - this.config.serviceRegistrationTtl;
      
      for (const [serviceId, service] of this.services) {
        if (service.lastSeen.getTime() < staleThreshold && service.status !== 'unhealthy') {
          console.log(`⏰ Service potentially stale: ${serviceId}`);
          // Mark as potentially stale but don't remove yet
          service.status = 'stale';
          this.emit('service:stale', { serviceId, service });
        }
      }
      
      console.log(`🔍 Service discovery scan completed (${this.services.size} services monitored)`);
    } catch (error) {
      console.error('❌ Error during service discovery:', error);
    }
  }

  /**
   * Setup dependency monitoring
   */
  async setupDependencyMonitoring() {
    console.log('🔗 Setting up dependency monitoring...');
    
    // Monitor dependency health and cascade failures
    this.on('service:unhealthy', async ({ serviceId }) => {
      await this.handleDependencyFailure(serviceId);
    });
    
    this.on('service:recovered', async ({ serviceId }) => {
      await this.handleDependencyRecovery(serviceId);
    });
  }

  /**
   * Handle dependency failure cascading
   */
  async handleDependencyFailure(failedServiceId) {
    const dependents = this.getDependentServices(failedServiceId);
    
    for (const dependentId of dependents) {
      const dependent = this.services.get(dependentId);
      if (dependent && dependent.status === 'healthy') {
        console.log(`⚠️ Service ${dependentId} may be affected by ${failedServiceId} failure`);
        
        // Create dependency alert
        if (this.commandCenter) {
          this.commandCenter.createAlert({
            title: `Dependency Impact Alert`,
            message: `Service ${dependentId} may be impacted by failure of dependency ${failedServiceId}`,
            severity: 'medium',
            source: 'service-discovery',
            metadata: {
              dependentService: dependentId,
              failedDependency: failedServiceId,
              impact: 'potential-degradation'
            }
          });
        }
        
        this.emit('dependency:impact', {
          dependentService: dependentId,
          failedDependency: failedServiceId
        });
      }
    }
  }

  /**
   * Handle dependency recovery
   */
  async handleDependencyRecovery(recoveredServiceId) {
    const dependents = this.getDependentServices(recoveredServiceId);
    
    for (const dependentId of dependents) {
      console.log(`✅ Service ${dependentId} dependency ${recoveredServiceId} recovered`);
      
      this.emit('dependency:recovered', {
        dependentService: dependentId,
        recoveredDependency: recoveredServiceId
      });
    }
  }

  /**
   * Get services that depend on a given service
   */
  getDependentServices(serviceId) {
    const dependents = new Set();
    
    for (const [dependentId, dependencies] of this.dependencyGraph) {
      if (dependencies.has(serviceId)) {
        dependents.add(dependentId);
      }
    }
    
    return Array.from(dependents);
  }

  /**
   * Get dependency tree for a service
   */
  getDependencyTree(serviceId, visited = new Set()) {
    if (visited.has(serviceId)) {
      return { circular: true, dependencies: [] };
    }
    
    visited.add(serviceId);
    const service = this.services.get(serviceId);
    
    if (!service) {
      return { error: 'Service not found', dependencies: [] };
    }
    
    const dependencies = this.dependencyGraph.get(serviceId) || new Set();
    const tree = {
      serviceId,
      serviceName: service.name,
      status: service.status,
      dependencies: []
    };
    
    for (const depId of dependencies) {
      tree.dependencies.push(this.getDependencyTree(depId, new Set(visited)));
    }
    
    return tree;
  }

  /**
   * Update health metrics
   */
  updateHealthMetrics() {
    let healthyCount = 0;
    let unhealthyCount = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let openCircuitBreakers = 0;
    
    for (const [serviceId, service] of this.services) {
      if (service.status === 'healthy') {
        healthyCount++;
      } else if (service.status === 'unhealthy') {
        unhealthyCount++;
      }
      
      if (service.averageResponseTime > 0) {
        totalResponseTime += service.averageResponseTime;
        responseTimeCount++;
      }
      
      const circuitBreaker = this.circuitBreakers.get(serviceId);
      if (circuitBreaker && circuitBreaker.state === 'open') {
        openCircuitBreakers++;
      }
    }
    
    this.metrics.totalServices = this.services.size;
    this.metrics.healthyServices = healthyCount;
    this.metrics.unhealthyServices = unhealthyCount;
    this.metrics.circuitBreakersOpen = openCircuitBreakers;
    this.metrics.averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
  }

  /**
   * Get all services with their health status
   */
  getAllServices() {
    return Array.from(this.services.values()).map(service => ({
      ...service,
      circuitBreaker: this.circuitBreakers.get(service.id),
      dependencies: Array.from(this.dependencyGraph.get(service.id) || [])
    }));
  }

  /**
   * Get services by status
   */
  getServicesByStatus(status) {
    return Array.from(this.services.values()).filter(service => service.status === status);
  }

  /**
   * Get service by ID
   */
  getService(serviceId) {
    const service = this.services.get(serviceId);
    if (service) {
      return {
        ...service,
        circuitBreaker: this.circuitBreakers.get(serviceId),
        dependencies: Array.from(this.dependencyGraph.get(serviceId) || []),
        dependents: this.getDependentServices(serviceId)
      };
    }
    return null;
  }

  /**
   * Get system health overview
   */
  getHealthOverview() {
    this.updateHealthMetrics();
    
    const overview = {
      ...this.metrics,
      services: {
        total: this.services.size,
        healthy: this.getServicesByStatus('healthy').length,
        unhealthy: this.getServicesByStatus('unhealthy').length,
        stale: this.getServicesByStatus('stale').length,
        unknown: this.getServicesByStatus('unknown').length
      },
      circuitBreakers: {
        total: this.circuitBreakers.size,
        open: Array.from(this.circuitBreakers.values()).filter(cb => cb.state === 'open').length,
        halfOpen: Array.from(this.circuitBreakers.values()).filter(cb => cb.state === 'half-open').length,
        closed: Array.from(this.circuitBreakers.values()).filter(cb => cb.state === 'closed').length
      },
      dependencies: {
        totalMappings: this.dependencyGraph.size,
        circularDependencies: this.detectCircularDependencies().length
      }
    };
    
    return overview;
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies() {
    const circular = [];
    const visited = new Set();
    const recursionStack = new Set();
    
    const dfs = (serviceId, path = []) => {
      if (recursionStack.has(serviceId)) {
        const cycle = path.slice(path.indexOf(serviceId));
        circular.push([...cycle, serviceId]);
        return;
      }
      
      if (visited.has(serviceId)) {
        return;
      }
      
      visited.add(serviceId);
      recursionStack.add(serviceId);
      
      const dependencies = this.dependencyGraph.get(serviceId) || new Set();
      for (const depId of dependencies) {
        dfs(depId, [...path, serviceId]);
      }
      
      recursionStack.delete(serviceId);
    };
    
    for (const serviceId of this.services.keys()) {
      if (!visited.has(serviceId)) {
        dfs(serviceId);
      }
    }
    
    return circular;
  }

  /**
   * Force health check on specific service
   */
  async forceHealthCheck(serviceId) {
    const healthCheck = this.healthChecks.get(serviceId);
    if (healthCheck) {
      await this.performSingleHealthCheck(serviceId, healthCheck);
      return this.getService(serviceId);
    }
    throw new Error(`Service not found: ${serviceId}`);
  }

  /**
   * Unregister a service
   */
  async unregisterService(serviceId) {
    const service = this.services.get(serviceId);
    if (service) {
      // Remove from all data structures
      this.services.delete(serviceId);
      this.healthChecks.delete(serviceId);
      this.circuitBreakers.delete(serviceId);
      this.dependencyGraph.delete(serviceId);
      
      // Remove from service instances
      if (this.serviceInstances.has(service.name)) {
        this.serviceInstances.get(service.name).delete(serviceId);
        if (this.serviceInstances.get(service.name).size === 0) {
          this.serviceInstances.delete(service.name);
        }
      }
      
      this.emit('service:unregistered', { serviceId, service });
      console.log(`🗑️ Unregistered service: ${serviceId}`);
      
      return true;
    }
    return false;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down Service Discovery & Health Monitoring System...');
    
    this.isRunning = false;
    
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    this.emit('system:shutdown');
    console.log('✅ Service Discovery & Health Monitoring System shut down successfully');
  }
}

module.exports = ServiceDiscoveryHealth;