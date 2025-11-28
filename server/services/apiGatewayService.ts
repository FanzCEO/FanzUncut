// API Gateway & Integration Hub Service
// Unified service mesh architecture with rate limiting, authentication, and service orchestration

import { EventEmitter } from 'events';
import { z } from 'zod';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Gateway Configuration Types
export interface GatewayConfig {
  serviceName: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  rateLimiting: RateLimitConfig;
  authentication: AuthConfig;
  loadBalancing: LoadBalancingConfig;
  circuitBreaker: CircuitBreakerConfig;
  logging: LoggingConfig;
  caching: CachingConfig;
  monitoring: MonitoringConfig;
}

export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator: 'ip' | 'user' | 'api_key';
  store: 'memory' | 'redis';
}

export interface AuthConfig {
  enabled: boolean;
  methods: ('jwt' | 'api_key' | 'oauth2')[];
  jwtSecret: string;
  apiKeyHeader: string;
  skipRoutes: string[];
  requireRoles: boolean;
}

export interface LoadBalancingConfig {
  enabled: boolean;
  algorithm: 'round_robin' | 'weighted' | 'least_connections' | 'ip_hash';
  healthCheck: {
    enabled: boolean;
    endpoint: string;
    interval: number; // seconds
    timeout: number; // seconds
    unhealthyThreshold: number;
    healthyThreshold: number;
  };
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  resetTimeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug';
  includeRequestBody: boolean;
  includeResponseBody: boolean;
  sanitizeHeaders: string[];
}

export interface CachingConfig {
  enabled: boolean;
  defaultTTL: number; // seconds
  maxSize: number; // MB
  cacheableStatusCodes: number[];
  cacheableMethods: string[];
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsEndpoint: string;
  tracingEnabled: boolean;
  healthCheckEndpoint: string;
}

export interface ServiceRegistry {
  id: string;
  name: string;
  version: string;
  baseUrl: string;
  healthCheckUrl: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck: Date;
  metadata: Record<string, any>;
  routes: RouteDefinition[];
}

export interface RouteDefinition {
  path: string;
  method: string;
  target: string;
  auth: boolean;
  rateLimit?: RateLimitRule;
  cache?: CacheRule;
  timeout?: number;
  retries?: number;
}

export interface RateLimitRule {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: string;
}

export interface CacheRule {
  ttl: number;
  key?: string;
  varyBy?: string[];
}

// Rate Limiting Service
export class RateLimitService {
  private limits: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async checkLimit(key: string, rule?: RateLimitRule): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const maxRequests = rule?.maxRequests || this.config.maxRequests;
    const windowMs = rule?.windowMs || this.config.windowMs;
    const now = Date.now();
    const resetTime = now + windowMs;

    const current = this.limits.get(key);

    if (!current || current.resetTime <= now) {
      // First request or window expired
      this.limits.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime
      };
    }

    if (current.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }

    current.count++;
    return {
      allowed: true,
      remaining: maxRequests - current.count,
      resetTime: current.resetTime
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.limits.entries()) {
      if (value.resetTime <= now) {
        this.limits.delete(key);
      }
    }
  }

  generateKey(req: Request, keyType: string = this.config.keyGenerator): string {
    switch (keyType) {
      case 'ip':
        return req.ip || req.connection.remoteAddress || 'unknown';
      case 'user':
        return (req as any).user?.id || req.ip || 'anonymous';
      case 'api_key':
        return req.headers['x-api-key'] as string || req.ip || 'no-key';
      default:
        return req.ip || 'default';
    }
  }

  createMiddleware(rule?: RateLimitRule) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      const key = this.generateKey(req, rule?.keyGenerator);
      const result = await this.checkLimit(key, rule);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', rule?.maxRequests || this.config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        });
      }

      next();
    };
  }
}

