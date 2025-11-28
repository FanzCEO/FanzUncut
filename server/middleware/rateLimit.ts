import type { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 1000) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();
      
      if (!this.store[key] || this.store[key].resetTime < now) {
        this.store[key] = {
          count: 1,
          resetTime: now + this.windowMs
        };
        return next();
      }

      this.store[key].count++;

      if (this.store[key].count > this.maxRequests) {
        return res.status(429).json({
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((this.store[key].resetTime - now) / 1000)
        });
      }

      next();
    };
  }

  private getKey(req: Request): string {
    // Use IP address and user ID if available
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.claims?.sub || 'anonymous';
    return `${ip}:${userId}`;
  }
}

const rateLimiter = new RateLimiter();
export const rateLimit = rateLimiter.middleware();
