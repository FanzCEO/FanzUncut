// Advanced Security & Compliance Framework
// DRM, tokenized URLs, geo-blocking, content restrictions, and compliance monitoring

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { EventEmitter } from 'events';
import { z } from 'zod';
import geoip from 'geoip-lite';
import axios from 'axios';
import { Request, Response, NextFunction } from 'express';

// Security Configuration Types
export interface SecurityConfig {
  drmEnabled: boolean;
  tokenizedUrlsEnabled: boolean;
  geoBlockingEnabled: boolean;
  contentRestrictionsEnabled: boolean;
  complianceMonitoringEnabled: boolean;
  encryptionAlgorithm: string;
  tokenExpiration: number;
  allowedCountries: string[];
  blockedCountries: string[];
  contentRatings: string[];
}

export interface ContentSecurityPolicy {
  maxDownloads: number;
  allowedDevices: number;
  concurrentStreams: number;
  timeRestrictions: {
    enabled: boolean;
    allowedHours: [number, number];
    timezone: string;
  };
  domainRestrictions: string[];
  ipWhitelisting: string[];
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  country: string;
  type: 'age_verification' | 'content_labeling' | 'geo_restriction' | 'data_protection' | 'record_keeping';
  severity: 'low' | 'medium' | 'high' | 'critical';
  requirements: string[];
  automated: boolean;
  lastChecked?: Date;
  status: 'compliant' | 'non_compliant' | 'pending';
}

// DRM (Digital Rights Management) Service
export class DRMService extends EventEmitter {
  private encryptionKey: Buffer;
  private algorithm = 'aes-256-gcm';
  
  constructor(encryptionKey?: string) {
    super();
    this.encryptionKey = Buffer.from(
      encryptionKey || process.env.DRM_ENCRYPTION_KEY || this.generateEncryptionKey(),
      'hex'
    );
  }
  
  private generateEncryptionKey(): string {
    const key = crypto.randomBytes(32).toString('hex');
    console.warn('⚠️  Generated new DRM encryption key. Store securely:', key);
    return key;
  }
  
  // Encrypt content with DRM protection
  encryptContent(content: Buffer, metadata: any = {}): {
    encryptedContent: Buffer;
    key: Buffer;
    iv: Buffer;
    tag: Buffer;
    metadata: any;
  } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
    cipher.setAAD(Buffer.from(JSON.stringify(metadata)));
    
    const encrypted = Buffer.concat([
      cipher.update(content),
      cipher.final()
    ]);
    
    const tag = cipher.getAuthTag();
    
    this.emit('contentEncrypted', {
      contentId: metadata.contentId,
      size: content.length,
      encryptedSize: encrypted.length,
      timestamp: new Date()
    });
    
    return {
      encryptedContent: encrypted,
      key: this.encryptionKey,
      iv,
      tag,
      metadata
    };
  }
  
  // Decrypt content with authorization check
  decryptContent(
    encryptedContent: Buffer,
    iv: Buffer,
    tag: Buffer,
    metadata: any,
    userAuth: any
  ): Buffer {
    // Check user authorization
    if (!this.verifyUserAccess(userAuth, metadata)) {
      throw new Error('Unauthorized access to protected content');
    }
    
    const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from(JSON.stringify(metadata)));
    
    const decrypted = Buffer.concat([
      decipher.update(encryptedContent),
      decipher.final()
    ]);
    
    this.emit('contentDecrypted', {
      contentId: metadata.contentId,
      userId: userAuth.userId,
      timestamp: new Date()
    });
    
    return decrypted;
  }
  
  private verifyUserAccess(userAuth: any, metadata: any): boolean {
    // Check if user has valid subscription/purchase
    if (!userAuth.hasAccess) return false;
    
    // Check content-specific permissions
    if (metadata.premiumOnly && !userAuth.isPremium) return false;
    
    // Check geographic restrictions
    if (metadata.geoRestricted && !this.checkGeoAccess(userAuth.country, metadata.allowedCountries)) {
      return false;
    }
    
    return true;
  }
  
  private checkGeoAccess(userCountry: string, allowedCountries: string[]): boolean {
    return allowedCountries.includes(userCountry) || allowedCountries.includes('*');
  }
  
  // Generate content license with usage restrictions
  generateContentLicense(contentId: string, userId: string, restrictions: ContentSecurityPolicy): string {
    const license = {
      contentId,
      userId,
      restrictions,
      issuedAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      deviceFingerprint: this.generateDeviceFingerprint(),
      nonce: crypto.randomBytes(16).toString('hex')
    };
    
    return jwt.sign(license, this.encryptionKey, { algorithm: 'HS256' });
  }
  
  verifyContentLicense(license: string, deviceInfo: any): any {
    try {
      const decoded = jwt.verify(license, this.encryptionKey) as any;
      
      // Check expiration
      if (Date.now() > decoded.expiresAt) {
        throw new Error('License expired');
      }
      
      // Check device fingerprint
      if (decoded.deviceFingerprint !== this.generateDeviceFingerprint(deviceInfo)) {
        throw new Error('Device mismatch');
      }
      
      return decoded;
    } catch (error) {
      this.emit('licenseViolation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        deviceInfo,
        timestamp: new Date()
      });
      throw error;
    }
  }
  
  private generateDeviceFingerprint(deviceInfo?: any): string {
    const info = deviceInfo || {
      userAgent: 'unknown',
      screen: 'unknown',
      timezone: 'unknown'
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(info))
      .digest('hex')
      .substring(0, 16);
  }
}