// Circuit Breaker Service
export class CircuitBreakerService extends EventEmitter {
  private circuits: Map<string, CircuitState> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    super();
    this.config = config;
  }

  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (!this.config.enabled) {
      return operation();
    }

    const circuit = this.getOrCreateCircuit(circuitName);

    if (circuit.state === 'open') {
      if (Date.now() - circuit.lastFailureTime > this.config.resetTimeout) {
        circuit.state = 'half-open';
        circuit.consecutiveFailures = 0;
      } else {
        this.emit('circuitOpen', { circuitName, circuit });
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker is OPEN for ${circuitName}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess(circuit, circuitName);
      return result;
    } catch (error) {
      this.onFailure(circuit, circuitName);
      if (fallback && circuit.state === 'open') {
        return fallback();
      }
      throw error;
    }
  }

  private getOrCreateCircuit(name: string): CircuitState {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        state: 'closed',
        consecutiveFailures: 0,
        lastFailureTime: 0,
        lastSuccessTime: Date.now()
      });
    }
    return this.circuits.get(name)!;
  }

  private onSuccess(circuit: CircuitState, name: string) {
    circuit.consecutiveFailures = 0;
    circuit.lastSuccessTime = Date.now();

    if (circuit.state === 'half-open') {
      circuit.state = 'closed';
      this.emit('circuitClosed', { circuitName: name, circuit });
    }
  }

  private onFailure(circuit: CircuitState, name: string) {
    circuit.consecutiveFailures++;
    circuit.lastFailureTime = Date.now();

    if (circuit.consecutiveFailures >= this.config.failureThreshold) {
      circuit.state = 'open';
      this.emit('circuitOpened', { circuitName: name, circuit });
    }
  }

  getCircuitStatus(name: string): CircuitState | null {
    return this.circuits.get(name) || null;
  }

  getAllCircuitStatus(): Record<string, CircuitState> {
    const status: Record<string, CircuitState> = {};
    this.circuits.forEach((state, name) => {
      status[name] = state;
    });
    return status;
  }
}

interface CircuitState {
  state: 'closed' | 'open' | 'half-open';
  consecutiveFailures: number;
  lastFailureTime: number;
  lastSuccessTime: number;
}

// Load Balancer Service
export class LoadBalancerService extends EventEmitter {
  private services: Map<string, ServiceInstance[]> = new Map();
  private config: LoadBalancingConfig;
  private currentIndex: Map<string, number> = new Map();

  constructor(config: LoadBalancingConfig) {
    super();
    this.config = config;

    if (config.healthCheck.enabled) {
      this.startHealthChecks();
    }
  }

  registerService(serviceName: string, instances: ServiceInstance[]) {
    this.services.set(serviceName, instances);
    this.currentIndex.set(serviceName, 0);
  }

  getNextInstance(serviceName: string, req?: Request): ServiceInstance | null {
    const instances = this.services.get(serviceName);
    if (!instances || instances.length === 0) {
      return null;
    }

    const healthyInstances = instances.filter(i => i.healthy);
    if (healthyInstances.length === 0) {
      // No healthy instances, return any instance as fallback
      return instances[0];
    }

    switch (this.config.algorithm) {
      case 'round_robin':
        return this.roundRobinSelect(serviceName, healthyInstances);
      case 'weighted':
        return this.weightedSelect(healthyInstances);
      case 'least_connections':
        return this.leastConnectionsSelect(healthyInstances);
      case 'ip_hash':
        return this.ipHashSelect(healthyInstances, req);
      default:
        return healthyInstances[0];
    }
  }

  private roundRobinSelect(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    const currentIdx = this.currentIndex.get(serviceName) || 0;
    const instance = instances[currentIdx % instances.length];
    this.currentIndex.set(serviceName, (currentIdx + 1) % instances.length);
    return instance;
  }

  private weightedSelect(instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, instance) => sum + (instance.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const instance of instances) {
      random -= (instance.weight || 1);
      if (random <= 0) {
        return instance;
      }
    }

