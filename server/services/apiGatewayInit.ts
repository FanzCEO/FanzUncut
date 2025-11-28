// API Gateway Initialization Service
// Sets up and configures the API Gateway for FANZ ecosystem

import { APIGatewayService, GatewayConfigSchema } from './apiGatewayService.js';

// Initialize API Gateway with production-ready configuration
const gatewayConfig = GatewayConfigSchema.parse({
  serviceName: 'fanz-api-gateway',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  
  // Rate Limiting Configuration
  rateLimiting: {
    enabled: true,
    windowMs: 60000, // 1 minute window
    maxRequests: process.env.NODE_ENV === 'production' ? 1000 : 10000, // Higher limit for dev
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: 'ip',
    store: 'memory' // In production, use Redis
  },

  // Authentication Configuration
  authentication: {
    enabled: true,
    methods: ['jwt', 'api_key'],
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    apiKeyHeader: 'x-api-key',
    skipRoutes: ['/health', '/metrics', '/api/gateway', '/api/gateway/health'],
    requireRoles: false
  },

  // Load Balancing Configuration
  loadBalancing: {
    enabled: true,
    algorithm: 'round_robin',
    healthCheck: {
      enabled: false, // DISABLED: Fake services causing spam logs
      endpoint: '/health',
      interval: 30, // seconds
      timeout: 5, // seconds
      unhealthyThreshold: 3,
      healthyThreshold: 2
    }
  },

  // Circuit Breaker Configuration
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
    monitoringPeriod: 30000 // 30 seconds
  },

  // Logging Configuration
  logging: {
    enabled: true,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    includeRequestBody: process.env.NODE_ENV !== 'production',
    includeResponseBody: false,
    sanitizeHeaders: ['authorization', 'x-api-key', 'cookie']
  },

  // Caching Configuration
  caching: {
    enabled: true,
    defaultTTL: 300, // 5 minutes
    maxSize: 100, // 100MB
    cacheableStatusCodes: [200, 300, 301, 404, 410],
    cacheableMethods: ['GET', 'HEAD']
  },

  // Monitoring Configuration
  monitoring: {
    enabled: true,
    metricsEndpoint: '/metrics',
    tracingEnabled: process.env.NODE_ENV === 'production',
    healthCheckEndpoint: '/health'
  }
});

// Create and export the API Gateway instance
export const apiGateway = new APIGatewayService(gatewayConfig);

// Gateway event handlers
apiGateway.on('circuitBreakerOpened', (data) => {
  console.warn(`🔴 Circuit breaker opened for ${data.circuitName}:`, {
    failures: data.circuit.consecutiveFailures,
    lastFailure: new Date(data.circuit.lastFailureTime).toISOString()
  });
  
  // In production, send alerts to monitoring systems
  if (process.env.NODE_ENV === 'production') {
    // Send to Slack, PagerDuty, etc.
  }
});

apiGateway.on('circuitBreakerClosed', (data) => {
  console.log(`🟢 Circuit breaker closed for ${data.circuitName}:`, {
    recoveredAt: new Date(data.circuit.lastSuccessTime).toISOString()
  });
});

apiGateway.on('serviceUnhealthy', (data) => {
  console.warn(`🔴 Service instance unhealthy: ${data.serviceName}/${data.instance.id}`, {
    baseUrl: data.instance.baseUrl,
    error: data.error?.message || 'Health check failed'
  });
  
  // In production, trigger alerts and potentially scale instances
  if (process.env.NODE_ENV === 'production') {
    // Auto-scaling logic here
  }
});

apiGateway.on('serviceHealthy', (data) => {
  console.log(`🟢 Service instance recovered: ${data.serviceName}/${data.instance.id}`, {
    baseUrl: data.instance.baseUrl,
    recoveredAt: new Date().toISOString()
  });
});

