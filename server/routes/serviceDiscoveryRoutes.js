/**
 * FANZ Service Discovery & Health Monitoring API Routes
 * REST API endpoints for service registry, health monitoring, and dependency management
 * Phase 14 - Enterprise Integration
 */

import express from 'express';
const router = express.Router();

/**
 * Get system health overview
 */
router.get('/health/overview', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available',
        message: 'The service discovery and health monitoring system is not initialized'
      });
    }

    const overview = req.app.locals.serviceDiscovery.getHealthOverview();
    
    res.json({
      success: true,
      data: overview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching health overview:', error);
    res.status(500).json({ 
      error: 'Failed to fetch health overview',
      message: error.message 
    });
  }
});

/**
 * Get all registered services
 */
router.get('/services', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const { status, name, tag, limit } = req.query;
    let services = req.app.locals.serviceDiscovery.getAllServices();

    // Apply filters
    if (status) {
      services = services.filter(s => s.status === status);
    }

    if (name) {
      services = services.filter(s => s.name.toLowerCase().includes(name.toLowerCase()));
    }

    if (tag) {
      services = services.filter(s => s.tags.includes(tag));
    }

    // Apply limit
    if (limit && !isNaN(parseInt(limit))) {
      services = services.slice(0, parseInt(limit));
    }

    res.json({
      success: true,
      data: services,
      count: services.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ 
      error: 'Failed to fetch services',
      message: error.message 
    });
  }
});

/**
 * Get specific service by ID
 */
router.get('/services/:serviceId', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const { serviceId } = req.params;
    const service = req.app.locals.serviceDiscovery.getService(serviceId);

    if (!service) {
      return res.status(404).json({
        error: 'Service not found',
        message: `Service with ID '${serviceId}' does not exist`
      });
    }

    res.json({
      success: true,
      data: service,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ 
      error: 'Failed to fetch service',
      message: error.message 
    });
  }
});

/**
 * Register a new service
 */
router.post('/services', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const {
      name,
      version,
      host,
      port,
      protocol,
      healthCheck,
      dependencies,
      metadata,
      tags,
      instance
    } = req.body;

    // Validate required fields
    if (!name || !host || !port) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'name, host, and port are required'
      });
    }

    // Validate port number
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return res.status(400).json({
        error: 'Invalid port',
        message: 'port must be a valid integer between 1 and 65535'
      });
    }

    // Validate protocol
    if (protocol && !['http', 'https'].includes(protocol)) {
      return res.status(400).json({
        error: 'Invalid protocol',
        message: 'protocol must be either "http" or "https"'
      });
    }

    const serviceConfig = {
      name,
      version: version || '1.0.0',
      host,
      port,
      protocol: protocol || 'http',
      healthCheck: healthCheck || { path: '/health', method: 'GET' },
      dependencies: dependencies || [],
      metadata: metadata || {},
      tags: tags || [],
      instance: instance || 'default'
    };

    const service = await req.app.locals.serviceDiscovery.registerService(serviceConfig);

    res.status(201).json({
      success: true,
      data: service,
      message: 'Service registered successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error registering service:', error);
    res.status(500).json({ 
      error: 'Failed to register service',
      message: error.message 
    });
  }
});

/**
 * Unregister a service
 */
router.delete('/services/:serviceId', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const { serviceId } = req.params;
    const unregistered = await req.app.locals.serviceDiscovery.unregisterService(serviceId);

    if (!unregistered) {
      return res.status(404).json({
        error: 'Service not found',
        message: `Service with ID '${serviceId}' does not exist`
      });
    }

    res.json({
      success: true,
      message: 'Service unregistered successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error unregistering service:', error);
    res.status(500).json({ 
      error: 'Failed to unregister service',
      message: error.message 
    });
  }
});

/**
 * Force health check on specific service
 */
router.post('/services/:serviceId/health-check', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const { serviceId } = req.params;
    const service = await req.app.locals.serviceDiscovery.forceHealthCheck(serviceId);

    res.json({
      success: true,
      data: service,
      message: 'Health check completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error performing health check:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ 
      error: 'Failed to perform health check',
      message: error.message 
    });
  }
});

/**
 * Get services by status
 */
router.get('/services/status/:status', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const { status } = req.params;
    const validStatuses = ['healthy', 'unhealthy', 'stale', 'unknown'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const services = req.app.locals.serviceDiscovery.getServicesByStatus(status);

    res.json({
      success: true,
      data: services,
      count: services.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching services by status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch services by status',
      message: error.message 
    });
  }
});