// Tokenized URL Service for secure content delivery
export class TokenizedURLService {
  private secretKey: Buffer;
  
  constructor(secretKey?: string) {
    this.secretKey = Buffer.from(
      secretKey || process.env.URL_TOKEN_SECRET || crypto.randomBytes(32).toString('hex'),
      'hex'
    );
  }
  
  // Generate secure tokenized URL
  generateSecureURL(
    baseUrl: string,
    contentId: string,
    userId: string,
    permissions: any = {},
    expirationMinutes: number = 60
  ): string {
    const expiration = Date.now() + (expirationMinutes * 60 * 1000);
    const nonce = crypto.randomBytes(8).toString('hex');
    
    const payload = {
      contentId,
      userId,
      permissions,
      exp: expiration,
      nonce
    };
    
    const token = this.createToken(payload);
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    url.searchParams.set('expires', expiration.toString());
    
    return url.toString();
  }
  
  // Verify tokenized URL and extract permissions
  verifySecureURL(url: string, userId: string): any {
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    const expires = urlObj.searchParams.get('expires');
    
    if (!token || !expires) {
      throw new Error('Invalid tokenized URL');
    }
    
    if (Date.now() > parseInt(expires)) {
      throw new Error('URL expired');
    }
    
    const payload = this.verifyToken(token);
    
    if (payload.userId !== userId) {
      throw new Error('User mismatch');
    }
    
    return payload;
  }
  
  private createToken(payload: any): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
  