// Enhanced service registration for FANZ ecosystem
export function registerFANZServices() {
  console.log('🌐 Registering FANZ ecosystem services...');

  // Register core platform services
  const platforms = [
    { id: 'boyfanz', name: 'BoyFanz', port: 5001 },
    { id: 'girlfanz', name: 'GirlFanz', port: 5002 },
    { id: 'pupfanz', name: 'PupFanz', port: 5003 },
    { id: 'transfanz', name: 'TransFanz', port: 5004 },
    { id: 'taboofanz', name: 'TabooFanz', port: 5005 }
  ];

  platforms.forEach(platform => {
    apiGateway.registerService({
      id: platform.id,
      name: platform.name,
      version: '1.0.0',
      baseUrl: process.env[`${platform.id.toUpperCase()}_SERVICE_URL`] || `http://localhost:${platform.port}`,
      healthCheckUrl: '/health',
      status: 'unknown',
      lastHealthCheck: new Date(),
      metadata: { 
        type: 'platform', 
        priority: 'high',
        domain: `${platform.id}.com`,
        features: ['content', 'creators', 'fans', 'payments']
      },
      routes: [
        {
          path: `/api/${platform.id}/*`,
          method: 'ALL',
          target: '/api',
          auth: true,
          timeout: 15000,
          rateLimit: { 
            maxRequests: 500, 
            windowMs: 60000 
          },
          cache: { 
            ttl: 300, 
            varyBy: ['authorization', 'accept-language'] 
          }
        },
        {
          path: `/api/${platform.id}/public/*`,
          method: 'GET',
          target: '/api/public',
          auth: false,
          timeout: 10000,
          cache: { 
            ttl: 600,
            varyBy: ['accept-language']
          }
        }
      ]
    });
  });

  // Register infrastructure services
  apiGateway.registerService({
    id: 'infrastructure',
    name: 'Infrastructure Management',
    version: '1.0.0',
    baseUrl: process.env.INFRASTRUCTURE_SERVICE_URL || 'http://localhost:5000',
    healthCheckUrl: '/api/infrastructure/health',
    status: 'unknown',
    lastHealthCheck: new Date(),
    metadata: { 
      type: 'internal', 
      priority: 'critical',
      features: ['monitoring', 'deployment', 'scaling', 'billing']
    },
    routes: [
      {
        path: '/api/infrastructure/*',
        method: 'ALL',
        target: '/api/infrastructure',
        auth: true,
        timeout: 30000,
        rateLimit: { 
          maxRequests: 100, 
          windowMs: 60000 
        }
      }
    ]
  });

  // Register security services
  apiGateway.registerService({
    id: 'security',
    name: 'Security & Compliance',
    version: '1.0.0',
    baseUrl: process.env.SECURITY_SERVICE_URL || 'http://localhost:5000',
    healthCheckUrl: '/api/security/health',
    status: 'unknown',
    lastHealthCheck: new Date(),
    metadata: { 
      type: 'internal', 
      priority: 'critical',
      features: ['drm', 'compliance', 'geoblocking', 'audit']
    },
    routes: [
      {
        path: '/api/security/*',
        method: 'ALL',
        target: '/api/security',
        auth: true,
        timeout: 15000,
        rateLimit: { 
          maxRequests: 200, 
          windowMs: 60000 
        }
      }
    ]
  });

  // Register mobile backend services
  apiGateway.registerService({
    id: 'mobile',
    name: 'Mobile Backend (ClubCentral)',
    version: '1.0.0',
    baseUrl: process.env.MOBILE_SERVICE_URL || 'http://localhost:5000',
    healthCheckUrl: '/api/mobile/health',
    status: 'unknown',
    lastHealthCheck: new Date(),
    metadata: { 
      type: 'internal', 
      priority: 'high',
      features: ['push_notifications', 'sync', 'offline', 'device_management']
    },
    routes: [
      {
        path: '/api/mobile/*',
        method: 'ALL',
        target: '/api/mobile',
        auth: true,
        timeout: 10000,
        rateLimit: { 
          maxRequests: 1000, 
          windowMs: 60000,
          keyGenerator: 'user' 
        },
        cache: { 
          ttl: 180,
          varyBy: ['authorization', 'x-device-id']
        }
      }
    ]
  });

  // Register monitoring services
  apiGateway.registerService({
    id: 'monitoring',
    name: 'Real-Time Monitoring',
    version: '1.0.0',
    baseUrl: process.env.MONITORING_SERVICE_URL || 'http://localhost:5000',
    healthCheckUrl: '/api/monitoring/health',
    status: 'unknown',
    lastHealthCheck: new Date(),
    metadata: { 
      type: 'internal', 
      priority: 'high',
      features: ['metrics', 'alerts', 'analytics', 'reporting']
    },
    routes: [
      {
        path: '/api/monitoring/*',
        method: 'ALL',
        target: '/api/monitoring',
        auth: true,
        timeout: 20000,
        rateLimit: { 
          maxRequests: 300, 
          windowMs: 60000 
        }
      }
    ]
  });

  // Register FanzDash (Super Admin Dashboard)
  apiGateway.registerService({
    id: 'fanzdash',
    name: 'FanzDash (Super Admin)',
    version: '1.0.0',
    baseUrl: process.env.FANZDASH_SERVICE_URL || 'http://localhost:6000',
    healthCheckUrl: '/health',
    status: 'unknown',
    lastHealthCheck: new Date(),
    metadata: { 
      type: 'admin', 
      priority: 'critical',
      features: ['dashboard', 'moderation', 'analytics', 'control_center']
    },
    routes: [
      {
        path: '/api/fanzdash/*',
        method: 'ALL',
        target: '/api',
        auth: true,
        timeout: 30000,
        rateLimit: { 
          maxRequests: 50, 
          windowMs: 60000,
          keyGenerator: 'user' 
        }
      }
    ]
  });

  // Register payment processing services
  apiGateway.registerService({
    id: 'payments',
    name: 'Payment Processing',
    version: '1.0.0',
    baseUrl: process.env.PAYMENTS_SERVICE_URL || 'http://localhost:5000',
    healthCheckUrl: '/api/payments/health',
    status: 'unknown',
    lastHealthCheck: new Date(),
    metadata: { 
      type: 'internal', 
      priority: 'critical',
      features: ['billing', 'payouts', 'compliance', 'fraud_detection']
    },
    routes: [
      {
        path: '/api/payments/*',
        method: 'ALL',
        target: '/api/payments',
        auth: true,
        timeout: 45000, // Higher timeout for payment processing
        rateLimit: { 
          maxRequests: 100, 
          windowMs: 60000,
          keyGenerator: 'user' 
        }
      }
    ]
  });

  // Register media services
  apiGateway.registerService({
    id: 'media',
    name: 'Media Processing (MediaHub)',
    version: '1.0.0',
    baseUrl: process.env.MEDIA_SERVICE_URL || 'http://localhost:7000',
    healthCheckUrl: '/health',
    status: 'unknown',
    lastHealthCheck: new Date(),
    metadata: { 
      type: 'internal', 
      priority: 'high',
      features: ['processing', 'watermarking', 'streaming', 'cdn']
    },
    routes: [
      {
        path: '/api/media/*',
        method: 'ALL',
        target: '/api',
        auth: true,
        timeout: 60000, // Higher timeout for media processing
        rateLimit: { 
          maxRequests: 200, 
          windowMs: 60000 
        }
      }
    ]
  });

  console.log('✅ All FANZ ecosystem services registered with API Gateway');
}

// Health check and diagnostics
export function getGatewayStatus() {
  return {
    gateway: {
      name: 'FANZ API Gateway',
      version: '1.0.0',
      status: 'healthy',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    },
    services: apiGateway.getServices().length,
    features: {
      rateLimiting: apiGateway.rateLimiter['config'].enabled,
      circuitBreaker: apiGateway.circuitBreaker['config'].enabled,
      loadBalancing: apiGateway.loadBalancer['config'].enabled,
      caching: apiGateway.cache['config'].enabled
    },
    metrics: apiGateway.getMetrics(),
    timestamp: new Date().toISOString()
  };
}

// Export configuration for debugging
export { gatewayConfig };

console.log('🚪 API Gateway service initialized');