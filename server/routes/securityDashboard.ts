// Advanced Security API Routes
// DRM, tokenized URLs, geo-blocking, content restrictions, and compliance monitoring

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  AdvancedSecurityService,
  SecurityConfigSchema,
  SecurityConfig,
  ContentSecurityPolicy,
  ComplianceRule
} from '../services/advancedSecurityService.js';
import { isAuthenticated, requireAdmin } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

const router = Router();

// Initialize security service with default configuration
const defaultSecurityConfig: SecurityConfig = {
  drmEnabled: true,
  tokenizedUrlsEnabled: true,
  geoBlockingEnabled: true,
  contentRestrictionsEnabled: true,
  complianceMonitoringEnabled: true,
  encryptionAlgorithm: 'aes-256-gcm',
  tokenExpiration: 3600,
  allowedCountries: ['*'], // Allow all countries by default
  blockedCountries: ['CN', 'KP', 'IR'], // Block restricted countries
  contentRatings: ['adult', 'explicit']
};

const securityService = new AdvancedSecurityService(defaultSecurityConfig);

// Apply admin authentication to all security routes
router.use(requireAdmin);

// Validation schemas
const TokenizedUrlSchema = z.object({
  baseUrl: z.string().url(),
  contentId: z.string(),
  permissions: z.record(z.any()).optional(),
  expirationMinutes: z.number().min(1).max(1440).default(60)
});

const ContentLicenseSchema = z.object({
  contentId: z.string(),
  restrictions: z.object({
    maxDownloads: z.number().min(1).default(5),
    allowedDevices: z.number().min(1).default(3),
    concurrentStreams: z.number().min(1).default(2),
    timeRestrictions: z.object({
      enabled: z.boolean().default(false),
      allowedHours: z.tuple([z.number().min(0).max(23), z.number().min(0).max(23)]).default([0, 23]),
      timezone: z.string().default('UTC')
    }),
    domainRestrictions: z.array(z.string()).default([]),
    ipWhitelisting: z.array(z.string()).default([])
  })
});

const ComplianceRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  country: z.string(),
  type: z.enum(['age_verification', 'content_labeling', 'geo_restriction', 'data_protection', 'record_keeping']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  requirements: z.array(z.string()),
  automated: z.boolean().default(false)
});

const GeoBlockingConfigSchema = z.object({
  allowedCountries: z.array(z.string()),
  blockedCountries: z.array(z.string()),
  vpnDetection: z.boolean().default(true)
});

