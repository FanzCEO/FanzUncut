import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { logger } from '../logger';

// CSRF token management using double-submit cookie pattern
// This is more secure than session-based tokens for stateless APIs

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrfToken';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate cryptographically secure CSRF token
function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

// CSRF token generation endpoint
export function setupCSRFTokenEndpoint(app: any) {
  app.get('/api/csrf-token', (req: Request, res: Response) => {
    const token = generateCSRFToken();
    
    // Set secure cookie with CSRF token
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Frontend needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 3600000, // 1 hour
      path: '/' // Ensure cookie is available site-wide
    });
    
    res.json({ csrfToken: token });
  });
}

// CSRF protection middleware for state-changing routes
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF protection for safe methods
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;
  const bodyToken = req.body?._csrf;

  // Token must be present in both cookie and header/body
  if (!cookieToken) {
    logger.warn({
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method
    }, 'CSRF protection: No CSRF cookie found');
    
    return res.status(403).json({ 
      error: 'CSRF token missing. Get token from /api/csrf-token' 
    });
  }

  const submittedToken = headerToken || bodyToken;
  if (!submittedToken) {
    logger.warn({
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method
    }, 'CSRF protection: No CSRF token in request');
    
    return res.status(403).json({ 
      error: 'CSRF token required in X-CSRF-Token header or _csrf body field' 
    });
  }

  // Double-submit cookie pattern: cookie and header must match
  if (cookieToken !== submittedToken) {
    logger.warn({
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method
    }, 'CSRF protection: Token mismatch');
    
    return res.status(403).json({ 
      error: 'CSRF token mismatch' 
    });
  }

  // CSRF validation passed
  next();
}