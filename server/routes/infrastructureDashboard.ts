// Enhanced Infrastructure Dashboard API Routes
// Production-ready infrastructure management with real provider integrations

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  infrastructureService,
  DeploymentSpecSchema,
  CostQuerySchema,
  DeploymentSpec,
  CostQuery
} from '../services/productionInfrastructureService.js';
import {
  PRODUCTION_PROVIDERS,
  getProviderConfig,
  PROVIDER_CATEGORIES,
  COMPLIANCE_REQUIREMENTS
} from '../../shared/infraConfig.js';
import { isAuthenticated, requireAdmin } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

const router = Router();

// Apply admin authentication to all infrastructure routes
router.use(requireAdmin);

// Schema for infrastructure queries
const InfraQuerySchema = z.object({
  provider: z.string().optional(),
  type: z.enum(['hosting', 'cdn', 'storage', 'streaming']).optional(),
  region: z.string().optional(),
  environment: z.enum(['development', 'staging', 'production']).optional()
});

const PlatformDeploymentSchema = z.object({
  platforms: z.array(z.string()),
  providers: z.array(z.string()),
  regions: z.array(z.string()),
  environment: z.enum(['development', 'staging', 'production']),
  autoScale: z.boolean().default(false),
  loadBalancing: z.boolean().default(true)
});