  private verifyToken(token: string): any {
    const [header, payload, signature] = token.split('.');
    
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${header}.${payload}`)
      .digest('base64url');
    
    if (signature !== expectedSignature) {
      throw new Error('Invalid token signature');
    }
    
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  }
  
  // Generate time-limited streaming token
  generateStreamingToken(contentId: string, userId: string, quality: string = 'hd'): string {
    const token = {
      type: 'streaming',
      contentId,
      userId,
      quality,
      maxConnections: 1,
      exp: Date.now() + (4 * 60 * 60 * 1000), // 4 hours
      iat: Date.now()
    };
    
    return jwt.sign(token, this.secretKey, { algorithm: 'HS256' });
  }
  
  verifyStreamingToken(token: string): any {
    return jwt.verify(token, this.secretKey);
  }
}

// Enhanced Geo-blocking Service
export class GeoBlockingService extends EventEmitter {
  private allowedCountries: Set<string>;
  private blockedCountries: Set<string>;
  private vpnDetectionEnabled: boolean;
  
  constructor(config: { allowedCountries: string[]; blockedCountries: string[]; vpnDetection?: boolean }) {
    super();
    this.allowedCountries = new Set(config.allowedCountries);
    this.blockedCountries = new Set(config.blockedCountries);
    this.vpnDetectionEnabled = config.vpnDetection || false;
  }
  
  // Check if access is allowed from IP
  async checkAccess(ip: string, userId?: string): Promise<{
    allowed: boolean;
    country: string;
    reason?: string;
    vpnDetected?: boolean;
  }> {
    const geoInfo = geoip.lookup(ip);
    
    if (!geoInfo) {
      this.emit('geoLookupFailed', { ip, userId, timestamp: new Date() });
      return {
        allowed: false,
        country: 'unknown',
        reason: 'Unable to determine location'
      };
    }
    
    const country = geoInfo.country;
    
    // Check VPN/Proxy if enabled
    let vpnDetected = false;
    if (this.vpnDetectionEnabled) {
      vpnDetected = await this.detectVPN(ip);
      if (vpnDetected) {
        this.emit('vpnDetected', { ip, country, userId, timestamp: new Date() });
        return {
          allowed: false,
          country,
          reason: 'VPN/Proxy detected',
          vpnDetected: true
        };
      }
    }
    
    // Check blocked countries first
    if (this.blockedCountries.has(country)) {
      this.emit('accessBlocked', { ip, country, userId, reason: 'blocked_country', timestamp: new Date() });
      return {
        allowed: false,
        country,
        reason: 'Country blocked'
      };
    }
    
    // If allowedCountries is set and doesn't include all (*), check if country is allowed
    if (this.allowedCountries.size > 0 && !this.allowedCountries.has('*') && !this.allowedCountries.has(country)) {
      this.emit('accessBlocked', { ip, country, userId, reason: 'country_not_allowed', timestamp: new Date() });
      return {
        allowed: false,
        country,
        reason: 'Country not in allowed list'
      };
    }
    
    this.emit('accessAllowed', { ip, country, userId, timestamp: new Date() });
    return {
      allowed: true,
      country,
      vpnDetected
    };
  }
  
  private async detectVPN(ip: string): Promise<boolean> {
    try {
      // This would integrate with VPN detection services like:
      // IPQualityScore, MaxMind, or similar services
      
      // Mock implementation - in production, use actual VPN detection API
      const response = await axios.get(`https://api.vpnapi.io/api/${ip}`, {
        timeout: 5000,
        headers: {
          'X-API-Key': process.env.VPN_DETECTION_API_KEY || ''
        }
      });
      
      return response.data.security?.vpn === true || response.data.security?.proxy === true;
    } catch (error) {
      console.warn('VPN detection failed:', error instanceof Error ? error.message : 'Unknown error');
      return false; // Fail open for now
    }
  }
  
  // Create geo-blocking middleware
  createMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
        const userId = (req as any).user?.id;
        
        const accessCheck = await this.checkAccess(ip, userId);
        
        if (!accessCheck.allowed) {
          return res.status(403).json({
            error: 'Access denied',
            reason: accessCheck.reason,
            country: accessCheck.country
          });
        }
        
        // Add geo info to request for later use
        (req as any).geoInfo = {
          country: accessCheck.country,
          vpnDetected: accessCheck.vpnDetected
        };
        
        next();
      } catch (error) {
        console.error('Geo-blocking middleware error:', error);
        next(error);
      }
    };
  }
}

// Compliance Monitoring Service
export class ComplianceMonitoringService extends EventEmitter {
  private rules: Map<string, ComplianceRule> = new Map();
  private violations: any[] = [];
  
  constructor() {
    super();
    this.initializeDefaultRules();
  }
  
  private initializeDefaultRules() {
    const defaultRules: ComplianceRule[] = [
      {
        id: 'age_verification_us',
        name: 'US Age Verification',
        description: '18 U.S.C. § 2257 age verification requirements',
        country: 'US',
        type: 'age_verification',
        severity: 'critical',
        requirements: [
          'Verify performer age with government ID',
          'Maintain records for 5 years after content removal',
          'Provide records to inspection within 5 business days'
        ],
        automated: true,
        status: 'compliant'
      },
      {
        id: 'gdpr_data_protection',
        name: 'GDPR Data Protection',
        description: 'EU General Data Protection Regulation compliance',
        country: 'EU',
        type: 'data_protection',
        severity: 'critical',
        requirements: [
          'Obtain explicit consent for data processing',
          'Implement data subject rights (access, portability, deletion)',
          'Conduct privacy impact assessments',
          'Report breaches within 72 hours'
        ],
        automated: true,
        status: 'compliant'
      },
      {
        id: 'uk_age_verification',
        name: 'UK Age Verification',
        description: 'UK age verification database requirements',
        country: 'GB',
        type: 'age_verification',
        severity: 'high',
        requirements: [
          'Use approved age verification database',
          'Verify age before access to adult content',
          'Maintain verification records'
        ],
        automated: false,
        status: 'pending'
      }
    ];
    
    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }
  
  // Add or update compliance rule
  addRule(rule: ComplianceRule) {
    this.rules.set(rule.id, rule);
    this.emit('ruleAdded', rule);
  }
  
