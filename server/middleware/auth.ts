import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

interface AuthRequest extends Request {
  geoInfo?: {
    country: string;
    region: string;
    allowed: boolean;
  };
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ error: 'Authentication required' });
}

// Middleware to check if user is admin
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

// Middleware to check if user is creator only
export function requireCreator(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user?.role !== 'creator') {
    return res.status(403).json({ error: 'Creator access required' });
  }
  
  next();
}

// Middleware to check if user is creator or admin
export function requireCreatorOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user?.role !== 'creator' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Creator or admin access required' });
  }
  
  next();
}

// Middleware to check if user is moderator or admin
export function requireModeratorOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user?.role !== 'moderator' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Moderator or admin access required' });
  }
  
  next();
}

// Middleware to check if user owns resource or is admin
export function requireOwnershipOrAdmin(resourceUserIdField: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const currentUserId = req.user?.id;
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user?.role === 'admin' || currentUserId === resourceUserId) {
      return next();
    }
    
    res.status(403).json({ error: 'Access denied' });
  };
}

// CRITICAL COMPLIANCE MIDDLEWARE - Enforce KYC verification before sensitive actions
export function requireKYCVerification(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check KYC verification status  
  storage.getUserProfile(req.user!.id)
    .then(userProfile => {
      if (!userProfile || userProfile.kycStatus !== 'verified') {
        return res.status(403).json({ 
          error: 'KYC verification required',
          code: 'KYC_VERIFICATION_REQUIRED',
          message: 'You must complete identity verification before performing this action',
          redirectTo: '/kyc-verification'
        });
      }
      next();
    })
    .catch(error => {
      console.error('KYC verification check failed:', error);
      return res.status(500).json({ error: 'Verification check failed' });
    });
}

// CRITICAL COMPLIANCE MIDDLEWARE - Enforce age verification before content access
export function requireAgeVerification(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  storage.getUserProfile(req.user!.id)
    .then(userProfile => {
      if (!userProfile || !userProfile.ageVerified) {
        return res.status(403).json({ 
          error: 'Age verification required',
          code: 'AGE_VERIFICATION_REQUIRED', 
          message: 'You must verify your age before accessing this content',
          redirectTo: '/age-verification'
        });
      }
      next();
    })
    .catch(error => {
      console.error('Age verification check failed:', error);
      return res.status(500).json({ error: 'Age verification check failed' });
    });
}

// CRITICAL COMPLIANCE MIDDLEWARE - Enforce 2257 compliance for content creation
export function require2257Compliance(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user role is creator first (role is on req.user, not userProfile)
  if (req.user?.role !== 'creator') {
    return res.status(403).json({ error: 'Creator account required' });
  }
  
  storage.getUserProfile(req.user!.id)
    .then(userProfile => {
      if (!userProfile) {
        return res.status(404).json({ error: 'User profile not found' });
      }
      
      if (!userProfile.is2257Compliant) {
        return res.status(403).json({ 
          error: '2257 compliance required',
          code: 'PERFORMER_VERIFICATION_REQUIRED',
          message: 'You must complete performer verification (2257 compliance) before publishing content',
          redirectTo: '/performer-verification'
        });
      }
      next();
    })
    .catch(error => {
      console.error('2257 compliance check failed:', error);
      return res.status(500).json({ error: '2257 compliance check failed' });
    });
}

// CRITICAL COMPLIANCE MIDDLEWARE - Enforce geo-blocking for restricted regions  
export function enforceGeoBlocking(feature: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const ip = req.ip || (req as any).connection?.remoteAddress || '127.0.0.1';
    
    try {
      // Import geo-blocking service dynamically to avoid circular dependencies
      const { geoBlockingService } = await import('../services/geoBlockingService');
      
      const geoResult = await geoBlockingService.checkGeoAccess({
        ip,
        feature, 
        type: 'content'
      });
      
      if (!geoResult.allowed) {
        return res.status(451).json({ // 451 Unavailable For Legal Reasons
          error: 'Geographic restriction',
          code: 'GEO_BLOCKED',
          country: geoResult.country,
          message: `This service is not available in ${geoResult.country} due to local regulations`,
          reason: geoResult.reason
        });
      }
      
      // Store geo info for audit logging
      req.geoInfo = {
        country: geoResult.country || 'Unknown',
        region: 'Unknown', // region not available in AccessCheckResult
        allowed: true
      };
      
      next();
    } catch (error) {
      console.error('Geo-blocking check failed:', error);
      // Fail secure - if geo-blocking check fails, block access
      return res.status(503).json({ error: 'Geo-location verification temporarily unavailable' });
    }
  };
}

// CRITICAL COMPLIANCE MIDDLEWARE - Enforce sanctions screening for payouts
export function requireSanctionsScreening(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  storage.getUserProfile(req.user!.id)
    .then(userProfile => {
      if (!userProfile) {
        return res.status(404).json({ error: 'User profile not found' });
      }
      
      // Check if user has been sanctions screened recently (within 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (!userProfile.lastSanctionsScreening || userProfile.lastSanctionsScreening < thirtyDaysAgo) {
        return res.status(403).json({
          error: 'Sanctions screening required',
          code: 'SANCTIONS_SCREENING_REQUIRED',
          message: 'Recent sanctions screening is required for this financial operation',
          redirectTo: '/sanctions-screening'
        });
      }
      
      if (userProfile.sanctionsStatus === 'blocked') {
        return res.status(403).json({
          error: 'Account suspended',
          code: 'SANCTIONS_BLOCKED', 
          message: 'This account has been suspended due to sanctions screening results'
        });
      }
      
      next();
    })
    .catch(error => {
      console.error('Sanctions screening check failed:', error);
      return res.status(500).json({ error: 'Sanctions screening verification failed' });
    });
}