// GET /api/infrastructure/overview
// Comprehensive infrastructure ecosystem overview
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const query = InfraQuerySchema.parse(req.query);
    
    // Get all provider statuses
    const providerStatuses = await infrastructureService.getAllProviderStatus();
    
    // Get provider configurations
    const providers = Object.values(PRODUCTION_PROVIDERS)
      .filter(p => !query.type || p.type === query.type)
      .map(provider => ({
        ...provider,
        status: providerStatuses.find(s => s.providerId === provider.id)?.status || 'unknown',
        responseTime: providerStatuses.find(s => s.providerId === provider.id)?.responseTime
      }));

    // Calculate ecosystem metrics
    const metrics = {
      totalProviders: providers.length,
      healthyProviders: providers.filter(p => p.status === 'healthy').length,
      unhealthyProviders: providers.filter(p => p.status === 'unhealthy').length,
      averageResponseTime: providers
        .filter(p => p.responseTime)
        .reduce((sum, p) => sum + (p.responseTime || 0), 0) / providers.filter(p => p.responseTime).length || 0,
      complianceScore: calculateComplianceScore(providers),
      costEstimate: await calculateEcosystemCosts(providers)
    };

    const overview = {
      metrics,
      providers,
      categories: PROVIDER_CATEGORIES,
      compliance: COMPLIANCE_REQUIREMENTS,
      recommendations: await generateInfrastructureRecommendations(providers)
    };

    res.json(overview);
  } catch (error) {
    console.error('Infrastructure overview error:', error);
    res.status(500).json({ 
      error: 'Failed to load infrastructure overview',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/infrastructure/providers
// List all available providers with real-time status
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const query = InfraQuerySchema.parse(req.query);
    
    let providers = Object.values(PRODUCTION_PROVIDERS);
    
    // Apply filters
    if (query.type) {
      providers = providers.filter(p => p.type === query.type);
    }
    
    // Get real-time status for each provider
    const providersWithStatus = await Promise.all(
      providers.map(async (provider) => {
        const status = await infrastructureService.getProviderStatus(provider.id);
        return {
          ...provider,
          ...status,
          config: getProviderConfig(provider.id, query.environment || 'production')
        };
      })
    );

    res.json({
      providers: providersWithStatus,
      categories: PROVIDER_CATEGORIES,
      total: providersWithStatus.length
    });
  } catch (error) {
    console.error('Provider listing error:', error);
    res.status(500).json({ 
      error: 'Failed to load providers',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/infrastructure/provider/:id/status
// Get detailed status for a specific provider
router.get('/provider/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = await infrastructureService.getProviderStatus(id);
    
    // Get additional provider details
    const config = PRODUCTION_PROVIDERS[id];
    if (!config) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Get cost information if available
    let costs = null;
    try {
      costs = await infrastructureService.getProviderCosts(id, '30d');
    } catch (costError) {
      console.warn(`Failed to get costs for ${id}:`, costError);
    }

    res.json({
      ...status,
      config,
      costs,
      recommendations: generateProviderRecommendations(config, status)
    });
  } catch (error) {
    console.error('Provider status error:', error);
    res.status(500).json({ 
      error: 'Failed to get provider status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/infrastructure/deploy
// Deploy platform to specific provider
router.post('/deploy', validateRequest(DeploymentSpecSchema), async (req: Request, res: Response) => {
  try {
    const spec: DeploymentSpec = req.body;
    
    // Validate deployment specification
    const config = getProviderConfig(spec.providerId, spec.environment);
    if (!config) {
      return res.status(400).json({ error: 'Invalid provider configuration' });
    }

    // Check if provider supports the requested region
    if (!config.regions.includes(spec.region)) {
      return res.status(400).json({ 
        error: 'Region not supported by provider',
        supportedRegions: config.regions
      });
    }

    // Execute deployment
    const deployment = await infrastructureService.deployPlatformToProvider(
      spec.platformId,
      spec.providerId,
      {
        region: spec.region,
        size: spec.size,
        environment: spec.environment,
        customConfig: spec.customConfig
      }
    );

    res.json({
      success: true,
      deployment,
      provider: config.name,
      estimated_cost: calculateDeploymentCost(config, spec),
      next_steps: generateNextSteps(spec)
    });

  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({ 
      error: 'Deployment failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/infrastructure/bulk-deploy
// Deploy multiple platforms across multiple providers
router.post('/bulk-deploy', validateRequest(PlatformDeploymentSchema), async (req: Request, res: Response) => {
  try {
    const { platforms, providers, regions, environment, autoScale, loadBalancing } = req.body;
    
    const deployments = [];
    const errors = [];

    // Execute deployments in parallel with error handling
    for (const platform of platforms) {
      for (const provider of providers) {
        for (const region of regions) {
          try {
            const deployment = await infrastructureService.deployPlatformToProvider(
              platform,
              provider,
              {
                region,
                size: 's-2vcpu-2gb', // Default size, should be configurable
                environment,
                customConfig: {
                  autoScale,
                  loadBalancing,
                  platform,
                  bulk_deployment: true
                }
              }
            );

            deployments.push({
              platform,
              provider,
              region,
              status: 'success',
              deployment
            });

          } catch (deploymentError) {
            errors.push({
              platform,
              provider,
              region,
              error: deploymentError instanceof Error ? deploymentError.message : 'Unknown error'
            });
          }
        }
      }
    }

    res.json({
      success: deployments.length > 0,
      deployments,
      errors,
      summary: {
        successful: deployments.length,
        failed: errors.length,
        total: platforms.length * providers.length * regions.length
      }
    });

  } catch (error) {
    console.error('Bulk deployment error:', error);
    res.status(500).json({ 
      error: 'Bulk deployment failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/infrastructure/costs
// Get cost analysis across all providers
router.get('/costs', async (req: Request, res: Response) => {
  try {
    const query = CostQuerySchema.parse(req.query);
    
    let providerCosts;
    
    if (query.providerId) {
      // Get costs for specific provider
      providerCosts = [{
        providerId: query.providerId,
        ...(await infrastructureService.getProviderCosts(query.providerId, query.timeRange))
      }];
    } else {
      // Get costs for all providers
      const providers = Object.keys(PRODUCTION_PROVIDERS);
      providerCosts = await Promise.all(
        providers.map(async (providerId) => {
          try {
            const costs = await infrastructureService.getProviderCosts(providerId, query.timeRange);
            return { providerId, ...costs };
          } catch (error) {
            return { providerId, total: 0, breakdown: [], error: 'Cost data unavailable' };
          }
        })
      );
    }

    const totalCost = providerCosts.reduce((sum, provider) => sum + provider.total, 0);
    const analysis = generateCostAnalysis(providerCosts, query.timeRange);

    res.json({
      costs: providerCosts,
      total: totalCost,
      timeRange: query.timeRange,
      analysis,
      optimization_suggestions: generateCostOptimizationSuggestions(providerCosts)
    });

  } catch (error) {
    console.error('Cost analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to get cost analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/infrastructure/monitoring
// Real-time monitoring dashboard data
router.get('/monitoring', async (req: Request, res: Response) => {
  try {
    const statuses = await infrastructureService.getAllProviderStatus();
    
    const monitoring = {
      timestamp: new Date(),
      providers: statuses,
      alerts: [], // Would come from monitoring system
      metrics: {
        total_providers: statuses.length,
        healthy_providers: statuses.filter(s => s.status === 'healthy').length,
        average_response_time: statuses
          .filter(s => s.responseTime)
          .reduce((sum, s) => sum + (s.responseTime || 0), 0) / statuses.filter(s => s.responseTime).length || 0,
        uptime_percentage: (statuses.filter(s => s.status === 'healthy').length / statuses.length) * 100
      },
      performance: await generatePerformanceMetrics(statuses)
    };

    res.json(monitoring);

  } catch (error) {
    console.error('Monitoring error:', error);
    res.status(500).json({ 
      error: 'Failed to load monitoring data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/infrastructure/migrate
// Migrate platform from one provider to another
router.post('/migrate', async (req: Request, res: Response) => {
  try {
    const { platformId, fromProvider, toProvider, region, environment, preserveData = true } = req.body;
    
    const fromConfig = getProviderConfig(fromProvider, environment);
    const toConfig = getProviderConfig(toProvider, environment);
    
    if (!fromConfig || !toConfig) {
      return res.status(400).json({ error: 'Invalid provider configuration' });
    }

    // Create migration plan
    const migrationPlan = {
      platform: platformId,
      source: { provider: fromProvider, config: fromConfig },
      destination: { provider: toProvider, config: toConfig },
      region,
      environment,
      preserveData,
      steps: generateMigrationSteps(fromConfig, toConfig, preserveData),
      estimatedDuration: estimateMigrationDuration(fromConfig, toConfig),
      risks: assessMigrationRisks(fromConfig, toConfig)
    };

    // Execute migration (simplified - would be more complex in production)
    // This would typically be a background job
    const result = {
      migrationId: `migration_${Date.now()}`,
      plan: migrationPlan,
      status: 'initiated',
      estimated_completion: new Date(Date.now() + migrationPlan.estimatedDuration * 60000)
    };

    res.json(result);

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/infrastructure/compliance
// Compliance status across all providers
router.get('/compliance', async (req: Request, res: Response) => {
  try {
    const providers = Object.values(PRODUCTION_PROVIDERS);
    const compliance = providers.map(provider => ({
      providerId: provider.id,
      name: provider.name,
      complianceLevel: provider.complianceLevel,
      adultFriendly: provider.adultFriendly,
      requirements: assessComplianceRequirements(provider),
      score: calculateProviderComplianceScore(provider),
      recommendations: generateComplianceRecommendations(provider)
    }));

    const overall = {
      totalProviders: providers.length,
      compliantProviders: providers.filter(p => p.adultFriendly).length,
      averageScore: compliance.reduce((sum, c) => sum + c.score, 0) / compliance.length,
      criticalIssues: compliance.filter(c => c.score < 70).length
    };

    res.json({
      compliance,
      overall,
      requirements: COMPLIANCE_REQUIREMENTS
    });

  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(500).json({ 
      error: 'Failed to check compliance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Utility functions
function calculateComplianceScore(providers: any[]): number {
  const compliantProviders = providers.filter(p => p.adultFriendly && p.complianceLevel !== 'basic');
  return (compliantProviders.length / providers.length) * 100;
}

async function calculateEcosystemCosts(providers: any[]): Promise<number> {
  // Simplified cost calculation
  return providers.reduce((sum, provider) => {
    const tier = provider.pricingTiers[0];
    return sum + (tier?.monthlyRate || 0);
  }, 0);
}

async function generateInfrastructureRecommendations(providers: any[]): Promise<string[]> {
  const recommendations = [];
  
  const unhealthyCount = providers.filter(p => p.status === 'unhealthy').length;
  if (unhealthyCount > 0) {
    recommendations.push(`${unhealthyCount} providers are currently unhealthy. Consider failover strategies.`);
  }

  const basicComplianceCount = providers.filter(p => p.complianceLevel === 'basic').length;
  if (basicComplianceCount > 0) {
    recommendations.push(`${basicComplianceCount} providers have basic compliance. Consider upgrading for adult content.`);
  }

  return recommendations;
}

function generateProviderRecommendations(config: any, status: any): string[] {
  const recommendations = [];
  
  if (status.status === 'unhealthy') {
    recommendations.push('Provider is currently unhealthy. Check service status.');
  }
  
  if (status.responseTime && status.responseTime > 2000) {
    recommendations.push('High response time detected. Consider using a different region.');
  }
  
  if (config.complianceLevel === 'basic') {
    recommendations.push('Basic compliance level. Upgrade for better adult content support.');
  }

  return recommendations;
}

function calculateDeploymentCost(config: any, spec: DeploymentSpec): number {
  const tier = config.pricingTiers.find((t: any) => t.name.toLowerCase().includes('basic')) || config.pricingTiers[0];
  return tier?.monthlyRate || 0;
}

function generateNextSteps(spec: DeploymentSpec): string[] {
  return [
    'Monitor deployment status',
    'Configure DNS settings',
    'Set up SSL certificates',
    'Configure monitoring and alerts',
    'Perform health checks'
  ];
}

function generateCostAnalysis(costs: any[], timeRange: string): any {
  const totalCost = costs.reduce((sum, c) => sum + c.total, 0);
  const avgCost = totalCost / costs.length;
  
  return {
    total: totalCost,
    average: avgCost,
    highest: Math.max(...costs.map(c => c.total)),
    lowest: Math.min(...costs.map(c => c.total)),
    trend: 'stable' // Would calculate from historical data
  };
}

function generateCostOptimizationSuggestions(costs: any[]): string[] {
  const suggestions = [];
  
  const highCostProviders = costs.filter(c => c.total > 100);
  if (highCostProviders.length > 0) {
    suggestions.push(`Consider optimizing high-cost providers: ${highCostProviders.map(c => c.providerId).join(', ')}`);
  }

  suggestions.push('Review resource utilization to identify unused resources');
  suggestions.push('Consider reserved instances for long-term deployments');
  
  return suggestions;
}

async function generatePerformanceMetrics(statuses: any[]): Promise<any> {
  return {
    response_times: statuses.map(s => ({
      provider: s.providerId,
      time: s.responseTime || 0
    })),
    availability: statuses.map(s => ({
      provider: s.providerId,
      status: s.status,
      uptime: s.status === 'healthy' ? 100 : 0
    }))
  };
}

function generateMigrationSteps(fromConfig: any, toConfig: any, preserveData: boolean): string[] {
  return [
    'Backup current deployment',
    'Create new deployment on target provider',
    preserveData ? 'Migrate data' : 'Skip data migration',
    'Update DNS records',
    'Test new deployment',
    'Switch traffic',
    'Monitor performance',
    'Cleanup old deployment'
  ];
}

function estimateMigrationDuration(fromConfig: any, toConfig: any): number {
  // Simplified estimation in minutes
  return 60; // 1 hour base time
}

function assessMigrationRisks(fromConfig: any, toConfig: any): string[] {
  return [
    'Potential downtime during DNS switch',
    'Data consistency risks',
    'Performance differences between providers',
    'Configuration compatibility issues'
  ];
}

function assessComplianceRequirements(provider: any): any {
  return {
    ada: provider.features.includes('accessibility_testing'),
    gdpr: provider.features.includes('data_encryption'),
    adult_content: provider.adultFriendly,
    security: provider.features.some((f: string) => ['ssl_certificates', 'ddos_protection', 'waf'].includes(f))
  };
}

function calculateProviderComplianceScore(provider: any): number {
  let score = 0;
  
  if (provider.adultFriendly) score += 40;
  if (provider.complianceLevel === 'premium') score += 30;
  else if (provider.complianceLevel === 'standard') score += 20;
  else score += 10;
  
  const securityFeatures = provider.features.filter((f: string) => 
    ['ssl_certificates', 'ddos_protection', 'waf', 'vulnerability_scanning'].includes(f)
  ).length;
  score += securityFeatures * 7.5;
  
  return Math.min(score, 100);
}

function generateComplianceRecommendations(provider: any): string[] {
  const recommendations = [];
  
  if (!provider.adultFriendly) {
    recommendations.push('Provider is not adult-content friendly. Consider switching.');
  }
  
  if (provider.complianceLevel === 'basic') {
    recommendations.push('Upgrade to higher compliance level for better support.');
  }
  
  const hasWAF = provider.features.includes('waf');
  if (!hasWAF) {
    recommendations.push('Enable Web Application Firewall for better security.');
  }
  
  return recommendations;
}

export default router;