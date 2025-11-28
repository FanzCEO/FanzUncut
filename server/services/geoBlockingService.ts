import { storage } from '../storage';

interface GeoRestriction {
  id: string;
  type: 'content' | 'feature' | 'user_access' | 'payment';
  targetId?: string; // content ID, feature name, etc.
  blockedCountries: string[];
  allowedCountries: string[];
  isWhitelist: boolean; // true = allow only listed countries, false = block listed countries
  reason: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

interface IPGeolocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp: string;
  isVPN: boolean;
  isProxy: boolean;
  isTor: boolean;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  lastUpdated: Date;
}

interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  country?: string;
  restrictions?: GeoRestriction[];
  vpnDetected?: boolean;
  recommendedAction?: 'allow' | 'block' | 'warn' | 'verify';
}

interface ComplianceRule {
  id: string;
  country: string;
  regulations: {
    minAge: number;
    contentRestrictions: string[];
    paymentRestrictions: string[];
    dataRetention: number; // days
    rightToForget: boolean;
    consentRequired: boolean;
  };
  isActive: boolean;
  lastUpdated: Date;
}

// Comprehensive geo-blocking and compliance service
class GeoBlockingService {
  private ipLocationCache = new Map<string, IPGeolocation>();
  private restrictionCache = new Map<string, GeoRestriction[]>();
  private complianceRules = new Map<string, ComplianceRule>();

  // Legal restrictions by country (hardcoded common ones)
  private readonly legalRestrictions = {
    // Countries with strict content laws
    'CN': { blocked: true, reason: 'Local content regulations' },
    'IR': { blocked: true, reason: 'Local content regulations' },
    'KP': { blocked: true, reason: 'Sanctions and local regulations' },
    'SY': { blocked: true, reason: 'Sanctions and security concerns' },
    'CU': { blocked: true, reason: 'Trade sanctions' },
    
    // Age verification requirements
    'GB': { ageVerification: true, minAge: 18 },
    'FR': { ageVerification: true, minAge: 18 },
    'DE': { ageVerification: true, minAge: 18, dataProtection: 'GDPR' },
    'AU': { ageVerification: true, minAge: 18 },
    'CA': { ageVerification: true, minAge: 18 },
    
    // Payment restrictions
    'IN': { paymentRestrictions: ['crypto'], reason: 'Local payment regulations' },
    'BD': { paymentRestrictions: ['international'], reason: 'Foreign exchange controls' },
    
    // Data protection requirements
    'EU': { dataProtection: 'GDPR', consentRequired: true },
    'BR': { dataProtection: 'LGPD', consentRequired: true },
    'US-CA': { dataProtection: 'CCPA', consentRequired: true }
  };

  constructor() {
    this.initializeComplianceRules();
  }

  // ===== IP GEOLOCATION & VPN DETECTION =====

  // Get IP geolocation with VPN/proxy detection
  async getIPGeolocation(ip: string): Promise<IPGeolocation> {
    try {
      // Check cache first
      if (this.ipLocationCache.has(ip)) {
        const cached = this.ipLocationCache.get(ip)!;
        // Use cached data if less than 1 hour old
        if (Date.now() - cached.lastUpdated.getTime() < 3600000) {
          return cached;
        }
      }

      console.log(`🌍 Geolocating IP: ${ip}`);

      // Call IP geolocation service
      const geoData = await this.callIPGeolocationAPI(ip);
      
      // Enhanced VPN/proxy detection
      const vpnDetection = await this.detectVPNProxy(ip, geoData);

      const ipInfo: IPGeolocation = {
        ip,
        country: geoData.country || 'Unknown',
        countryCode: geoData.countryCode || 'XX',
        region: geoData.region || '',
        city: geoData.city || '',
        latitude: geoData.latitude || 0,
        longitude: geoData.longitude || 0,
        timezone: geoData.timezone || '',
        isp: geoData.isp || 'Unknown',
        isVPN: vpnDetection.isVPN,
        isProxy: vpnDetection.isProxy,
        isTor: vpnDetection.isTor,
        threatLevel: vpnDetection.threatLevel,
        lastUpdated: new Date()
      };

      // Cache the result
      this.ipLocationCache.set(ip, ipInfo);

      // Store in database for analytics
      await storage.createIPGeolocation(ipInfo);

      console.log(`🌍 IP located: ${ip} → ${ipInfo.country} (VPN: ${ipInfo.isVPN})`);
      return ipInfo;

    } catch (error) {
      console.error('IP geolocation failed:', error);
      
      // Return default/unknown location
      return {
        ip,
        country: 'Unknown',
        countryCode: 'XX',
        region: '',
        city: '',
        latitude: 0,
        longitude: 0,
        timezone: '',
        isp: 'Unknown',
        isVPN: false,
        isProxy: false,
        isTor: false,
        threatLevel: 'low',
        lastUpdated: new Date()
      };
    }
  }