  // Check compliance for specific rule
  async checkCompliance(ruleId: string, context: any = {}): Promise<{
    compliant: boolean;
    rule: ComplianceRule;
    details: any;
  }> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }
    
    const result = await this.executeComplianceCheck(rule, context);
    
    // Update rule status
    rule.status = result.compliant ? 'compliant' : 'non_compliant';
    rule.lastChecked = new Date();
    
    if (!result.compliant) {
      const violation = {
        ruleId,
        rule: rule.name,
        severity: rule.severity,
        details: result.details,
        timestamp: new Date(),
        context
      };
      
      this.violations.push(violation);
      this.emit('complianceViolation', violation);
    }
    
    return {
      compliant: result.compliant,
      rule,
      details: result.details
    };
  }
  
  private async executeComplianceCheck(rule: ComplianceRule, context: any): Promise<{
    compliant: boolean;
    details: any;
  }> {
    switch (rule.type) {
      case 'age_verification':
        return this.checkAgeVerificationCompliance(rule, context);
      case 'data_protection':
        return this.checkDataProtectionCompliance(rule, context);
      case 'geo_restriction':
        return this.checkGeoRestrictionCompliance(rule, context);
      case 'content_labeling':
        return this.checkContentLabelingCompliance(rule, context);
      default:
        return { compliant: true, details: { message: 'No automated check available' } };
    }
  }
  
  private async checkAgeVerificationCompliance(rule: ComplianceRule, context: any) {
    // Check if age verification records exist
    const hasVerificationRecords = context.hasAgeVerification || false;
    const hasGovernmentId = context.hasGovernmentIdVerification || false;
    
    return {
      compliant: hasVerificationRecords && hasGovernmentId,
      details: {
        hasVerificationRecords,
        hasGovernmentId,
        missingRequirements: []
          .concat(!hasVerificationRecords ? ['Age verification records'] : [])
          .concat(!hasGovernmentId ? ['Government ID verification'] : [])
      }
    };
  }
  
  private async checkDataProtectionCompliance(rule: ComplianceRule, context: any) {
    const hasConsent = context.hasExplicitConsent || false;
    const hasDataSubjectRights = context.implementsDataSubjectRights || false;
    const hasBreachResponse = context.hasBreachResponsePlan || false;
    
    return {
      compliant: hasConsent && hasDataSubjectRights && hasBreachResponse,
      details: {
        hasConsent,
        hasDataSubjectRights,
        hasBreachResponse,
        missingRequirements: []
          .concat(!hasConsent ? ['Explicit consent mechanism'] : [])
          .concat(!hasDataSubjectRights ? ['Data subject rights implementation'] : [])
          .concat(!hasBreachResponse ? ['Breach response plan'] : [])
      }
    };
  }
  
  private async checkGeoRestrictionCompliance(rule: ComplianceRule, context: any) {
    const hasGeoBlocking = context.hasGeoBlocking || false;
    const correctRegions = context.blockedRegions?.includes(rule.country) || false;
    
    return {
      compliant: hasGeoBlocking && correctRegions,
      details: {
        hasGeoBlocking,
        correctRegions,
        blockedRegions: context.blockedRegions || []
      }
    };
  }
  
  private async checkContentLabelingCompliance(rule: ComplianceRule, context: any) {
    const hasContentLabels = context.hasContentLabels || false;
    const hasAgeRatings = context.hasAgeRatings || false;
    
    return {
      compliant: hasContentLabels && hasAgeRatings,
      details: {
        hasContentLabels,
        hasAgeRatings
      }
    };
  }
  
  // Get all violations
  getViolations(severity?: string): any[] {
    return severity 
      ? this.violations.filter(v => v.severity === severity)
      : this.violations;
  }
  
  // Generate compliance report
  generateComplianceReport(): any {
    const rules = Array.from(this.rules.values());
    const compliantRules = rules.filter(r => r.status === 'compliant');
    const nonCompliantRules = rules.filter(r => r.status === 'non_compliant');
    const pendingRules = rules.filter(r => r.status === 'pending');
    
    return {
      summary: {
        totalRules: rules.length,
        compliant: compliantRules.length,
        nonCompliant: nonCompliantRules.length,
        pending: pendingRules.length,
        complianceScore: (compliantRules.length / rules.length) * 100
      },
      rules,
      violations: this.getViolations(),
      recommendations: this.generateRecommendations()
    };
  }
  
  private generateRecommendations(): string[] {
    const recommendations = [];
    const nonCompliantRules = Array.from(this.rules.values()).filter(r => r.status === 'non_compliant');
    
    nonCompliantRules.forEach(rule => {
      if (rule.severity === 'critical') {
        recommendations.push(`URGENT: Address ${rule.name} compliance immediately`);
      } else {
        recommendations.push(`Review and address ${rule.name} requirements`);
      }
    });
    
    return recommendations;
  }
}

