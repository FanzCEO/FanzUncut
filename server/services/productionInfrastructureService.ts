// Production Infrastructure API Service
// Real provider integrations with monitoring, alerting, and FanzDash integration

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { 
  ProviderConfig, 
  PRODUCTION_PROVIDERS, 
  getProviderConfig,
  PROVIDER_CATEGORIES,
  COMPLIANCE_REQUIREMENTS 
} from '../../shared/infraConfig.js';

// Enhanced infrastructure monitoring and alerting
export class InfrastructureMonitor extends EventEmitter {
  private healthChecks: Map<string, NodeJS.Timeout> = new Map();
  private alertThresholds = {
    responseTime: 5000, // 5 seconds
    errorRate: 0.05, // 5%
    cpuUsage: 80, // 80%
    memoryUsage: 85, // 85%
    diskUsage: 90 // 90%
  };

  startMonitoring(providerIds: string[]) {
    providerIds.forEach(providerId => {
      const interval = setInterval(async () => {
        await this.checkProviderHealth(providerId);
      }, 60000); // Check every minute
      
      this.healthChecks.set(providerId, interval);
    });
  }

  stopMonitoring(providerId?: string) {
    if (providerId) {
      const interval = this.healthChecks.get(providerId);
      if (interval) {
        clearInterval(interval);
        this.healthChecks.delete(providerId);
      }
    } else {
      // Stop all monitoring
      this.healthChecks.forEach((interval) => clearInterval(interval));
      this.healthChecks.clear();
    }
  }