  // ===== ACCESS CONTROL =====

  // Check if user can access content/feature from their location
  async checkGeoAccess(params: {
    ip: string;
    userId?: string;
    contentId?: string;
    feature?: string;
    type: 'content' | 'feature' | 'user_access' | 'payment';
  }): Promise<AccessCheckResult> {
    try {
      console.log(`🔒 Checking geo-access: ${params.type} from IP ${params.ip}`);

      // Get IP location
      const ipInfo = await this.getIPGeolocation(params.ip);

      // Check legal restrictions first
      const legalCheck = this.checkLegalRestrictions(ipInfo.countryCode);
      if (!legalCheck.allowed) {
        return {
          allowed: false,
          reason: legalCheck.reason,
          country: ipInfo.country,
          vpnDetected: ipInfo.isVPN,
          recommendedAction: 'block'
        };
      }

      // Get applicable restrictions
      const restrictions = await this.getApplicableRestrictions(params);

      // Check each restriction
      for (const restriction of restrictions) {
        const restrictionResult = this.evaluateRestriction(restriction, ipInfo.countryCode);
        if (!restrictionResult.allowed) {
          return {
            allowed: false,
            reason: restrictionResult.reason,
            country: ipInfo.country,
            restrictions: [restriction],
            vpnDetected: ipInfo.isVPN,
            recommendedAction: 'block'
          };
        }
      }

      // VPN/Proxy handling
      if (ipInfo.isVPN || ipInfo.isProxy) {
        const vpnPolicy = await this.getVPNPolicy(params.type);
        if (vpnPolicy.blocked) {
          return {
            allowed: false,
            reason: 'VPN/Proxy access not permitted',
            country: ipInfo.country,
            vpnDetected: true,
            recommendedAction: 'block'
          };
        } else if (vpnPolicy.requireVerification) {
          return {
            allowed: false,
            reason: 'VPN detected - additional verification required',
            country: ipInfo.country,
            vpnDetected: true,
            recommendedAction: 'verify'
          };
        }
      }

      // High-threat IP handling
      if (ipInfo.threatLevel === 'high' || ipInfo.threatLevel === 'critical') {
        return {
          allowed: false,
          reason: 'High-risk IP address detected',
          country: ipInfo.country,
          recommendedAction: 'block'
        };
      }

      console.log(`✅ Geo-access granted: ${params.type} from ${ipInfo.country}`);
      return {
        allowed: true,
        country: ipInfo.country,
        vpnDetected: ipInfo.isVPN,
        recommendedAction: 'allow'
      };

    } catch (error) {
      console.error('Geo-access check failed:', error);
      
      // Fail-safe: allow access but log for review
      return {
        allowed: true,
        reason: 'Geo-check error - defaulting to allow',
        recommendedAction: 'allow'
      };
    }
  }

  // ===== RESTRICTION MANAGEMENT =====

