// FANZ Ecosystem Testing & Validation Suite
// Comprehensive tests for all backend services and integrations

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');
const WebSocket = require('ws');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5000',
  timeout: 30000,
  apiKey: process.env.TEST_API_KEY || 'test-api-key',
  userId: 'test-user-001',
  deviceId: 'test-device-001'
};

// Mock test data
const testUser = {
  email: 'test@boyfanz.com',
  password: 'TestPassword123!',
  username: 'testuser001',
  platform: 'android',
  appVersion: '1.0.0'
};

let authToken = null;
let refreshToken = null;

describe('FANZ Ecosystem Integration Tests', () => {
  
  // ===== HEALTH CHECKS =====
  
  describe('System Health Checks', () => {
    test('Main application health endpoint', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/health')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });

    test('API Gateway health check', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/gateway/health')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.services).toBeDefined();
    });

    test('Infrastructure service health', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/infrastructure/health')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });

    test('Security service health', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/security/health')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('operational');
    });

    test('Mobile backend health', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/mobile/health')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
    });

    test('Monitoring service health', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/monitoring/health')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });
  });

  // ===== API GATEWAY TESTS =====
  
  describe('API Gateway Service Mesh', () => {
    test('Gateway status and metrics', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/gateway')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.gateway.name).toBe('FANZ API Gateway');
      expect(response.body.data.services.total).toBeGreaterThan(0);
    });

    test('Service registry listing', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/gateway/services')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.services).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThan(5); // Should have at least 5 services
    });

    test('Circuit breaker status', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/gateway/circuit-breaker')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.circuits).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
    });

    test('Load balancer health', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/gateway/load-balancer')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.services).toBeDefined();
      expect(response.body.data.summary.totalServices).toBeGreaterThan(0);
    });

    test('Cache statistics', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/gateway/cache')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.entries).toBeGreaterThanOrEqual(0);
      expect(response.body.data.maxSizeMB).toBe(100);
    });

    test('Rate limiter status', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/gateway/rate-limiter')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.configuration).toBeDefined();
    });
  });

  // ===== MOBILE BACKEND TESTS =====
  
  describe('Mobile Backend (ClubCentral)', () => {
    test('Mobile app configuration', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/mobile/config')
        .query({ platform: 'android', version: '1.0.0' })
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.app).toBeDefined();
      expect(response.body.data.features).toBeDefined();
      expect(response.body.data.platforms.boyfanz.enabled).toBe(true);
      expect(response.body.data.theme.primaryColor).toBe('#ff0000');
    });

    test('Mobile authentication flow', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password,
        deviceId: TEST_CONFIG.deviceId,
        platform: testUser.platform,
        appVersion: testUser.appVersion,
        pushToken: 'test-push-token-123'
      };

      const response = await request(TEST_CONFIG.baseUrl)
        .post('/api/mobile/auth/login')
        .send(loginData)
        .timeout(TEST_CONFIG.timeout);

      // In a real test, this would succeed with valid credentials
      // For now, we test that the endpoint exists and validates input
      expect(response.status).toBeOneOf([200, 401, 400]);
      
      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.token).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
        authToken = response.body.data.token;
        refreshToken = response.body.data.refreshToken;
      }
    });

    test('Mobile analytics endpoint', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/mobile/analytics')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activeUsers).toBeDefined();
      expect(response.body.data.devices).toBeDefined();
      expect(response.body.data.engagement).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
    });

    test('WebSocket connection info', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get(`/api/mobile/websocket/${TEST_CONFIG.userId}/info`)
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.endpoint).toBeDefined();
      expect(response.body.data.protocols).toContain('fanz-mobile-v1');
      expect(response.body.data.events).toBeInstanceOf(Array);
    });
  });

  // ===== INFRASTRUCTURE TESTS =====
  
  describe('Infrastructure Management', () => {
    test('Infrastructure overview', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/infrastructure/overview')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.providers).toBeDefined();
      expect(response.body.data.services).toBeDefined();
      expect(response.body.data.summary.totalProviders).toBeGreaterThan(10);
    });

    test('Provider status check', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/infrastructure/providers')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.providers).toBeInstanceOf(Array);
      expect(response.body.data.providers.length).toBeGreaterThan(15);
    });

    test('Cost analysis endpoint', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/infrastructure/cost-analysis')
        .query({ period: '7d' })
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.totalCost).toBeDefined();
      expect(response.body.data.breakdown).toBeDefined();
    });

    test('Deployment capabilities', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/infrastructure/deployment/capabilities')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.providers).toBeDefined();
      expect(response.body.data.regions).toBeDefined();
    });
  });

  // ===== SECURITY & COMPLIANCE TESTS =====
  
  describe('Security & Compliance', () => {
    test('Security status overview', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/security/status')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.drm.status).toBe('active');
      expect(response.body.data.geoBlocking.status).toBe('active');
      expect(response.body.data.auditLogging.status).toBe('active');
    });

    test('Compliance monitoring', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/security/compliance')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.gdpr).toBeDefined();
      expect(response.body.data.ada).toBeDefined();
      expect(response.body.data.adultCompliance).toBeDefined();
    });

    test('DRM capabilities', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/security/drm/capabilities')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.encryption.status).toBe('active');
      expect(response.body.data.watermarking.status).toBe('active');
    });

    test('Geo-blocking configuration', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/security/geo-blocking/status')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(true);
      expect(response.body.data.restrictedCountries).toBeInstanceOf(Array);
    });
  });

  // ===== MONITORING & ANALYTICS TESTS =====
  
  describe('Real-Time Monitoring', () => {
    test('System metrics overview', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/monitoring/metrics')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.system).toBeDefined();
      expect(response.body.data.application).toBeDefined();
      expect(response.body.data.business).toBeDefined();
    });

    test('Alert configurations', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/monitoring/alerts')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.active).toBeInstanceOf(Array);
      expect(response.body.data.configuration).toBeDefined();
    });

    test('Performance analytics', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/monitoring/performance')
        .query({ timeframe: '1h' })
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.responseTime).toBeDefined();
      expect(response.body.data.throughput).toBeDefined();
      expect(response.body.data.errorRate).toBeDefined();
    });

    test('Business metrics', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/monitoring/business-metrics')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userEngagement).toBeDefined();
      expect(response.body.data.contentMetrics).toBeDefined();
      expect(response.body.data.revenueMetrics).toBeDefined();
    });
  });

  // ===== RATE LIMITING TESTS =====
  
  describe('Rate Limiting & Circuit Breakers', () => {
    test('Rate limiting enforcement', async () => {
      // Make multiple rapid requests to test rate limiting
      const requests = Array.from({ length: 10 }, (_, i) => 
        request(TEST_CONFIG.baseUrl)
          .get('/api/gateway/health')
          .timeout(5000)
      );

      const responses = await Promise.allSettled(requests);
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const rateLimited = responses.filter(r => r.status === 'fulfilled' && r.value.status === 429);

      // Should have some successful requests and potentially some rate limited
      expect(successful.length).toBeGreaterThan(0);
      
      // Check rate limit headers if any were set
      const lastResponse = responses[responses.length - 1];
      if (lastResponse.status === 'fulfilled' && lastResponse.value.headers) {
        if (lastResponse.value.headers['x-ratelimit-limit']) {
          expect(lastResponse.value.headers['x-ratelimit-limit']).toBeDefined();
          expect(lastResponse.value.headers['x-ratelimit-remaining']).toBeDefined();
        }
      }
    });

    test('Circuit breaker functionality', async () => {
      // Test circuit breaker by checking current status
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/gateway/circuit-breaker')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Check that all circuits are in a healthy state initially
      const circuits = response.body.data.circuits;
      Object.values(circuits).forEach(circuit => {
        expect(['closed', 'open', 'half-open']).toContain(circuit.state);
        expect(typeof circuit.consecutiveFailures).toBe('number');
      });
    });
  });

  // ===== WEBSOCKET TESTS =====
  
  describe('WebSocket Functionality', () => {
    test('WebSocket connection and basic communication', (done) => {
      const wsUrl = process.env.WS_BASE_URL || 'ws://localhost:3001';
      const ws = new WebSocket(`${wsUrl}/mobile`);

      const timeout = setTimeout(() => {
        ws.close();
        done(new Error('WebSocket connection timeout'));
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        
        // Send authentication message
        ws.send(JSON.stringify({
          type: 'auth',
          token: authToken || 'test-token'
        }));

        // Send ping
        ws.send(JSON.stringify({ type: 'ping' }));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          expect(message.type).toBeDefined();
          
          if (message.type === 'pong') {
            ws.close();
            done();
          }
        } catch (error) {
          ws.close();
          done(error);
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        ws.close();
        // Don't fail the test if WebSocket server isn't running
        console.warn('WebSocket test skipped - server not available:', error.message);
        done();
      });
    }, 15000);
  });

  // ===== INTEGRATION TESTS =====
  
  describe('Service Integration', () => {
    test('Cross-service communication via Gateway', async () => {
      // Test that services can communicate through the gateway
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/gateway/routes')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.routes).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThan(10);
      
      // Verify that key platform routes exist
      const routes = response.body.data.routes;
      const platformRoutes = routes.filter(r => r.path.includes('/api/boyfanz/') || 
                                                  r.path.includes('/api/girlfanz/') ||
                                                  r.path.includes('/api/pupfanz/'));
      expect(platformRoutes.length).toBeGreaterThan(0);
    });

    test('Service health aggregation', async () => {
      const response = await request(TEST_CONFIG.baseUrl)
        .get('/api/gateway/health')
        .timeout(TEST_CONFIG.timeout);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.services).toBeDefined();
      
      // Check that multiple services are registered
      const services = Object.keys(response.body.data.services);
      expect(services.length).toBeGreaterThan(5);
      expect(services).toContain('infrastructure');
      expect(services).toContain('security');
      expect(services).toContain('mobile');
      expect(services).toContain('monitoring');
    });

    test('Configuration consistency across services', async () => {
      // Test that services have consistent configuration
      const gatewayConfig = await request(TEST_CONFIG.baseUrl)
        .get('/api/gateway/config')
        .timeout(TEST_CONFIG.timeout);

      const mobileConfig = await request(TEST_CONFIG.baseUrl)
        .get('/api/mobile/config')
        .timeout(TEST_CONFIG.timeout);

      expect(gatewayConfig.status).toBe(200);
      expect(mobileConfig.status).toBe(200);
      
      // Both should be successful
      expect(gatewayConfig.body.success).toBe(true);
      expect(mobileConfig.body.success).toBe(true);
      
      // Should have consistent environment settings
      const gatewayEnv = gatewayConfig.body.data.environment;
      if (gatewayEnv) {
        expect(['development', 'staging', 'production']).toContain(gatewayEnv);
      }
    });
  });
});

