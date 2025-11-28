// Infrastructure Provider API Configuration
// Production-ready configurations for all adult-friendly providers

export interface ProviderConfig {
  id: string;
  name: string;
  type: 'hosting' | 'cdn' | 'storage' | 'streaming';
  apiEndpoint: string;
  apiVersion: string;
  authMethod: 'api_key' | 'oauth2' | 'bearer_token';
  regions: string[];
  adultFriendly: boolean;
  complianceLevel: 'basic' | 'standard' | 'premium';
  features: string[];
  pricingTiers: PricingTier[];
  limits: ResourceLimits;
}

export interface PricingTier {
  name: string;
  hourlyRate: number;
  monthlyRate: number;
  bandwidth?: number;
  storage?: number;
  compute?: {
    cpu: number;
    ram: number;
    disk: number;
  };
}

export interface ResourceLimits {
  maxInstances?: number;
  maxBandwidth?: string;
  maxStorage?: string;
  maxConcurrentStreams?: number;
  rateLimits: {
    requests: number;
    period: 'minute' | 'hour' | 'day';
  };
}

// Production API Configurations
export const PRODUCTION_PROVIDERS: Record<string, ProviderConfig> = {
  digitalocean: {
    id: 'digitalocean',
    name: 'DigitalOcean',
    type: 'hosting',
    apiEndpoint: 'https://api.digitalocean.com/v2',
    apiVersion: 'v2',
    authMethod: 'bearer_token',
    regions: ['nyc1', 'nyc3', 'ams3', 'sfo3', 'sgp1', 'lon1', 'fra1', 'tor1', 'blr1'],
    adultFriendly: true,
    complianceLevel: 'standard',
    features: ['auto_scaling', 'load_balancer', 'kubernetes', 'block_storage', 'spaces_cdn'],
    pricingTiers: [
      {
        name: 'Basic',
        hourlyRate: 0.007,
        monthlyRate: 5,
        compute: { cpu: 1, ram: 1, disk: 25 }
      },
      {
        name: 'Professional',
        hourlyRate: 0.015,
        monthlyRate: 10,
        compute: { cpu: 1, ram: 2, disk: 50 }
      },
      {
        name: 'Performance',
        hourlyRate: 0.119,
        monthlyRate: 80,
        compute: { cpu: 8, ram: 16, disk: 160 }
      }
    ],
    limits: {
      maxInstances: 100,
      maxBandwidth: '10TB',
      rateLimits: { requests: 5000, period: 'hour' }
    }
  },

  linode: {
    id: 'linode',
    name: 'Linode (Akamai)',
    type: 'hosting',
    apiEndpoint: 'https://api.linode.com/v4',
    apiVersion: 'v4',
    authMethod: 'bearer_token',
    regions: ['us-east', 'us-central', 'us-west', 'eu-central', 'eu-west', 'ap-south', 'ap-northeast', 'ca-central'],
    adultFriendly: true,
    complianceLevel: 'premium',
    features: ['kubernetes', 'node_balancer', 'object_storage', 'managed_database', 'marketplace'],
    pricingTiers: [
      {
        name: 'Nanode',
        hourlyRate: 0.0075,
        monthlyRate: 5,
        compute: { cpu: 1, ram: 1, disk: 25 }
      },
      {
        name: 'Linode 4GB',
        hourlyRate: 0.03,
        monthlyRate: 20,
        compute: { cpu: 2, ram: 4, disk: 80 }
      },
      {
        name: 'Dedicated 32GB',
        hourlyRate: 0.36,
        monthlyRate: 240,
        compute: { cpu: 8, ram: 32, disk: 640 }
      }
    ],
    limits: {
      maxInstances: 200,
      maxBandwidth: '20TB',
      rateLimits: { requests: 1600, period: 'hour' }
    }
  },

  vultr: {
    id: 'vultr',
    name: 'Vultr',
    type: 'hosting',
    apiEndpoint: 'https://api.vultr.com/v2',
    apiVersion: 'v2',
    authMethod: 'api_key',
    regions: ['ewr', 'ord', 'dfw', 'sea', 'lax', 'atl', 'mia', 'ams', 'lhr', 'fra', 'cdg', 'nrt', 'icn', 'sgp', 'syd', 'yto'],
    adultFriendly: true,
    complianceLevel: 'standard',
    features: ['kubernetes', 'load_balancer', 'block_storage', 'object_storage', 'bare_metal'],
    pricingTiers: [
      {
        name: 'Regular Performance',
        hourlyRate: 0.007,
        monthlyRate: 5,
        compute: { cpu: 1, ram: 1, disk: 25 }
      },
      {
        name: 'High Performance',
        hourlyRate: 0.012,
        monthlyRate: 8,
        compute: { cpu: 1, ram: 2, disk: 32 }
      },
      {
        name: 'High Frequency',
        hourlyRate: 0.036,
        monthlyRate: 24,
        compute: { cpu: 4, ram: 8, disk: 128 }
      }
    ],
    limits: {
      maxInstances: 50,
      maxBandwidth: '10TB',
      rateLimits: { requests: 2000, period: 'hour' }
    }
  },

  cloudflare: {
    id: 'cloudflare',
    name: 'Cloudflare',
    type: 'cdn',
    apiEndpoint: 'https://api.cloudflare.com/client/v4',
    apiVersion: 'v4',
    authMethod: 'bearer_token',
    regions: ['global'],
    adultFriendly: true,
    complianceLevel: 'premium',
    features: ['ddos_protection', 'waf', 'ssl_certificates', 'workers', 'stream', 'r2_storage', 'access', 'zero_trust'],
    pricingTiers: [
      {
        name: 'Free',
        hourlyRate: 0,
        monthlyRate: 0,
        bandwidth: 1000000 // 1TB
      },
      {
        name: 'Pro',
        hourlyRate: 0.68,
        monthlyRate: 20,
        bandwidth: 10000000 // 10TB
      },
      {
        name: 'Enterprise',
        hourlyRate: 6.8,
        monthlyRate: 200,
        bandwidth: -1 // Unlimited
      }
    ],
    limits: {
      maxBandwidth: 'unlimited',
      rateLimits: { requests: 1200, period: 'minute' }
    }
  },

  bunnycdn: {
    id: 'bunnycdn',
    name: 'Bunny.net',
    type: 'cdn',
    apiEndpoint: 'https://api.bunny.net',
    apiVersion: 'v1',
    authMethod: 'api_key',
    regions: ['global'],
    adultFriendly: true,
    complianceLevel: 'premium',
    features: ['edge_storage', 'stream', 'optimizer', 'ddos_protection', 'waf', 'dns'],
    pricingTiers: [
      {
        name: 'Volume',
        hourlyRate: 0.01,
        monthlyRate: 7.5,
        bandwidth: 1000 // Per GB
      },
      {
        name: 'Standard',
        hourlyRate: 0.005,
        monthlyRate: 3.5,
        bandwidth: 1000 // Per GB
      }
    ],
    limits: {
      maxBandwidth: 'unlimited',
      rateLimits: { requests: 100, period: 'minute' }
    }
  },

  backblaze: {
    id: 'backblaze',
    name: 'Backblaze B2',
    type: 'storage',
    apiEndpoint: 'https://api.backblazeb2.com',
    apiVersion: 'v2',
    authMethod: 'api_key',
    regions: ['us-west', 'us-east', 'eu-central'],
    adultFriendly: true,
    complianceLevel: 'standard',
    features: ['versioning', 'lifecycle_rules', 'cross_region_replication', 'cdn_integration'],
    pricingTiers: [
      {
        name: 'Standard',
        hourlyRate: 0.0000069, // $0.005 per GB per month
        monthlyRate: 0.005,
        storage: 1 // Per GB
      }
    ],
    limits: {
      maxStorage: 'unlimited',
      rateLimits: { requests: 10000, period: 'day' }
    }
  },

  reflected: {
    id: 'reflected',
    name: 'Reflected Networks',
    type: 'streaming',
    apiEndpoint: 'https://api.reflected.net/v1',
    apiVersion: 'v1',
    authMethod: 'bearer_token',
    regions: ['us', 'eu', 'asia'],
    adultFriendly: true,
    complianceLevel: 'premium',
    features: ['live_streaming', 'vod', 'adaptive_bitrate', 'drm', 'analytics', 'geo_blocking'],
    pricingTiers: [
      {
        name: 'Starter',
        hourlyRate: 0.1,
        monthlyRate: 75,
        bandwidth: 500 // GB
      },
      {
        name: 'Professional',
        hourlyRate: 0.3,
        monthlyRate: 225,
        bandwidth: 2000 // GB
      },
      {
        name: 'Enterprise',
        hourlyRate: 1.0,
        monthlyRate: 750,
        bandwidth: 10000 // GB
      }
    ],
    limits: {
      maxConcurrentStreams: 1000,
      rateLimits: { requests: 500, period: 'minute' }
    }
  }
};