/**
 * Get dependency tree for a service
 */
router.get('/dependencies/:serviceId/tree', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const { serviceId } = req.params;
    const tree = req.app.locals.serviceDiscovery.getDependencyTree(serviceId);

    if (tree.error) {
      return res.status(404).json({
        error: 'Service not found',
        message: tree.error
      });
    }

    res.json({
      success: true,
      data: tree,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dependency tree:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dependency tree',
      message: error.message 
    });
  }
});

/**
 * Get services that depend on a specific service
 */
router.get('/dependencies/:serviceId/dependents', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const { serviceId } = req.params;
    const dependents = req.app.locals.serviceDiscovery.getDependentServices(serviceId);

    // Get full service details for dependents
    const dependentServices = dependents
      .map(id => req.app.locals.serviceDiscovery.getService(id))
      .filter(service => service !== null);

    res.json({
      success: true,
      data: dependentServices,
      count: dependentServices.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching dependent services:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dependent services',
      message: error.message 
    });
  }
});

/**
 * Detect circular dependencies
 */
router.get('/dependencies/circular', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const circularDependencies = req.app.locals.serviceDiscovery.detectCircularDependencies();

    res.json({
      success: true,
      data: circularDependencies,
      count: circularDependencies.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error detecting circular dependencies:', error);
    res.status(500).json({ 
      error: 'Failed to detect circular dependencies',
      message: error.message 
    });
  }
});

/**
 * Get circuit breaker status for all services
 */
router.get('/circuit-breakers', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const services = req.app.locals.serviceDiscovery.getAllServices();
    const circuitBreakers = services.map(service => ({
      serviceId: service.id,
      serviceName: service.name,
      endpoint: service.endpoint,
      circuitBreaker: service.circuitBreaker,
      status: service.status,
      consecutiveFailures: service.consecutiveFailures
    }));

    res.json({
      success: true,
      data: circuitBreakers,
      count: circuitBreakers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching circuit breaker status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch circuit breaker status',
      message: error.message 
    });
  }
});

/**
 * Get circuit breakers by state
 */
router.get('/circuit-breakers/:state', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const { state } = req.params;
    const validStates = ['open', 'closed', 'half-open'];
    
    if (!validStates.includes(state)) {
      return res.status(400).json({
        error: 'Invalid circuit breaker state',
        message: `State must be one of: ${validStates.join(', ')}`
      });
    }

    const services = req.app.locals.serviceDiscovery.getAllServices();
    const filteredCircuitBreakers = services
      .filter(service => service.circuitBreaker && service.circuitBreaker.state === state)
      .map(service => ({
        serviceId: service.id,
        serviceName: service.name,
        endpoint: service.endpoint,
        circuitBreaker: service.circuitBreaker,
        status: service.status,
        consecutiveFailures: service.consecutiveFailures
      }));

    res.json({
      success: true,
      data: filteredCircuitBreakers,
      count: filteredCircuitBreakers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching circuit breakers by state:', error);
    res.status(500).json({ 
      error: 'Failed to fetch circuit breakers by state',
      message: error.message 
    });
  }
});

/**
 * Get service metrics and statistics
 */
router.get('/metrics', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const services = req.app.locals.serviceDiscovery.getAllServices();
    const metrics = {
      summary: req.app.locals.serviceDiscovery.getHealthOverview(),
      services: services.map(service => ({
        id: service.id,
        name: service.name,
        status: service.status,
        endpoint: service.endpoint,
        totalChecks: service.totalChecks,
        failedChecks: service.failedChecks,
        successRate: service.totalChecks > 0 
          ? ((service.totalChecks - service.failedChecks) / service.totalChecks * 100).toFixed(2)
          : '0.00',
        averageResponseTime: service.averageResponseTime,
        consecutiveFailures: service.consecutiveFailures,
        consecutiveSuccesses: service.consecutiveSuccesses,
        lastHealthCheck: service.lastHealthCheck,
        registeredAt: service.registeredAt
      }))
    };

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching service metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch service metrics',
      message: error.message 
    });
  }
});

/**
 * Get service instances for a service name
 */