  // Create geo-restriction rule
  async createGeoRestriction(params: {
    type: 'content' | 'feature' | 'user_access' | 'payment';
    targetId?: string;
    countries: string[];
    isWhitelist: boolean;
    reason: string;
    createdBy: string;
    expiresAt?: Date;
  }): Promise<{ success: boolean; restrictionId?: string; error?: string }> {
    try {
      const restrictionId = `geo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const restriction: GeoRestriction = {
        id: restrictionId,
        type: params.type,
        targetId: params.targetId,
        blockedCountries: params.isWhitelist ? [] : params.countries,
        allowedCountries: params.isWhitelist ? params.countries : [],
        isWhitelist: params.isWhitelist,
        reason: params.reason,
        createdBy: params.createdBy,
        createdAt: new Date(),
        expiresAt: params.expiresAt,
        isActive: true
      };

      // Store restriction
      await storage.createGeoRestriction(restriction);

      // Clear cache for affected type
      this.clearRestrictionCache(params.type, params.targetId);

      // Create audit log
      await storage.createAuditLog({
        actorId: params.createdBy,
        action: 'geo_restriction_created',
        targetType: 'geo_restriction',
        targetId: restrictionId,
        diffJson: {
          type: params.type,
          targetId: params.targetId,
          countries: params.countries,
          isWhitelist: params.isWhitelist
        }
      });

      console.log(`🚫 Geo-restriction created: ${restrictionId} - ${params.type}`);
      return { success: true, restrictionId };

    } catch (error) {
      console.error('Geo-restriction creation failed:', error);
      return { success: false, error: 'Restriction creation failed' };
    }
  }

  // Get all restrictions for content/feature
  async getRestrictions(type: string, targetId?: string): Promise<GeoRestriction[]> {
    try {
      const cacheKey = `${type}:${targetId || 'global'}`;
      
      // Check cache
      if (this.restrictionCache.has(cacheKey)) {
        return this.restrictionCache.get(cacheKey)!;
      }

      // Fetch from database
      const restrictions = await storage.getGeoRestrictions(type, targetId);
      
      // Filter active and non-expired
      const activeRestrictions = restrictions.filter(r => 
        r.isActive && (!r.expiresAt || r.expiresAt > new Date())
      );

      // Cache result
      this.restrictionCache.set(cacheKey, activeRestrictions);

      return activeRestrictions;

    } catch (error) {
      console.error('Failed to get restrictions:', error);
      return [];
    }
  }

  // ===== COMPLIANCE RULES =====

  // Get compliance requirements for country
  async getComplianceRequirements(countryCode: string): Promise<ComplianceRule | null> {
    // Check cache
    if (this.complianceRules.has(countryCode)) {
      return this.complianceRules.get(countryCode)!;
    }

    // Load from database
    try {
      const rule = await storage.getComplianceRule(countryCode);
      if (rule) {
        this.complianceRules.set(countryCode, rule);
      }
      return rule;
    } catch (error) {
      console.error('Failed to get compliance rule:', error);
      return null;
    }
  }

  // Check if user meets compliance requirements
  async checkCompliance(userId: string, countryCode: string): Promise<{
    compliant: boolean;
    requirements: string[];
    actions: string[];
  }> {
    try {
      const requirements = await this.getComplianceRequirements(countryCode);
      if (!requirements) {
        return { compliant: true, requirements: [], actions: [] };
      }

      const result = {
        compliant: true,
        requirements: [] as string[],
        actions: [] as string[]
      };

      // Check age verification
      if (requirements.regulations.minAge > 0) {
        const user = await storage.getUser(userId);
        const hasAgeVerification = await storage.getUserAgeVerification(userId);
        
        if (!hasAgeVerification) {
          result.compliant = false;
          result.requirements.push(`Age verification required (minimum ${requirements.regulations.minAge})`);
          result.actions.push('age_verification');
        }
      }

      // Check consent requirements
      if (requirements.regulations.consentRequired) {
        const hasConsent = await storage.getUserConsent(userId, countryCode);
        if (!hasConsent) {
          result.compliant = false;
          result.requirements.push('Data processing consent required');
          result.actions.push('consent_form');
        }
      }

      return result;

    } catch (error) {
      console.error('Compliance check failed:', error);
      return { compliant: true, requirements: [], actions: [] };
    }
  }

  // ===== HELPER METHODS =====

  private async callIPGeolocationAPI(ip: string): Promise<any> {
    try {
      const apiKey = process.env.IP_GEOLOCATION_API_KEY;
      
      if (!apiKey) {
        console.warn('IP geolocation API key not configured, using mock data');
        return this.getMockGeoData(ip);
      }

      // Example using ipapi.co (replace with your preferred provider)
      const response = await fetch(`https://ipapi.co/${ip}/json/?key=${apiKey}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        country: data.country_name,
        countryCode: data.country_code,
        region: data.region,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        isp: data.org
      };

    } catch (error) {
      console.error('IP geolocation API call failed:', error);
      return this.getMockGeoData(ip);
    }
  }

  private async detectVPNProxy(ip: string, geoData: any): Promise<{
    isVPN: boolean;
    isProxy: boolean;
    isTor: boolean;
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    try {
      const vpnApiKey = process.env.VPN_DETECTION_API_KEY;
      
      if (!vpnApiKey) {
        console.warn('VPN detection API key not configured, using basic detection');
        return this.getBasicVPNDetection(ip, geoData);
      }

      // Example using VPN detection service
      const response = await fetch(`https://vpnapi.io/api/${ip}?key=${vpnApiKey}`);
      
      if (!response.ok) {
        throw new Error(`VPN API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        isVPN: data.security.vpn || false,
        isProxy: data.security.proxy || false,
        isTor: data.security.tor || false,
        threatLevel: data.security.threat || 'low'
      };

    } catch (error) {
      console.error('VPN detection failed:', error);
      return this.getBasicVPNDetection(ip, geoData);
    }
  }

  private getMockGeoData(ip: string): any {
    // Mock data for development
    const mockCountries = ['US', 'GB', 'CA', 'AU', 'FR', 'DE', 'JP'];
    const randomCountry = mockCountries[Math.floor(Math.random() * mockCountries.length)];
    
    return {
      country: randomCountry === 'US' ? 'United States' : 'Country Name',
      countryCode: randomCountry,
      region: 'State/Region',
      city: 'City Name',
      latitude: 40.7128,
      longitude: -74.0060,
      timezone: 'America/New_York',
      isp: 'Internet Service Provider'
    };
  }

  private getBasicVPNDetection(ip: string, geoData: any): any {
    // Basic VPN detection (IP ranges, ISP names, etc.)
    const vpnIndicators = [
      'vpn', 'proxy', 'hosting', 'datacenter', 'cloud', 'amazon', 'google', 'microsoft'
    ];
    
    const isp = (geoData.isp || '').toLowerCase();
    const hasVPNIndicator = vpnIndicators.some(indicator => isp.includes(indicator));
    
    return {
      isVPN: hasVPNIndicator,
      isProxy: false,
      isTor: false,
      threatLevel: hasVPNIndicator ? 'medium' : 'low'
    };
  }

  private checkLegalRestrictions(countryCode: string): { allowed: boolean; reason?: string } {
    const restriction = this.legalRestrictions[countryCode as keyof typeof this.legalRestrictions];
    
    if (restriction && restriction.blocked) {
      return { allowed: false, reason: restriction.reason };
    }
    
    return { allowed: true };
  }

  private async getApplicableRestrictions(params: any): Promise<GeoRestriction[]> {
    const restrictions = [];
    
    // Get global restrictions for the type
    const globalRestrictions = await this.getRestrictions(params.type);
    restrictions.push(...globalRestrictions);
    
    // Get specific restrictions for the target
    if (params.contentId || params.feature) {
      const specificRestrictions = await this.getRestrictions(params.type, params.contentId || params.feature);
      restrictions.push(...specificRestrictions);
    }
    
    return restrictions;
  }

  private evaluateRestriction(restriction: GeoRestriction, countryCode: string): { allowed: boolean; reason?: string } {
    if (restriction.isWhitelist) {
      // Whitelist: only allowed countries can access
      if (!restriction.allowedCountries.includes(countryCode)) {
        return { 
          allowed: false, 
          reason: `Access restricted to specific regions: ${restriction.reason}` 
        };
      }
    } else {
      // Blacklist: blocked countries cannot access
      if (restriction.blockedCountries.includes(countryCode)) {
        return { 
          allowed: false, 
          reason: `Access blocked from your region: ${restriction.reason}` 
        };
      }
    }
    
    return { allowed: true };
  }

  private async getVPNPolicy(type: string): Promise<{ blocked: boolean; requireVerification: boolean }> {
    // Different VPN policies for different content types
    const policies = {
      payment: { blocked: true, requireVerification: false }, // Strict for payments
      content: { blocked: false, requireVerification: true }, // Allow but verify for content
      feature: { blocked: false, requireVerification: false }, // Allow for features
      user_access: { blocked: false, requireVerification: true } // Verify for user access
    };
    
    return policies[type as keyof typeof policies] || { blocked: false, requireVerification: false };
  }

  private clearRestrictionCache(type: string, targetId?: string): void {
    const cacheKey = `${type}:${targetId || 'global'}`;
    this.restrictionCache.delete(cacheKey);
  }

  private initializeComplianceRules(): void {
    // Initialize common compliance rules
    const commonRules = [
      {
        id: 'gdpr_rule',
        country: 'EU',
        regulations: {
          minAge: 18,
          contentRestrictions: ['adult'],
          paymentRestrictions: [],
          dataRetention: 365,
          rightToForget: true,
          consentRequired: true
        },
        isActive: true,
        lastUpdated: new Date()
      },
      {
        id: 'coppa_rule',
        country: 'US',
        regulations: {
          minAge: 18,
          contentRestrictions: ['adult'],
          paymentRestrictions: [],
          dataRetention: 1095,
          rightToForget: false,
          consentRequired: false
        },
        isActive: true,
        lastUpdated: new Date()
      }
    ];

    commonRules.forEach(rule => {
      this.complianceRules.set(rule.country, rule);
    });
  }
}

export const geoBlockingService = new GeoBlockingService();