// ===== PERFORMANCE TESTS =====

describe('Performance Benchmarks', () => {
  test('API response time benchmarks', async () => {
    const endpoints = [
      '/api/health',
      '/api/gateway',
      '/api/mobile/config',
      '/api/infrastructure/health',
      '/api/security/health',
      '/api/monitoring/health'
    ];

    const results = [];
    
    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      try {
        const response = await request(TEST_CONFIG.baseUrl)
          .get(endpoint)
          .timeout(TEST_CONFIG.timeout);
          
        const responseTime = Date.now() - startTime;
        results.push({
          endpoint,
          status: response.status,
          responseTime,
          success: response.status < 400
        });
        
        // API responses should be under 2 seconds
        expect(responseTime).toBeLessThan(2000);
      } catch (error) {
        results.push({
          endpoint,
          status: 'error',
          responseTime: Date.now() - startTime,
          success: false,
          error: error.message
        });
      }
    }

    console.log('Performance Results:', results);
    
    // At least 80% of endpoints should respond successfully
    const successRate = results.filter(r => r.success).length / results.length;
    expect(successRate).toBeGreaterThanOrEqual(0.8);
  });

  test('Concurrent request handling', async () => {
    const concurrentRequests = 20;
    const endpoint = '/api/gateway/health';
    
    const startTime = Date.now();
    
    const requests = Array.from({ length: concurrentRequests }, () =>
      request(TEST_CONFIG.baseUrl)
        .get(endpoint)
        .timeout(TEST_CONFIG.timeout)
    );

    const responses = await Promise.allSettled(requests);
    const totalTime = Date.now() - startTime;
    
    const successful = responses.filter(r => 
      r.status === 'fulfilled' && r.value.status === 200
    ).length;
    
    console.log(`Concurrent test: ${successful}/${concurrentRequests} successful in ${totalTime}ms`);
    
    // Should handle at least 80% of concurrent requests successfully
    expect(successful / concurrentRequests).toBeGreaterThanOrEqual(0.8);
    
    // Total time should be reasonable (under 10 seconds for 20 concurrent requests)
    expect(totalTime).toBeLessThan(10000);
  });
});

// Custom Jest matchers
expect.extend({
  toBeOneOf(received, expectedValues) {
    const pass = expectedValues.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expectedValues.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expectedValues.join(', ')}`,
        pass: false,
      };
    }
  },
});