    return instances[0];
  }

  private leastConnectionsSelect(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((least, current) => 
      (current.connections || 0) < (least.connections || 0) ? current : least
    );
  }

  private ipHashSelect(instances: ServiceInstance[], req?: Request): ServiceInstance {
    if (!req) return instances[0];

    const ip = req.ip || req.connection.remoteAddress || '';
    const hash = createHash('md5').update(ip).digest('hex');
    const index = parseInt(hash.substring(0, 8), 16) % instances.length;
    return instances[index];
  }

  private async startHealthChecks() {
    setInterval(async () => {
      for (const [serviceName, instances] of this.services.entries()) {
        await Promise.all(
          instances.map(instance => this.checkInstanceHealth(serviceName, instance))
        );
      }
    }, this.config.healthCheck.interval * 1000);
  }

  private async checkInstanceHealth(serviceName: string, instance: ServiceInstance) {
    try {
      const response = await axios.get(
        `${instance.baseUrl}${this.config.healthCheck.endpoint}`,
        {
          timeout: this.config.healthCheck.timeout * 1000,
          validateStatus: (status) => status >= 200 && status < 400
        }
      );

      if (!instance.healthy) {
        instance.healthyChecks = (instance.healthyChecks || 0) + 1;
        if (instance.healthyChecks >= this.config.healthCheck.healthyThreshold) {
          instance.healthy = true;
          instance.healthyChecks = 0;
          this.emit('instanceHealthy', { serviceName, instance });
        }
      } else {
        instance.unhealthyChecks = 0;
      }

      instance.lastHealthCheck = new Date();
    } catch (error) {
      if (instance.healthy) {
        instance.unhealthyChecks = (instance.unhealthyChecks || 0) + 1;
        if (instance.unhealthyChecks >= this.config.healthCheck.unhealthyThreshold) {
          instance.healthy = false;
          instance.unhealthyChecks = 0;
          this.emit('instanceUnhealthy', { serviceName, instance, error });
        }
      }
    }
  }

  getServiceHealth(serviceName: string): ServiceHealthStatus | null {
    const instances = this.services.get(serviceName);
    if (!instances) return null;

    const healthyCount = instances.filter(i => i.healthy).length;
    return {
      serviceName,
      totalInstances: instances.length,
      healthyInstances: healthyCount,
      unhealthyInstances: instances.length - healthyCount,
      instances
    };
  }
}

interface ServiceInstance {
  id: string;
  baseUrl: string;
  healthy: boolean;
  weight?: number;
  connections?: number;
  lastHealthCheck?: Date;
  healthyChecks?: number;
  unhealthyChecks?: number;
  metadata?: Record<string, any>;
}

interface ServiceHealthStatus {
  serviceName: string;
  totalInstances: number;
  healthyInstances: number;
  unhealthyInstances: number;
  instances: ServiceInstance[];
}

// Cache Service
export class CacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CachingConfig;

  constructor(config: CachingConfig) {
    this.config = config;
    
    // Cleanup expired entries
    setInterval(() => this.cleanup(), 60000);
  }

  generateKey(req: Request, rule?: CacheRule): string {
    const baseKey = `${req.method}:${req.path}`;
    
    if (rule?.varyBy) {
      const varies = rule.varyBy.map(header => 
        req.headers[header.toLowerCase()] || ''
      ).join(':');
      return `${baseKey}:${varies}`;
    }

    return rule?.key || baseKey;
  }

  get(key: string): any | null {
    if (!this.config.enabled) return null;

    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    return entry.data;
  }

  set(key: string, data: any, ttl?: number): void {
    if (!this.config.enabled) return;

    const ttlMs = (ttl || this.config.defaultTTL) * 1000;
    const entry: CacheEntry = {
      data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      size: this.estimateSize(data)
    };

    this.cache.set(key, entry);
    this.enforceMaxSize();
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  private enforceMaxSize(): void {
    const maxSizeBytes = this.config.maxSize * 1024 * 1024; // MB to bytes
    let totalSize = 0;

    // Calculate total size
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }

    if (totalSize <= maxSizeBytes) return;

    // Remove least recently used entries
    const entries = Array.from(this.cache.entries())
      .sort(([,a], [,b]) => a.lastAccessed - b.lastAccessed);

    while (totalSize > maxSizeBytes && entries.length > 0) {
      const [key, entry] = entries.shift()!;
      this.cache.delete(key);
      totalSize -= entry.size;
    }
  }

  private estimateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimate
  }

  getStats(): CacheStats {
    let totalSize = 0;
    let totalAccesses = 0;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      totalSize += entry.size;
      totalAccesses += entry.accessCount;
    }

    return {
      entries: this.cache.size,
      totalSizeBytes: totalSize,
      totalSizeMB: totalSize / (1024 * 1024),
      maxSizeMB: this.config.maxSize,
      hitRate: 0, // Would track hits/misses
      totalAccesses
    };
  }

  createMiddleware(rule?: CacheRule) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled || 
          !this.config.cacheableMethods.includes(req.method)) {
        return next();
      }

      const key = this.generateKey(req, rule);
      const cached = this.get(key);

      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', key);
        return res.json(cached);
      }

      res.setHeader('X-Cache', 'MISS');
      
      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (data: any) => {
        if (this.config.cacheableStatusCodes.includes(res.statusCode)) {
          this.set(key, data, rule?.ttl);
        }
        return originalJson(data);
      };

      next();
    };
  }
}