  private async checkProviderHealth(providerId: string) {
    try {
      const config = PRODUCTION_PROVIDERS[providerId];
      if (!config) return;

      const startTime = Date.now();
      const response = await axios.get(`${config.apiEndpoint}/healthcheck`, {
        timeout: 10000,
        headers: this.getAuthHeaders(config)
      });
      const responseTime = Date.now() - startTime;

      const healthStatus = {
        providerId,
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        responseTime,
        timestamp: new Date(),
        details: response.data
      };

      this.emit('healthCheck', healthStatus);

      // Alert on thresholds
      if (responseTime > this.alertThresholds.responseTime) {
        this.emit('alert', {
          type: 'HIGH_RESPONSE_TIME',
          providerId,
          value: responseTime,
          threshold: this.alertThresholds.responseTime
        });
      }

    } catch (error) {
      this.emit('alert', {
        type: 'PROVIDER_DOWN',
        providerId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private getAuthHeaders(config: ProviderConfig): Record<string, string> {
    const apiKey = process.env[`${config.id.toUpperCase()}_API_KEY`];
    
    switch (config.authMethod) {
      case 'api_key':
        return { 'X-API-Key': apiKey || '' };
      case 'bearer_token':
        return { 'Authorization': `Bearer ${apiKey}` };
      case 'oauth2':
        return { 'Authorization': `Bearer ${apiKey}` };
      default:
        return {};
    }
  }
}

// Production Infrastructure Management Service
export class ProductionInfrastructureService {
  private apiClients: Map<string, AxiosInstance> = new Map();
  private monitor: InfrastructureMonitor;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.monitor = new InfrastructureMonitor();
    this.initializeApiClients();
    this.setupMonitoring();
  }

  private initializeApiClients() {
    Object.values(PRODUCTION_PROVIDERS).forEach(config => {
      const client = axios.create({
        baseURL: config.apiEndpoint,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FanzInfrastructure/1.0',
          ...this.getAuthHeaders(config)
        }
      });

      // Request interceptor for rate limiting
      client.interceptors.request.use((requestConfig) => {
        return this.rateLimitRequest(config.id, requestConfig);
      });

      // Response interceptor for error handling and caching
      client.interceptors.response.use(
        (response) => {
          // Cache successful responses
          const cacheKey = `${config.id}:${response.config.url}`;
          this.cache.set(cacheKey, {
            data: response.data,
            timestamp: Date.now()
          });
          return response;
        },
        (error) => {
          this.monitor.emit('apiError', {
            providerId: config.id,
            endpoint: error.config?.url,
            status: error.response?.status,
            message: error.message
          });
          return Promise.reject(error);
        }
      );

      this.apiClients.set(config.id, client);
    });
  }

  private setupMonitoring() {
    // DISABLED: Start monitoring all providers - was causing fake alert spam
    // const providerIds = Object.keys(PRODUCTION_PROVIDERS);
    // this.monitor.startMonitoring(providerIds);

    // Set up alert handling
    this.monitor.on('alert', (alert) => {
      this.handleAlert(alert);
    });

    this.monitor.on('healthCheck', (health) => {
      this.updateHealthMetrics(health);
    });
  }

  private async rateLimitRequest(providerId: string, config: AxiosRequestConfig) {
    const provider = PRODUCTION_PROVIDERS[providerId];
    if (!provider) return config;

    // Implement rate limiting logic
    const rateLimitKey = `rateLimit:${providerId}`;
    // This would integrate with Redis in production
    
    return config;
  }

  private getAuthHeaders(config: ProviderConfig): Record<string, string> {
    const apiKey = process.env[`${config.id.toUpperCase()}_API_KEY`];
    
    switch (config.authMethod) {
      case 'api_key':
        return { 'X-API-Key': apiKey || '' };
      case 'bearer_token':
        return { 'Authorization': `Bearer ${apiKey}` };
      case 'oauth2':
        return { 'Authorization': `Bearer ${apiKey}` };
      default:
        return {};
    }
  }

  // Provider-specific API methods

  // DigitalOcean Operations
  async createDigitalOceanDroplet(specs: {
    name: string;
    region: string;
    size: string;
    image: string;
    vpc_uuid?: string;
    ssh_keys?: string[];
    tags?: string[];
  }) {
    const client = this.apiClients.get('digitalocean');
    if (!client) throw new Error('DigitalOcean client not initialized');

    const response = await client.post('/droplets', specs);
    return response.data;
  }

  async listDigitalOceanDroplets() {
    const client = this.apiClients.get('digitalocean');
    if (!client) throw new Error('DigitalOcean client not initialized');

    const response = await client.get('/droplets');
    return response.data;
  }

  async deleteDigitalOceanDroplet(dropletId: string) {
    const client = this.apiClients.get('digitalocean');
    if (!client) throw new Error('DigitalOcean client not initialized');

    await client.delete(`/droplets/${dropletId}`);
  }

  // Linode Operations
  async createLinodeInstance(specs: {
    type: string;
    region: string;
    image: string;
    root_pass?: string;
    authorized_keys?: string[];
    tags?: string[];
  }) {
    const client = this.apiClients.get('linode');
    if (!client) throw new Error('Linode client not initialized');

    const response = await client.post('/linode/instances', specs);
    return response.data;
  }

  async listLinodeInstances() {
    const client = this.apiClients.get('linode');
    if (!client) throw new Error('Linode client not initialized');

    const response = await client.get('/linode/instances');
    return response.data;
  }

  // Vultr Operations
  async createVultrInstance(specs: {
    region: string;
    plan: string;
    os_id: number;
    label?: string;
    ssh_key_id?: string[];
    tag?: string;
  }) {
    const client = this.apiClients.get('vultr');
    if (!client) throw new Error('Vultr client not initialized');

    const response = await client.post('/instances', specs);
    return response.data;
  }

  async listVultrInstances() {
    const client = this.apiClients.get('vultr');
    if (!client) throw new Error('Vultr client not initialized');

    const response = await client.get('/instances');
    return response.data;
  }

  // Cloudflare Operations
  async createCloudflareZone(domain: string) {
    const client = this.apiClients.get('cloudflare');
    if (!client) throw new Error('Cloudflare client not initialized');

    const response = await client.post('/zones', {
      name: domain,
      account: { id: process.env.CLOUDFLARE_ACCOUNT_ID }
    });
    return response.data;
  }

  async listCloudflareZones() {
    const client = this.apiClients.get('cloudflare');
    if (!client) throw new Error('Cloudflare client not initialized');

    const response = await client.get('/zones');
    return response.data;
  }

  // Bunny CDN Operations
  async createBunnyCDNPullZone(specs: {
    Name: string;
    OriginUrl: string;
    Type?: number;
    StorageZoneId?: number;
  }) {
    const client = this.apiClients.get('bunnycdn');
    if (!client) throw new Error('Bunny CDN client not initialized');

    const response = await client.post('/pullzone', specs);
    return response.data;
  }

  async listBunnyCDNPullZones() {
    const client = this.apiClients.get('bunnycdn');
    if (!client) throw new Error('Bunny CDN client not initialized');

    const response = await client.get('/pullzone');
    return response.data;
  }

  // Backblaze B2 Operations
  async createBackblazeB2Bucket(specs: {
    accountId: string;
    bucketName: string;
    bucketType: 'allPublic' | 'allPrivate';
  }) {
    const client = this.apiClients.get('backblaze');
    if (!client) throw new Error('Backblaze client not initialized');

    const response = await client.post('/b2api/v2/b2_create_bucket', specs);
    return response.data;
  }

  async listBackblazeB2Buckets() {
    const client = this.apiClients.get('backblaze');
    if (!client) throw new Error('Backblaze client not initialized');

    const response = await client.post('/b2api/v2/b2_list_buckets', {
      accountId: process.env.BACKBLAZE_ACCOUNT_ID
    });
    return response.data;
  }

  // Multi-Provider Operations
  async deployPlatformToProvider(
    platformId: string, 
    providerId: string, 
    specs: {
      region: string;
      size: string;
      environment: 'development' | 'staging' | 'production';
      customConfig?: Record<string, any>;
    }
  ) {
    const config = getProviderConfig(providerId, specs.environment);
    if (!config) throw new Error(`Provider ${providerId} not found`);

    // Platform-specific deployment logic
    switch (providerId) {
      case 'digitalocean':
        return await this.createDigitalOceanDroplet({
          name: `${platformId}-${specs.environment}`,
          region: specs.region,
          size: specs.size,
          image: 'docker-20-04',
          tags: [platformId, specs.environment, 'fanz']
        });

      case 'linode':
        return await this.createLinodeInstance({
          type: specs.size,
          region: specs.region,
          image: 'linode/ubuntu20.04',
          tags: [platformId, specs.environment, 'fanz']
        });

      case 'vultr':
        return await this.createVultrInstance({
          region: specs.region,
          plan: specs.size,
          os_id: 387, // Ubuntu 20.04
          label: `${platformId}-${specs.environment}`,
          tag: `${platformId},${specs.environment},fanz`
        });

      default:
        throw new Error(`Deployment not implemented for provider ${providerId}`);
    }
  }

  async getProviderCosts(providerId: string, timeRange: '24h' | '7d' | '30d' = '30d') {
    const cacheKey = `costs:${providerId}:${timeRange}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Fetch cost data from provider APIs
    // Implementation would vary per provider
    const costs = await this.fetchProviderCosts(providerId, timeRange);
    
    this.cache.set(cacheKey, {
      data: costs,
      timestamp: Date.now()
    });

    return costs;
  }

  private async fetchProviderCosts(providerId: string, timeRange: string) {
    // Provider-specific cost fetching logic
    switch (providerId) {
      case 'digitalocean':
        // Fetch from DO billing API
        const client = this.apiClients.get('digitalocean');
        if (client) {
          const response = await client.get('/customers/my/billing_history');
          return this.processDOCosts(response.data, timeRange);
        }
        break;

      case 'linode':
        // Fetch from Linode account API
        break;

      default:
        return { total: 0, breakdown: [] };
    }
  }

  private processDOCosts(billingData: any, timeRange: string) {
    // Process DigitalOcean billing data
    return {
      total: billingData.billing_history?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0,
      breakdown: billingData.billing_history || []
    };
  }

  private async handleAlert(alert: any) {
    console.error('Infrastructure Alert:', alert);
    
    // Send to FanzDash monitoring
    await this.sendToFanzDash('alert', alert);
    
    // Implement alerting logic (Slack, Discord, email, etc.)
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackAlert(alert);
    }
  }

  private async updateHealthMetrics(health: any) {
    // Update health metrics in database or cache
    await this.sendToFanzDash('health', health);
  }

  private async sendToFanzDash(type: 'alert' | 'health', data: any) {
    try {
      // Send data to FanzDash API
      const fanzDashUrl = process.env.FANZDASH_API_URL;
      if (fanzDashUrl) {
        await axios.post(`${fanzDashUrl}/infrastructure/${type}`, data, {
          headers: {
            'Authorization': `Bearer ${process.env.FANZDASH_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Failed to send data to FanzDash:', error);
    }
  }

  private async sendSlackAlert(alert: any) {
    try {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) return;

      const message = {
        text: `🚨 Infrastructure Alert: ${alert.type}`,
        attachments: [
          {
            color: 'danger',
            fields: [
              {
                title: 'Provider',
                value: alert.providerId,
                short: true
              },
              {
                title: 'Type',
                value: alert.type,
                short: true
              },
              {
                title: 'Details',
                value: JSON.stringify(alert, null, 2),
                short: false
              }
            ],
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      await axios.post(webhookUrl, message);
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  // Cleanup
  async shutdown() {
    this.monitor.stopMonitoring();
    this.cache.clear();
  }

  // Provider status and health checks
  async getProviderStatus(providerId: string) {
    const config = PRODUCTION_PROVIDERS[providerId];
    if (!config) throw new Error(`Provider ${providerId} not found`);

    try {
      const client = this.apiClients.get(providerId);
      if (!client) throw new Error(`Client for ${providerId} not initialized`);

      const startTime = Date.now();
      const response = await client.get('/');
      const responseTime = Date.now() - startTime;

      return {
        providerId,
        status: 'healthy',
        responseTime,
        lastCheck: new Date(),
        features: config.features,
        regions: config.regions
      };
    } catch (error) {
      return {
        providerId,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date()
      };
    }
  }

  async getAllProviderStatus() {
    const statuses = await Promise.all(
      Object.keys(PRODUCTION_PROVIDERS).map(id => this.getProviderStatus(id))
    );
    
    return statuses;
  }
}

// Export singleton instance
export const infrastructureService = new ProductionInfrastructureService();

// Validation schemas for API requests
export const DeploymentSpecSchema = z.object({
  platformId: z.string(),
  providerId: z.string(),
  region: z.string(),
  size: z.string(),
  environment: z.enum(['development', 'staging', 'production']),
  customConfig: z.record(z.any()).optional()
});

export const CostQuerySchema = z.object({
  providerId: z.string(),
  timeRange: z.enum(['24h', '7d', '30d']).default('30d')
});

export type DeploymentSpec = z.infer<typeof DeploymentSpecSchema>;
export type CostQuery = z.infer<typeof CostQuerySchema>;