// Environment-specific configurations
export const getProviderConfig = (providerId: string, environment: 'development' | 'staging' | 'production'): ProviderConfig | null => {
  const config = PRODUCTION_PROVIDERS[providerId];
  if (!config) return null;

  // Adjust limits and pricing for non-production environments
  if (environment !== 'production') {
    return {
      ...config,
      limits: {
        ...config.limits,
        maxInstances: Math.min(config.limits.maxInstances || 10, 10),
        rateLimits: {
          ...config.limits.rateLimits,
          requests: Math.floor(config.limits.rateLimits.requests * 0.1)
        }
      }
    };
  }

  return config;
};

// Provider categories for easy filtering
export const PROVIDER_CATEGORIES = {
  HOSTING: ['digitalocean', 'linode', 'vultr', 'ovhcloud', 'interserver', 'tmdhosting'],
  CDN: ['cloudflare', 'bunnycdn', 'fastly', 'gcorecdn'],
  STORAGE: ['backblaze', 'cloudflare_r2', 'bunny_storage', 'digitalocean_spaces'],
  STREAMING: ['reflected', 'advanced_hosting', 'bunny_stream']
} as const;

// Compliance requirements mapping
export const COMPLIANCE_REQUIREMENTS = {
  ADA: ['accessibility_testing', 'wcag_compliance', 'screen_reader_support'],
  GDPR: ['data_encryption', 'right_to_erasure', 'consent_management', 'data_portability'],
  ADULT_CONTENT: ['age_verification', 'content_labeling', 'geo_restrictions', 'payment_compliance'],
  SECURITY: ['ssl_certificates', 'ddos_protection', 'waf', 'vulnerability_scanning']
} as const;