interface CacheEntry {
  data: any;
  expiresAt: number;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  size: number;
}

interface CacheStats {
  entries: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  maxSizeMB: number;
  hitRate: number;
  totalAccesses: number;
}

// Main API Gateway Service
export class APIGatewayService extends EventEmitter {
  public rateLimiter: RateLimitService;
  public circuitBreaker: CircuitBreakerService;
  public loadBalancer: LoadBalancerService;
  public cache: CacheService;
  
  private config: GatewayConfig;
  private services: Map<string, ServiceRegistry> = new Map();
  private routes: Map<string, RouteDefinition> = new Map();

  constructor(config: GatewayConfig) {
    super();
    this.config = config;

    // Initialize services
    this.rateLimiter = new RateLimitService(config.rateLimiting);
    this.circuitBreaker = new CircuitBreakerService(config.circuitBreaker);
    this.loadBalancer = new LoadBalancerService(config.loadBalancing);
    this.cache = new CacheService(config.caching);

    this.setupEventHandlers();
    this.initializeDefaultServices();
  }

  private setupEventHandlers() {
    this.circuitBreaker.on('circuitOpened', (data) => {
      console.warn(`🔴 Circuit breaker opened for ${data.circuitName}`);
      this.emit('circuitBreakerOpened', data);
    });

    this.circuitBreaker.on('circuitClosed', (data) => {
      console.log(`🟢 Circuit breaker closed for ${data.circuitName}`);
      this.emit('circuitBreakerClosed', data);
    });

    this.loadBalancer.on('instanceUnhealthy', (data) => {
      console.warn(`🔴 Service instance unhealthy: ${data.serviceName}/${data.instance.id}`);
      this.emit('serviceUnhealthy', data);
    });

    this.loadBalancer.on('instanceHealthy', (data) => {
      console.log(`🟢 Service instance healthy: ${data.serviceName}/${data.instance.id}`);
      this.emit('serviceHealthy', data);
    });
  }

