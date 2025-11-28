import { rateLimit } from 'express-rate-limit';
import { logger } from '../logger';

// Strict rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path
    }, 'Rate limit exceeded for authentication');
    
    res.status(429).json({
      error: 'Too many authentication attempts',
      retryAfter: 15 * 60
    });
  },
  // IPv6-safe rate limiting - remove custom keyGenerator to use default
  // Default keyGenerator handles IPv6 properly
});

// Medium rate limiting for registration endpoints
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 registration attempts per hour
  message: {
    error: 'Too many registration attempts',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path
    }, 'Rate limit exceeded for registration');
    
    res.status(429).json({
      error: 'Too many registration attempts',
      retryAfter: 60 * 60
    });
  }
});

// Rate limiting for media uploads
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 uploads per minute
  message: {
    error: 'Upload rate limit exceeded',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      userId: (req as any).user?.id,
      path: req.path
    }, 'Rate limit exceeded for uploads');
    
    res.status(429).json({
      error: 'Upload rate limit exceeded',
      retryAfter: 60
    });
  }
});

// SECURITY: Rate limiting for financial transactions (high-risk)
export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Max 5 transactions per minute to prevent abuse
  message: {
    error: 'Payment rate limit exceeded',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      userId: (req as any).user?.id,
      path: req.path,
      // SECURITY: NEVER log req.body - contains sensitive payment/PII data
      method: req.method,
      timestamp: new Date().toISOString()
    }, 'SECURITY: Payment rate limit exceeded');
    
    res.status(429).json({
      error: 'Payment rate limit exceeded',
      retryAfter: 60
    });
  }
});

// SECURITY: Rate limiting for content creation (spam prevention)
export const contentRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute  
  max: 20, // Max 20 posts/comments per minute
  message: {
    error: 'Content creation rate limit exceeded',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      userId: (req as any).user?.id,
      path: req.path
    }, 'Content creation rate limit exceeded');
    
    res.status(429).json({
      error: 'Content creation rate limit exceeded', 
      retryAfter: 60
    });
  }
});

// SECURITY: Rate limiting for sensitive operations (API keys, webhooks, etc)
export const sensitiveOperationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Max 10 sensitive operations per 5 minutes
  message: {
    error: 'Sensitive operation rate limit exceeded',
    retryAfter: 300
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      userId: (req as any).user?.id,
      path: req.path
    }, 'SECURITY: Sensitive operation rate limit exceeded');
    
    res.status(429).json({
      error: 'Sensitive operation rate limit exceeded',
      retryAfter: 300
    });
  }
});

// SECURITY: Rate limiting for verification requests (KYC, etc)
export const verificationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 verification attempts per hour
  message: {
    error: 'Verification rate limit exceeded',
    retryAfter: 3600
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn({
      ip: req.ip,
      userId: (req as any).user?.id,
      path: req.path
    }, 'SECURITY: Verification rate limit exceeded');
    
    res.status(429).json({
      error: 'Verification rate limit exceeded',
      retryAfter: 3600
    });
  }
});