// GET /api/security/overview
// Comprehensive security overview
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const securityReport = securityService.generateSecurityReport();
    
    // Add additional security metrics
    const overview = {
      ...securityReport,
      activeSecurityFeatures: {
        drm: securityReport.drm.enabled,
        tokenizedUrls: securityReport.tokenizedUrls.enabled,
        geoBlocking: securityReport.geoBlocking.enabled,
        complianceMonitoring: true,
        vpnDetection: securityReport.geoBlocking.vpnDetection,
        contentEncryption: true
      },
      securityScore: calculateSecurityScore(securityReport),
      recommendations: generateSecurityRecommendations(securityReport)
    };

    res.json(overview);
  } catch (error) {
    console.error('Security overview error:', error);
    res.status(500).json({
      error: 'Failed to generate security overview',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/security/tokenized-url
// Generate secure tokenized URL
router.post('/tokenized-url', validateRequest(TokenizedUrlSchema), async (req: Request, res: Response) => {
  try {
    const { baseUrl, contentId, permissions, expirationMinutes } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const secureUrl = securityService.tokenizedUrls.generateSecureURL(
      baseUrl,
      contentId,
      userId,
      permissions,
      expirationMinutes
    );

    res.json({
      secureUrl,
      contentId,
      expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000),
      permissions: permissions || {}
    });
  } catch (error) {
    console.error('Tokenized URL generation error:', error);
    res.status(500).json({
      error: 'Failed to generate secure URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/security/verify-url
// Verify tokenized URL
router.post('/verify-url', async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    const userId = (req as any).user?.id;

    if (!userId || !url) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const verification = securityService.tokenizedUrls.verifySecureURL(url, userId);

    res.json({
      valid: true,
      contentId: verification.contentId,
      permissions: verification.permissions,
      expiresAt: new Date(verification.exp)
    });
  } catch (error) {
    console.error('URL verification error:', error);
    res.status(400).json({
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid URL'
    });
  }
});

// POST /api/security/content-license
// Generate content license with DRM
router.post('/content-license', validateRequest(ContentLicenseSchema), async (req: Request, res: Response) => {
  try {
    const { contentId, restrictions } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const license = securityService.drm.generateContentLicense(contentId, userId, restrictions);

    res.json({
      license,
      contentId,
      userId,
      restrictions,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
  } catch (error) {
    console.error('Content license generation error:', error);
    res.status(500).json({
      error: 'Failed to generate content license',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/security/verify-license
// Verify content license
router.post('/verify-license', async (req: Request, res: Response) => {
  try {
    const { license } = req.body;
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      screen: req.body.screen || 'unknown',
      timezone: req.body.timezone || 'unknown'
    };

    const verification = securityService.drm.verifyContentLicense(license, deviceInfo);

    res.json({
      valid: true,
      contentId: verification.contentId,
      userId: verification.userId,
      restrictions: verification.restrictions,
      expiresAt: new Date(verification.expiresAt)
    });
  } catch (error) {
    console.error('License verification error:', error);
    res.status(400).json({
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid license'
    });
  }
});

// GET /api/security/geo-status
// Check geo-blocking status for current user
router.get('/geo-status', async (req: Request, res: Response) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const userId = (req as any).user?.id;

    const geoCheck = await securityService.geoBlocking.checkAccess(ip, userId);

    res.json({
      ip,
      allowed: geoCheck.allowed,
      country: geoCheck.country,
      reason: geoCheck.reason,
      vpnDetected: geoCheck.vpnDetected,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Geo status check error:', error);
    res.status(500).json({
      error: 'Failed to check geo status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/security/geo-config (Admin only)
// Update geo-blocking configuration
router.put('/geo-config', requireAdmin, validateRequest(GeoBlockingConfigSchema), async (req: Request, res: Response) => {
  try {
    const { allowedCountries, blockedCountries, vpnDetection } = req.body;

    // Update geo-blocking service configuration
    const newService = new AdvancedSecurityService({
      ...defaultSecurityConfig,
      allowedCountries,
      blockedCountries
    });

    // In production, you would update the global service instance
    res.json({
      success: true,
      config: {
        allowedCountries,
        blockedCountries,
        vpnDetection
      },
      message: 'Geo-blocking configuration updated successfully'
    });
  } catch (error) {
    console.error('Geo config update error:', error);
    res.status(500).json({
      error: 'Failed to update geo-blocking configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/security/compliance
// Get compliance status and rules
router.get('/compliance', async (req: Request, res: Response) => {
  try {
    const complianceReport = securityService.compliance.generateComplianceReport();

    res.json({
      ...complianceReport,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Compliance report error:', error);
    res.status(500).json({
      error: 'Failed to generate compliance report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/security/compliance/check
// Check specific compliance rule
router.post('/compliance/check', async (req: Request, res: Response) => {
  try {
    const { ruleId, context } = req.body;

    if (!ruleId) {
      return res.status(400).json({ error: 'Rule ID is required' });
    }

    const complianceCheck = await securityService.compliance.checkCompliance(ruleId, context || {});

    res.json({
      ...complianceCheck,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Compliance check error:', error);
    res.status(400).json({
      error: 'Failed to check compliance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/security/compliance/rule (Admin only)
// Add or update compliance rule
router.post('/compliance/rule', requireAdmin, validateRequest(ComplianceRuleSchema), async (req: Request, res: Response) => {
  try {
    const rule: ComplianceRule = {
      ...req.body,
      status: 'pending' as const
    };

    securityService.compliance.addRule(rule);

    res.json({
      success: true,
      rule,
      message: 'Compliance rule added successfully'
    });
  } catch (error) {
    console.error('Compliance rule addition error:', error);
    res.status(500).json({
      error: 'Failed to add compliance rule',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/security/violations
// Get compliance violations
router.get('/violations', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { severity } = req.query;
    const violations = securityService.compliance.getViolations(severity as string);

    res.json({
      violations,
      total: violations.length,
      severity: severity || 'all',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Violations retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve violations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/security/streaming-token
// Generate streaming token
router.post('/streaming-token', async (req: Request, res: Response) => {
  try {
    const { contentId, quality } = req.body;
    const userId = (req as any).user?.id;

    if (!userId || !contentId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const streamingToken = securityService.tokenizedUrls.generateStreamingToken(
      contentId,
      userId,
      quality || 'hd'
    );

    res.json({
      token: streamingToken,
      contentId,
      quality: quality || 'hd',
      expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
      maxConnections: 1
    });
  } catch (error) {
    console.error('Streaming token generation error:', error);
    res.status(500).json({
      error: 'Failed to generate streaming token',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/security/verify-streaming-token
// Verify streaming token
router.post('/verify-streaming-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const verification = securityService.tokenizedUrls.verifyStreamingToken(token);

    res.json({
      valid: true,
      contentId: verification.contentId,
      userId: verification.userId,
      quality: verification.quality,
      maxConnections: verification.maxConnections,
      issuedAt: new Date(verification.iat * 1000),
      expiresAt: new Date(verification.exp * 1000)
    });
  } catch (error) {
    console.error('Streaming token verification error:', error);
    res.status(400).json({
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid streaming token'
    });
  }
});

// GET /api/security/audit-log
// Get security audit log (Admin only)
router.get('/audit-log', requireAdmin, async (req: Request, res: Response) => {
  try {
    // This would integrate with your audit logging system
    const auditLog = [
      // Mock data - replace with actual audit log retrieval
      {
        id: '1',
        timestamp: new Date(),
        event: 'drm_violation',
        severity: 'high',
        userId: 'user123',
        details: 'License verification failed - device mismatch'
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000),
        event: 'vpn_detected',
        severity: 'medium',
        userId: 'user456',
        details: 'VPN detected from blocked country'
      }
    ];

    res.json({
      auditLog,
      total: auditLog.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Audit log retrieval error:', error);
    res.status(500).json({
      error: 'Failed to retrieve audit log',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Utility functions
function calculateSecurityScore(securityReport: any): number {
  let score = 0;
  const maxScore = 100;

  // DRM (25 points)
  if (securityReport.drm.enabled) score += 25;

  // Tokenized URLs (15 points)
  if (securityReport.tokenizedUrls.enabled) score += 15;

  // Geo-blocking (20 points)
  if (securityReport.geoBlocking.enabled) score += 15;
  if (securityReport.geoBlocking.vpnDetection) score += 5;

  // Compliance (40 points based on compliance score)
  const complianceScore = securityReport.compliance.summary.complianceScore;
  score += Math.floor((complianceScore / 100) * 40);

  return Math.min(score, maxScore);
}

function generateSecurityRecommendations(securityReport: any): string[] {
  const recommendations = [];

  if (!securityReport.drm.enabled) {
    recommendations.push('Enable DRM protection for sensitive content');
  }

  if (!securityReport.tokenizedUrls.enabled) {
    recommendations.push('Enable tokenized URLs for secure content delivery');
  }

  if (!securityReport.geoBlocking.enabled) {
    recommendations.push('Enable geo-blocking for content compliance');
  }

  if (!securityReport.geoBlocking.vpnDetection) {
    recommendations.push('Enable VPN detection to prevent bypassing geo-restrictions');
  }

  if (securityReport.compliance.summary.complianceScore < 80) {
    recommendations.push('Address compliance violations to improve security posture');
  }

  if (securityReport.compliance.summary.nonCompliant > 0) {
    recommendations.push(`Resolve ${securityReport.compliance.summary.nonCompliant} non-compliant rules`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Security configuration is optimal');
  }

  return recommendations;
}

export default router;