  private initializeDefaultServices() {
    // Register FANZ ecosystem services
    this.registerService({
      id: 'infrastructure',
      name: 'Infrastructure Management',
      version: '1.0.0',
      baseUrl: process.env.INFRASTRUCTURE_SERVICE_URL || 'http://localhost:5000',
      healthCheckUrl: '/api/infrastructure/health',
      status: 'unknown',
      lastHealthCheck: new Date(),
      metadata: { type: 'internal', priority: 'high' },
      routes: [
        {
          path: '/api/infrastructure/*',
          method: 'ALL',
          target: '/api/infrastructure',
          auth: true,
          timeout: 30000
        }
      ]
    });

    this.registerService({
      id: 'security',
      name: 'Security & Compliance',
      version: '1.0.0',
      baseUrl: process.env.SECURITY_SERVICE_URL || 'http://localhost:5000',
      healthCheckUrl: '/api/security/health',
      status: 'unknown',
      lastHealthCheck: new Date(),
      metadata: { type: 'internal', priority: 'critical' },
      routes: [
        {
          path: '/api/security/*',
          method: 'ALL',
          target: '/api/security',
          auth: true,
          timeout: 15000
        }
      ]
    });

    this.registerService({
      id: 'mobile',
      name: 'Mobile Backend (ClubCentral)',
      version: '1.0.0',
      baseUrl: process.env.MOBILE_SERVICE_URL || 'http://localhost:5000',
      healthCheckUrl: '/api/mobile/health',
      status: 'unknown',
      lastHealthCheck: new Date(),
      metadata: { type: 'internal', priority: 'high' },
      routes: [
        {
          path: '/api/mobile/*',
          method: 'ALL',
          target: '/api/mobile',
          auth: true,
          timeout: 10000,
          rateLimit: { maxRequests: 1000, windowMs: 60000 }
        }
      ]
    });

    this.registerService({
      id: 'monitoring',
      name: 'Real-Time Monitoring',
      version: '1.0.0',
      baseUrl: process.env.MONITORING_SERVICE_URL || 'http://localhost:5000',
      healthCheckUrl: '/api/monitoring/health',
      status: 'unknown',
      lastHealthCheck: new Date(),
      metadata: { type: 'internal', priority: 'high' },
      routes: [
        {
          path: '/api/monitoring/*',
          method: 'ALL',
          target: '/api/monitoring',
          auth: true,
          timeout: 20000
        }
      ]
    });

    // Register platform services
    const platforms = ['boyfanz', 'girlfanz', 'pupfanz', 'transfanz', 'taboofanz'];
    platforms.forEach(platform => {
      this.registerService({
        id: platform,
        name: platform.charAt(0).toUpperCase() + platform.slice(1),
        version: '1.0.0',
        baseUrl: process.env[`${platform.toUpperCase()}_SERVICE_URL`] || `http://localhost:500${platforms.indexOf(platform)}`,
        healthCheckUrl: '/health',
        status: 'unknown',
        lastHealthCheck: new Date(),
        metadata: { type: 'platform', priority: 'high' },
        routes: [
          {
            path: `/api/${platform}/*`,
            method: 'ALL',
            target: '/api',
            auth: true,
            timeout: 15000,
            rateLimit: { maxRequests: 500, windowMs: 60000 },
            cache: { ttl: 300, varyBy: ['authorization'] }
          }
        ]
      });
    });
  }

  registerService(service: ServiceRegistry) {
    this.services.set(service.id, service);
    
    // Register routes
    service.routes.forEach(route => {
      const routeKey = `${route.method}:${route.path}`;
      this.routes.set(routeKey, { ...route, target: `${service.baseUrl}${route.target}` });
    });

    // Register with load balancer
    this.loadBalancer.registerService(service.id, [{
      id: `${service.id}-1`,
      baseUrl: service.baseUrl,
      healthy: true,
      weight: 1,
      connections: 0
    }]);

    console.log(`📡 Registered service: ${service.name} (${service.id})`);
  }

  unregisterService(serviceId: string) {
    const service = this.services.get(serviceId);
    if (!service) return false;

    // Remove routes
    service.routes.forEach(route => {
      const routeKey = `${route.method}:${route.path}`;
      this.routes.delete(routeKey);
    });

    this.services.delete(serviceId);
    console.log(`📡 Unregistered service: ${serviceId}`);
    return true;
  }

  async forwardRequest(req: Request, res: Response): Promise<void> {
    const route = this.findMatchingRoute(req);
    
    if (!route) {
      return this.sendErrorResponse(res, 404, 'Route not found');
    }

    try {
      // Get service instance
      const serviceId = this.getServiceIdFromRoute(route);
      const instance = this.loadBalancer.getNextInstance(serviceId, req);
      
      if (!instance) {
        return this.sendErrorResponse(res, 503, 'Service unavailable');
      }

      // Build target URL
      const targetUrl = this.buildTargetUrl(instance.baseUrl, req, route);

      // Execute with circuit breaker
      const response = await this.circuitBreaker.execute(
        `${serviceId}-${req.method}-${req.path}`,
        async () => {
          return axios.request({
            method: req.method as any,
            url: targetUrl,
            data: req.body,
            headers: this.prepareHeaders(req),
            timeout: route.timeout || 30000,
            validateStatus: (status) => status < 500
          });
        },
        async () => {
          // Fallback response
          return {
            status: 503,
            data: { error: 'Service temporarily unavailable', fallback: true }
          } as any;
        }
      );

      // Forward response
      res.status(response.status);
      
      // Set response headers
      Object.entries(response.headers || {}).forEach(([key, value]) => {
        if (typeof value === 'string' && !key.toLowerCase().startsWith('x-')) {
          res.setHeader(key, value);
        }
      });

      res.json(response.data);

    } catch (error) {
      console.error('Request forwarding failed:', error);
      this.sendErrorResponse(res, 500, 'Internal gateway error');
    }
  }

