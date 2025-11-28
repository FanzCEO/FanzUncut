// API Gateway Middleware Setup
// Integrates API Gateway service mesh into BoyFanz Express server

import { Express } from 'express';
import { apiGateway } from '../services/apiGatewayInit.js';

// Apply API Gateway middleware to Express app
export function setupGatewayMiddleware(app: Express) {
  console.log('🚪 Setting up API Gateway middleware...');
  
  // Apply rate limiting middleware globally for API routes
  app.use('/api/*', apiGateway.rateLimiter.createMiddleware());
  
  // Apply caching middleware for cacheable routes
  app.use('/api/*', (req, res, next) => {
    // Only apply caching to GET requests for specific endpoints
    if (req.method === 'GET' && shouldCache(req.path)) {
      return apiGateway.cache.createMiddleware()(req, res, next);
    }
    next();
  });
  
  // Apply gateway routing middleware - this will intercept and route API calls
  // But only for routes that are registered with the gateway
  app.use((req, res, next) => {
    // Skip if not an API route
    if (!req.path.startsWith('/api/')) {
      return next();
    }
    
    // Check if this is a route managed by the gateway
    const route = findGatewayRoute(req);
    if (route) {
      // Let the gateway handle this request
      return apiGateway.createGatewayMiddleware()(req, res, next);
    }
    
    // Let normal routing handle this
    next();
  });
  
  console.log('✅ API Gateway middleware configured');
}

// Determine if a path should be cached
function shouldCache(path: string): boolean {
  const cacheablePaths = [
    '/api/infrastructure/status',
    '/api/security/compliance',
    '/api/monitoring/metrics',
    '/api/mobile/content',
    '/api/gateway/services',
    '/api/gateway/health'
  ];
  
  // Cache public endpoints
  if (path.includes('/public/')) {
    return true;
  }
  
  // Cache specific paths
  return cacheablePaths.some(cachePath => path.startsWith(cachePath));
}

// Check if a route is managed by the gateway
function findGatewayRoute(req: any): boolean {
  const services = apiGateway.getServices();
  const requestPath = req.path;
  const requestMethod = req.method;
  
  for (const service of services) {
    for (const route of service.routes) {
      // Handle wildcard paths
      if (route.path.endsWith('/*')) {
        const basePath = route.path.slice(0, -2);
        if (requestPath.startsWith(basePath) && 
            (route.method === 'ALL' || route.method === requestMethod)) {
          return true;
        }
      } else if (requestPath === route.path && 
                 (route.method === 'ALL' || route.method === requestMethod)) {
        return true;
      }
    }
  }
  
  return false;
}

// Export the API Gateway instance for health checks and diagnostics
export { apiGateway };