router.get('/instances/:serviceName', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const { serviceName } = req.params;
    const serviceInstances = req.app.locals.serviceDiscovery.serviceInstances.get(serviceName);
    
    if (!serviceInstances) {
      return res.status(404).json({
        error: 'Service not found',
        message: `No instances found for service '${serviceName}'`
      });
    }

    const instances = Array.from(serviceInstances)
      .map(serviceId => req.app.locals.serviceDiscovery.getService(serviceId))
      .filter(service => service !== null);

    res.json({
      success: true,
      data: instances,
      count: instances.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching service instances:', error);
    res.status(500).json({ 
      error: 'Failed to fetch service instances',
      message: error.message 
    });
  }
});

/**
 * Search services by various criteria
 */
router.get('/search', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    const { 
      name, 
      tag, 
      status, 
      protocol, 
      version, 
      metadata_key, 
      metadata_value,
      dependency,
      limit = 50
    } = req.query;

    let services = req.app.locals.serviceDiscovery.getAllServices();

    // Apply various filters
    if (name) {
      const searchTerm = name.toLowerCase();
      services = services.filter(s => 
        s.name.toLowerCase().includes(searchTerm) || 
        s.id.toLowerCase().includes(searchTerm)
      );
    }

    if (tag) {
      services = services.filter(s => s.tags && s.tags.includes(tag));
    }

    if (status) {
      services = services.filter(s => s.status === status);
    }

    if (protocol) {
      services = services.filter(s => s.protocol === protocol);
    }

    if (version) {
      services = services.filter(s => s.version === version);
    }

    if (metadata_key && metadata_value) {
      services = services.filter(s => 
        s.metadata && s.metadata[metadata_key] === metadata_value
      );
    }

    if (dependency) {
      services = services.filter(s => 
        s.dependencies && s.dependencies.includes(dependency)
      );
    }

    // Apply limit
    const limitNum = parseInt(limit);
    if (!isNaN(limitNum) && limitNum > 0) {
      services = services.slice(0, limitNum);
    }

    res.json({
      success: true,
      data: services,
      count: services.length,
      query: req.query,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error searching services:', error);
    res.status(500).json({ 
      error: 'Failed to search services',
      message: error.message 
    });
  }
});

/**
 * Get system health status
 */
router.get('/health', async (req, res) => {
  try {
    const isAvailable = !!req.app.locals.serviceDiscovery;
    const isRunning = isAvailable ? req.app.locals.serviceDiscovery.isRunning : false;

    let overview = {};
    if (isAvailable) {
      overview = req.app.locals.serviceDiscovery.getHealthOverview();
    }

    res.json({
      success: true,
      data: {
        available: isAvailable,
        running: isRunning,
        overview: overview
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({ 
      error: 'Failed to check system health',
      message: error.message 
    });
  }
});

/**
 * Get real-time service events (for WebSocket or SSE)
 */
router.get('/events', async (req, res) => {
  try {
    if (!req.app.locals.serviceDiscovery) {
      return res.status(503).json({ 
        error: 'Service Discovery not available' 
      });
    }

    // Set up Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial connection event
    sendEvent('connected', { 
      message: 'Connected to service discovery events',
      timestamp: new Date().toISOString()
    });

    const serviceDiscovery = req.app.locals.serviceDiscovery;
    
    // Set up event listeners
    const eventHandlers = {
      'service:registered': (data) => sendEvent('service-registered', data),
      'service:unregistered': (data) => sendEvent('service-unregistered', data),
      'service:healthy': (data) => sendEvent('service-healthy', data),
      'service:unhealthy': (data) => sendEvent('service-unhealthy', data),
      'service:recovered': (data) => sendEvent('service-recovered', data),
      'service:stale': (data) => sendEvent('service-stale', data),
      'circuit-breaker:opened': (data) => sendEvent('circuit-breaker-opened', data),
      'circuit-breaker:closed': (data) => sendEvent('circuit-breaker-closed', data),
      'dependency:impact': (data) => sendEvent('dependency-impact', data),
      'dependency:recovered': (data) => sendEvent('dependency-recovered', data)
    };

    // Register event listeners
    for (const [event, handler] of Object.entries(eventHandlers)) {
      serviceDiscovery.on(event, handler);
    }

    // Handle client disconnect
    req.on('close', () => {
      // Remove event listeners
      for (const [event, handler] of Object.entries(eventHandlers)) {
        serviceDiscovery.removeListener(event, handler);
      }
    });

  } catch (error) {
    console.error('Error setting up service events:', error);
    res.status(500).json({ 
      error: 'Failed to setup service events',
      message: error.message 
    });
  }
});

export default router;