  private findMatchingRoute(req: Request): RouteDefinition | null {
    const method = req.method.toUpperCase();
    const path = req.path;

    // Try exact match first
    const exactKey = `${method}:${path}`;
    if (this.routes.has(exactKey)) {
      return this.routes.get(exactKey)!;
    }

    // Try wildcard matches
    for (const [routeKey, route] of this.routes.entries()) {
      const [routeMethod, routePath] = routeKey.split(':', 2);
      
      if ((routeMethod === method || routeMethod === 'ALL') && 
          this.pathMatches(path, routePath)) {
        return route;
      }
    }

    return null;
  }

  private pathMatches(requestPath: string, routePath: string): boolean {
    if (routePath.endsWith('/*')) {
      const basePath = routePath.slice(0, -2);
      return requestPath.startsWith(basePath);
    }
    return requestPath === routePath;
  }

  private getServiceIdFromRoute(route: RouteDefinition): string {
    // Extract service ID from target URL or route
    for (const [serviceId, service] of this.services.entries()) {
      if (route.target.startsWith(service.baseUrl)) {
        return serviceId;
      }
    }
    return 'unknown';
  }

  private buildTargetUrl(baseUrl: string, req: Request, route: RouteDefinition): string {
    let targetPath = req.path;
    
    // Remove route prefix if needed
    const routePrefix = route.path.replace('/*', '');
    if (targetPath.startsWith(routePrefix)) {
      targetPath = targetPath.substring(routePrefix.length);
    }
    
    const queryString = req.url?.includes('?') ? req.url.split('?')[1] : '';
    return `${baseUrl}${route.target}${targetPath}${queryString ? '?' + queryString : ''}`;
  }

  private prepareHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Copy important headers
    const importantHeaders = [
      'authorization',
      'content-type',
      'user-agent',
      'x-api-key',
      'x-forwarded-for',
      'x-real-ip'
    ];

    importantHeaders.forEach(header => {
      if (req.headers[header]) {
        headers[header] = req.headers[header] as string;
      }
    });

    // Add gateway headers
    headers['x-gateway'] = 'fanz-api-gateway';
    headers['x-gateway-version'] = this.config.version;
    headers['x-forwarded-for'] = req.ip || req.connection.remoteAddress || 'unknown';

    return headers;
  }

  private sendErrorResponse(res: Response, status: number, message: string) {
    res.status(status).json({
      error: message,
      gateway: 'fanz-api-gateway',
      timestamp: new Date().toISOString()
    });
  }

  // Gateway middleware factory
  createGatewayMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip non-API routes
      if (!req.path.startsWith('/api/')) {
        return next();
      }

      try {
        await this.forwardRequest(req, res);
      } catch (error) {
        console.error('Gateway middleware error:', error);
        this.sendErrorResponse(res, 500, 'Gateway error');
      }
    };
  }

  // Service management
  getServices(): ServiceRegistry[] {
    return Array.from(this.services.values());
  }

  getServiceHealth(serviceId?: string): any {
    if (serviceId) {
      const service = this.services.get(serviceId);
      if (!service) return null;
      
      return {
        service,
        loadBalancer: this.loadBalancer.getServiceHealth(serviceId),
        circuitBreaker: this.circuitBreaker.getCircuitStatus(serviceId)
      };
    }

    // Return all services health
    const health: any = {
      services: {},
      gateway: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date()
      }
    };

    this.services.forEach((service, id) => {
      health.services[id] = {
        service,
        loadBalancer: this.loadBalancer.getServiceHealth(id),
        circuitBreaker: this.circuitBreaker.getCircuitStatus(id)
      };
    });

    return health;
  }

  getMetrics(): GatewayMetrics {
    return {
      services: {
        total: this.services.size,
        healthy: Array.from(this.services.values()).filter(s => s.status === 'healthy').length,
        unhealthy: Array.from(this.services.values()).filter(s => s.status === 'unhealthy').length
      },
      rateLimiter: {
        enabled: this.config.rateLimiting.enabled,
        activeWindows: this.rateLimiter['limits'].size
      },
      circuitBreaker: {
        enabled: this.config.circuitBreaker.enabled,
        circuits: this.circuitBreaker.getAllCircuitStatus()
      },
      cache: this.cache.getStats(),
      timestamp: new Date()
    };
  }
}