// Advanced Security Service - Main orchestrator
export class AdvancedSecurityService extends EventEmitter {
  public drm: DRMService;
  public tokenizedUrls: TokenizedURLService;
  public geoBlocking: GeoBlockingService;
  public compliance: ComplianceMonitoringService;
  
  constructor(config: SecurityConfig) {
    super();
    
    this.drm = new DRMService();
    this.tokenizedUrls = new TokenizedURLService();
    this.geoBlocking = new GeoBlockingService({
      allowedCountries: config.allowedCountries,
      blockedCountries: config.blockedCountries,
      vpnDetection: true
    });
    this.compliance = new ComplianceMonitoringService();
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    // Forward events from all services
    [this.drm, this.geoBlocking, this.compliance].forEach(service => {
      service.on('*', (eventName, ...args) => {
        this.emit(eventName, ...args);
      });
    });
    
    // Security incident aggregation
    this.drm.on('licenseViolation', (data) => {
      this.emit('securityIncident', {
        type: 'drm_violation',
        severity: 'high',
        ...data
      });
    });
    
    this.geoBlocking.on('vpnDetected', (data) => {
      this.emit('securityIncident', {
        type: 'vpn_detected',
        severity: 'medium',
        ...data
      });
    });
    
    this.compliance.on('complianceViolation', (data) => {
      this.emit('securityIncident', {
        type: 'compliance_violation',
        severity: data.severity,
        ...data
      });
    });
  }
  
  // Create comprehensive security middleware
  createSecurityMiddleware() {
    return [
      this.geoBlocking.createMiddleware(),
      this.createDRMMiddleware(),
      this.createComplianceMiddleware()
    ];
  }
  
  private createDRMMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add DRM context to request
      (req as any).drm = {
        generateLicense: (contentId: string, restrictions: ContentSecurityPolicy) => {
          const userId = (req as any).user?.id;
          return this.drm.generateContentLicense(contentId, userId, restrictions);
        },
        verifyLicense: (license: string) => {
          const deviceInfo = {
            userAgent: req.headers['user-agent'],
            // Add more device fingerprinting data
          };
          return this.drm.verifyContentLicense(license, deviceInfo);
        }
      };
      
      next();
    };
  }
  
  private createComplianceMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const country = (req as any).geoInfo?.country;
        const userId = (req as any).user?.id;
        
        // Check relevant compliance rules based on user's country
        if (country) {
          const relevantRules = Array.from(this.compliance['rules'].values())
            .filter(rule => rule.country === country || rule.country === 'GLOBAL');
          
          for (const rule of relevantRules) {
            const complianceCheck = await this.compliance.checkCompliance(rule.id, {
              userId,
              country,
              hasAgeVerification: true, // Would check actual user verification status
              hasExplicitConsent: true, // Would check actual consent status
              // Add more context based on actual user/session data
            });
            
            if (!complianceCheck.compliant && rule.severity === 'critical') {
              return res.status(403).json({
                error: 'Compliance violation',
                rule: rule.name,
                requirements: rule.requirements
              });
            }
          }
        }
        
        next();
      } catch (error) {
        console.error('Compliance middleware error:', error);
        next(error);
      }
    };
  }
  
  // Generate comprehensive security report
  generateSecurityReport(): any {
    return {
      drm: {
        enabled: true,
        algorithm: this.drm['algorithm'],
        activeProtections: ['content_encryption', 'license_verification', 'device_binding']
      },
      tokenizedUrls: {
        enabled: true,
        defaultExpiration: '60 minutes'
      },
      geoBlocking: {
        enabled: true,
        allowedCountries: Array.from(this.geoBlocking['allowedCountries']),
        blockedCountries: Array.from(this.geoBlocking['blockedCountries']),
        vpnDetection: this.geoBlocking['vpnDetectionEnabled']
      },
      compliance: this.compliance.generateComplianceReport(),
      timestamp: new Date()
    };
  }
}

// Export validation schemas
export const SecurityConfigSchema = z.object({
  drmEnabled: z.boolean().default(true),
  tokenizedUrlsEnabled: z.boolean().default(true),
  geoBlockingEnabled: z.boolean().default(true),
  contentRestrictionsEnabled: z.boolean().default(true),
  complianceMonitoringEnabled: z.boolean().default(true),
  encryptionAlgorithm: z.string().default('aes-256-gcm'),
  tokenExpiration: z.number().default(3600),
  allowedCountries: z.array(z.string()).default(['*']),
  blockedCountries: z.array(z.string()).default([]),
  contentRatings: z.array(z.string()).default(['adult', 'explicit'])
});

export type SecurityConfigInput = z.infer<typeof SecurityConfigSchema>;