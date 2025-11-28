// API Gateway Dashboard Routes
// Management and monitoring endpoints for the service mesh

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { 
  APIGatewayService, 
  GatewayConfigSchema, 
  ServiceRegistry, 
  RouteDefinition 
} from '../services/apiGatewayService.js';

export function setupAPIGatewayRoutes(router: Router, gateway: APIGatewayService) {
  // Gateway Health & Status
  router.get('/api/gateway/health', async (req: Request, res: Response) => {
    try {
      const health = gateway.getServiceHealth();
      res.json({
        success: true,
        data: health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Gateway health check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get gateway health',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Gateway Metrics
  router.get('/api/gateway/metrics', async (req: Request, res: Response) => {
    try {
      const metrics = gateway.getMetrics();
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get gateway metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get gateway metrics',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Service Registry Management
  router.get('/api/gateway/services', async (req: Request, res: Response) => {
    try {
      const services = gateway.getServices();
      
      // Optional filtering
      const { type, status, name } = req.query;
      let filteredServices = services;
      
      if (type) {
        filteredServices = filteredServices.filter(s => 
          s.metadata?.type === type
        );
      }
      
      if (status) {
        filteredServices = filteredServices.filter(s => 
          s.status === status
        );
      }
      
      if (name) {
        filteredServices = filteredServices.filter(s => 
          s.name.toLowerCase().includes((name as string).toLowerCase())
        );
      }

      res.json({
        success: true,
        data: {
          services: filteredServices,
          total: services.length,
          filtered: filteredServices.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get services:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get services',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get specific service details
  router.get('/api/gateway/services/:serviceId', async (req: Request, res: Response) => {
    try {
      const { serviceId } = req.params;
      const serviceHealth = gateway.getServiceHealth(serviceId);
      
      if (!serviceHealth) {
        return res.status(404).json({
          success: false,
          error: 'Service not found',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: serviceHealth,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get service details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get service details',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Register new service
  router.post('/api/gateway/services', async (req: Request, res: Response) => {
    try {
      const ServiceRegistrySchema = z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        version: z.string().default('1.0.0'),
        baseUrl: z.string().url(),
        healthCheckUrl: z.string().default('/health'),
        metadata: z.record(z.any()).default({}),
        routes: z.array(z.object({
          path: z.string(),
          method: z.string(),
          target: z.string(),
          auth: z.boolean().default(false),
          timeout: z.number().optional(),
          retries: z.number().optional(),
          rateLimit: z.object({
            maxRequests: z.number(),
            windowMs: z.number(),
            keyGenerator: z.string().optional()
          }).optional(),
          cache: z.object({
            ttl: z.number(),
            key: z.string().optional(),
            varyBy: z.array(z.string()).optional()
          }).optional()
        })).default([])
      });

      const serviceData = ServiceRegistrySchema.parse(req.body);
      
      const service: ServiceRegistry = {
        ...serviceData,
        status: 'unknown',
        lastHealthCheck: new Date()
      };

      gateway.registerService(service);

      res.status(201).json({
        success: true,
        data: service,
        message: 'Service registered successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to register service:', error);
      res.status(400).json({
        success: false,
        error: error instanceof z.ZodError ? error.errors : 'Failed to register service',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Update existing service
  router.put('/api/gateway/services/:serviceId', async (req: Request, res: Response) => {
    try {
      const { serviceId } = req.params;
      
      // First unregister the old service
      const unregistered = gateway.unregisterService(serviceId);
      if (!unregistered) {
        return res.status(404).json({
          success: false,
          error: 'Service not found',
          timestamp: new Date().toISOString()
        });
      }

      // Register the updated service
      const ServiceUpdateSchema = z.object({
        name: z.string().min(1),
        version: z.string().default('1.0.0'),
        baseUrl: z.string().url(),
        healthCheckUrl: z.string().default('/health'),
        metadata: z.record(z.any()).default({}),
        routes: z.array(z.object({
          path: z.string(),
          method: z.string(),
          target: z.string(),
          auth: z.boolean().default(false),
          timeout: z.number().optional(),
          retries: z.number().optional()
        })).default([])
      });

      const serviceData = ServiceUpdateSchema.parse(req.body);
      
      const updatedService: ServiceRegistry = {
        id: serviceId,
        ...serviceData,
        status: 'unknown',
        lastHealthCheck: new Date()
      };

      gateway.registerService(updatedService);

      res.json({
        success: true,
        data: updatedService,
        message: 'Service updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to update service:', error);
      res.status(400).json({
        success: false,
        error: error instanceof z.ZodError ? error.errors : 'Failed to update service',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Unregister service
  router.delete('/api/gateway/services/:serviceId', async (req: Request, res: Response) => {
    try {
      const { serviceId } = req.params;
      const unregistered = gateway.unregisterService(serviceId);
      
      if (!unregistered) {
        return res.status(404).json({
          success: false,
          error: 'Service not found',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        message: 'Service unregistered successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to unregister service:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unregister service',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Circuit Breaker Management
  router.get('/api/gateway/circuit-breaker', async (req: Request, res: Response) => {
    try {
      const circuits = gateway.circuitBreaker.getAllCircuitStatus();
      
      res.json({
        success: true,
        data: {
          circuits,
          summary: {
            total: Object.keys(circuits).length,
            open: Object.values(circuits).filter(c => c.state === 'open').length,
            halfOpen: Object.values(circuits).filter(c => c.state === 'half-open').length,
            closed: Object.values(circuits).filter(c => c.state === 'closed').length
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get circuit breaker status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get circuit breaker status',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get specific circuit breaker status
  router.get('/api/gateway/circuit-breaker/:circuitName', async (req: Request, res: Response) => {
    try {
      const { circuitName } = req.params;
      const circuit = gateway.circuitBreaker.getCircuitStatus(circuitName);
      
      if (!circuit) {
        return res.status(404).json({
          success: false,
          error: 'Circuit breaker not found',
          timestamp: new Date().toISOString()
        });
      }

      res.json({
        success: true,
        data: {
          name: circuitName,
          circuit
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get circuit breaker status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get circuit breaker status',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Load Balancer Status
  router.get('/api/gateway/load-balancer', async (req: Request, res: Response) => {
    try {
      const services = gateway.getServices();
      const loadBalancerStatus: any = {};
      
      for (const service of services) {
        const health = gateway.loadBalancer.getServiceHealth(service.id);
        if (health) {
          loadBalancerStatus[service.id] = health;
        }
      }

      res.json({
        success: true,
        data: {
          services: loadBalancerStatus,
          summary: {
            totalServices: services.length,
            totalInstances: Object.values(loadBalancerStatus).reduce(
              (sum: number, service: any) => sum + service.totalInstances, 0
            ),
            healthyInstances: Object.values(loadBalancerStatus).reduce(
              (sum: number, service: any) => sum + service.healthyInstances, 0
            ),
            unhealthyInstances: Object.values(loadBalancerStatus).reduce(
              (sum: number, service: any) => sum + service.unhealthyInstances, 0
            )
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get load balancer status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get load balancer status',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Rate Limiter Status
  router.get('/api/gateway/rate-limiter', async (req: Request, res: Response) => {
    try {
      const stats = {
        enabled: gateway.rateLimiter['config'].enabled,
        configuration: {
          windowMs: gateway.rateLimiter['config'].windowMs,
          maxRequests: gateway.rateLimiter['config'].maxRequests,
          keyGenerator: gateway.rateLimiter['config'].keyGenerator,
          store: gateway.rateLimiter['config'].store
        },
        activeWindows: gateway.rateLimiter['limits'].size,
        currentLimits: Array.from(gateway.rateLimiter['limits'].entries()).map(([key, value]) => ({
          key,
          count: value.count,
          resetTime: new Date(value.resetTime).toISOString(),
          remainingTime: Math.max(0, value.resetTime - Date.now())
        }))
      };

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get rate limiter status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get rate limiter status',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Cache Management
  router.get('/api/gateway/cache', async (req: Request, res: Response) => {
    try {
      const stats = gateway.cache.getStats();
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cache stats',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Clear cache
  router.delete('/api/gateway/cache', async (req: Request, res: Response) => {
    try {
      gateway.cache.clear();
      
      res.json({
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to clear cache:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Delete specific cache entry
  router.delete('/api/gateway/cache/:key', async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const deleted = gateway.cache.delete(decodeURIComponent(key));
      
      res.json({
        success: true,
        data: { deleted },
        message: deleted ? 'Cache entry deleted' : 'Cache entry not found',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to delete cache entry:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete cache entry',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Gateway Configuration
  router.get('/api/gateway/config', async (req: Request, res: Response) => {
    try {
      const config = gateway['config'];
      
      // Remove sensitive information
      const safeConfig = {
        ...config,
        authentication: {
          ...config.authentication,
          jwtSecret: '[REDACTED]'
        }
      };
      
      res.json({
        success: true,
        data: safeConfig,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get gateway config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get gateway config',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Route Discovery
  router.get('/api/gateway/routes', async (req: Request, res: Response) => {
    try {
      const services = gateway.getServices();
      const allRoutes: any[] = [];
      
      for (const service of services) {
        for (const route of service.routes) {
          allRoutes.push({
            serviceId: service.id,
            serviceName: service.name,
            ...route,
            fullTarget: `${service.baseUrl}${route.target}`
          });
        }
      }
      
      // Optional filtering
      const { service, method, path } = req.query;
      let filteredRoutes = allRoutes;
      
      if (service) {
        filteredRoutes = filteredRoutes.filter(r => 
          r.serviceId === service || r.serviceName.toLowerCase().includes((service as string).toLowerCase())
        );
      }
      
      if (method) {
        filteredRoutes = filteredRoutes.filter(r => 
          r.method.toLowerCase() === (method as string).toLowerCase() || r.method === 'ALL'
        );
      }
      
      if (path) {
        filteredRoutes = filteredRoutes.filter(r => 
          r.path.includes(path as string)
        );
      }

      res.json({
        success: true,
        data: {
          routes: filteredRoutes,
          total: allRoutes.length,
          filtered: filteredRoutes.length,
          groupedByService: filteredRoutes.reduce((groups, route) => {
            const key = route.serviceId;
            if (!groups[key]) groups[key] = [];
            groups[key].push(route);
            return groups;
          }, {} as Record<string, any[]>)
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to get routes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get routes',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test route connectivity
  router.post('/api/gateway/test-route', async (req: Request, res: Response) => {
    try {
      const TestRouteSchema = z.object({
        serviceId: z.string(),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
        path: z.string(),
        headers: z.record(z.string()).optional(),
        body: z.any().optional()
      });

      const { serviceId, method, path, headers = {}, body } = TestRouteSchema.parse(req.body);
      
      const service = gateway.getServices().find(s => s.id === serviceId);
      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'Service not found',
          timestamp: new Date().toISOString()
        });
      }

      const instance = gateway.loadBalancer.getNextInstance(serviceId);
      if (!instance) {
        return res.status(503).json({
          success: false,
          error: 'No healthy service instances available',
          timestamp: new Date().toISOString()
        });
      }

      const testUrl = `${instance.baseUrl}${path}`;
      const startTime = Date.now();

      try {
        const response = await fetch(testUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'x-gateway-test': 'true',
            ...headers
          },
          body: body ? JSON.stringify(body) : undefined
        });

        const responseTime = Date.now() - startTime;
        const responseBody = await response.text();
        
        let parsedBody;
        try {
          parsedBody = JSON.parse(responseBody);
        } catch {
          parsedBody = responseBody;
        }

        res.json({
          success: true,
          data: {
            request: {
              url: testUrl,
              method,
              headers,
              body
            },
            response: {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              body: parsedBody,
              responseTime
            },
            service: {
              id: service.id,
              name: service.name,
              instance: instance.id
            }
          },
          timestamp: new Date().toISOString()
        });
      } catch (testError: any) {
        const responseTime = Date.now() - startTime;
        
        res.status(500).json({
          success: false,
          error: 'Route test failed',
          data: {
            request: {
              url: testUrl,
              method,
              headers,
              body
            },
            error: {
              message: testError.message,
              code: testError.code,
              responseTime
            },
            service: {
              id: service.id,
              name: service.name,
              instance: instance.id
            }
          },
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to test route:', error);
      res.status(400).json({
        success: false,
        error: error instanceof z.ZodError ? error.errors : 'Failed to test route',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Gateway Events (Server-Sent Events for real-time updates)
  router.get('/api/gateway/events', async (req: Request, res: Response) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date() })}\n\n`);
    }, 30000);

    const sendEvent = (type: string, data: any) => {
      res.write(`data: ${JSON.stringify({ type, data, timestamp: new Date() })}\n\n`);
    };

    // Listen to gateway events
    const eventHandlers = {
      circuitBreakerOpened: (data: any) => sendEvent('circuit-breaker-opened', data),
      circuitBreakerClosed: (data: any) => sendEvent('circuit-breaker-closed', data),
      serviceUnhealthy: (data: any) => sendEvent('service-unhealthy', data),
      serviceHealthy: (data: any) => sendEvent('service-healthy', data)
    };

    // Attach event listeners
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      gateway.on(event, handler);
    });

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        gateway.off(event, handler);
      });
    });

    // Send initial connection event
    sendEvent('connected', { message: 'Gateway event stream connected' });
  });

  // Health check endpoint for the gateway itself
  router.get('/api/gateway', async (req: Request, res: Response) => {
    try {
      const uptime = process.uptime();
      const memory = process.memoryUsage();
      const services = gateway.getServices();
      
      res.json({
        success: true,
        data: {
          gateway: {
            name: 'FANZ API Gateway',
            version: '1.0.0',
            status: 'healthy',
            uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
            uptimeSeconds: uptime,
            memory: {
              used: Math.round(memory.heapUsed / 1024 / 1024),
              total: Math.round(memory.heapTotal / 1024 / 1024),
              external: Math.round(memory.external / 1024 / 1024),
              rss: Math.round(memory.rss / 1024 / 1024)
            }
          },
          services: {
            total: services.length,
            healthy: services.filter(s => s.status === 'healthy').length,
            unhealthy: services.filter(s => s.status === 'unhealthy').length,
            unknown: services.filter(s => s.status === 'unknown').length
          },
          features: {
            rateLimiting: gateway.rateLimiter['config'].enabled,
            circuitBreaker: gateway.circuitBreaker['config'].enabled,
            loadBalancing: gateway.loadBalancer['config'].enabled,
            caching: gateway.cache['config'].enabled
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Gateway health check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Gateway health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  console.log('🚪 API Gateway dashboard routes configured');
}