interface GatewayMetrics {
  services: {
    total: number;
    healthy: number;
    unhealthy: number;
  };
  rateLimiter: {
    enabled: boolean;
    activeWindows: number;
  };
  circuitBreaker: {
    enabled: boolean;
    circuits: Record<string, CircuitState>;
  };
  cache: CacheStats;
  timestamp: Date;
}

// Export validation schemas
export const GatewayConfigSchema = z.object({
  serviceName: z.string().default('fanz-api-gateway'),
  version: z.string().default('1.0.0'),
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  rateLimiting: z.object({
    enabled: z.boolean().default(true),
    windowMs: z.number().default(60000),
    maxRequests: z.number().default(100),
    skipSuccessfulRequests: z.boolean().default(false),
    skipFailedRequests: z.boolean().default(false),
    keyGenerator: z.enum(['ip', 'user', 'api_key']).default('ip'),
    store: z.enum(['memory', 'redis']).default('memory')
  }),
  authentication: z.object({
    enabled: z.boolean().default(true),
    methods: z.array(z.enum(['jwt', 'api_key', 'oauth2'])).default(['jwt']),
    jwtSecret: z.string().default('your-secret-key'),
    apiKeyHeader: z.string().default('x-api-key'),
    skipRoutes: z.array(z.string()).default(['/health', '/metrics']),
    requireRoles: z.boolean().default(false)
  }),
  loadBalancing: z.object({
    enabled: z.boolean().default(true),
    algorithm: z.enum(['round_robin', 'weighted', 'least_connections', 'ip_hash']).default('round_robin'),
    healthCheck: z.object({
      enabled: z.boolean().default(true),
      endpoint: z.string().default('/health'),
      interval: z.number().default(30),
      timeout: z.number().default(5),
      unhealthyThreshold: z.number().default(3),
      healthyThreshold: z.number().default(2)
    })
  }),
  circuitBreaker: z.object({
    enabled: z.boolean().default(true),
    failureThreshold: z.number().default(5),
    resetTimeout: z.number().default(60000),
    monitoringPeriod: z.number().default(30000)
  }),
  logging: z.object({
    enabled: z.boolean().default(true),
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    includeRequestBody: z.boolean().default(false),
    includeResponseBody: z.boolean().default(false),
    sanitizeHeaders: z.array(z.string()).default(['authorization', 'x-api-key'])
  }),
  caching: z.object({
    enabled: z.boolean().default(true),
    defaultTTL: z.number().default(300),
    maxSize: z.number().default(100),
    cacheableStatusCodes: z.array(z.number()).default([200, 300, 301, 404]),
    cacheableMethods: z.array(z.string()).default(['GET', 'HEAD'])
  }),
  monitoring: z.object({
    enabled: z.boolean().default(true),
    metricsEndpoint: z.string().default('/metrics'),
    tracingEnabled: z.boolean().default(false),
    healthCheckEndpoint: z.string().default('/health')
  })
});

export type GatewayConfigInput = z.infer<typeof GatewayConfigSchema>;

// Create and export a default instance with default config
const defaultGatewayConfig = GatewayConfigSchema.parse({
  rateLimiting: {},
  authentication: {},
  loadBalancing: { healthCheck: {} },
  circuitBreaker: {},
  logging: {},
  caching: {},
  monitoring: {}
});
const apiGatewayService = new APIGatewayService(defaultGatewayConfig);
export default apiGatewayService;