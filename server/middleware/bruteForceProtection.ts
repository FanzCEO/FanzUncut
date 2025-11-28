import type { Request, Response, NextFunction } from "express";

// In-memory brute force tracking
// PRODUCTION: Replace with Redis for distributed protection
interface LoginAttempt {
  count: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
  blockedUntil?: number;
}

const loginAttempts = new Map<string, LoginAttempt>();
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Clean up every hour

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, attempt] of loginAttempts.entries()) {
    // Remove entries older than 1 hour
    if (now - attempt.lastAttemptAt > 60 * 60 * 1000) {
      loginAttempts.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

// Progressive blocking thresholds
const THRESHOLDS = [
  { attempts: 5, blockMinutes: 5 },      // 5 attempts = 5 min block
  { attempts: 10, blockMinutes: 15 },    // 10 attempts = 15 min block
  { attempts: 20, blockMinutes: 60 },    // 20 attempts = 1 hour block
  { attempts: 50, blockMinutes: 240 },   // 50 attempts = 4 hour block
  { attempts: 100, blockMinutes: 1440 }, // 100 attempts = 24 hour block
];

function getBlockDuration(attemptCount: number): number {
  for (let i = THRESHOLDS.length - 1; i >= 0; i--) {
    if (attemptCount >= THRESHOLDS[i].attempts) {
      return THRESHOLDS[i].blockMinutes * 60 * 1000;
    }
  }
  return 0;
}

export function trackLoginAttempt(identifier: string, success: boolean): void {
  const now = Date.now();
  const attempt = loginAttempts.get(identifier);

  if (success) {
    // Clear attempts on successful login
    loginAttempts.delete(identifier);
    return;
  }

  if (!attempt) {
    // First failed attempt
    loginAttempts.set(identifier, {
      count: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
    });
  } else {
    // Increment failed attempts
    attempt.count++;
    attempt.lastAttemptAt = now;

    const blockDuration = getBlockDuration(attempt.count);
    if (blockDuration > 0) {
      attempt.blockedUntil = now + blockDuration;
    }
  }
}

export function checkBruteForce(identifier: string): {
  blocked: boolean;
  retryAfterMs?: number;
  message?: string;
} {
  const attempt = loginAttempts.get(identifier);
  if (!attempt || !attempt.blockedUntil) {
    return { blocked: false };
  }

  const now = Date.now();
  if (now < attempt.blockedUntil) {
    const retryAfterMs = attempt.blockedUntil - now;
    const minutes = Math.ceil(retryAfterMs / 60000);
    return {
      blocked: true,
      retryAfterMs,
      message: `Account temporarily blocked due to multiple failed login attempts. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`
    };
  }

  // Block expired, clear attempts
  loginAttempts.delete(identifier);
  return { blocked: false };
}

// Middleware to check brute force before authentication
export function bruteForceMiddleware(
  identifierExtractor: (req: Request) => string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = identifierExtractor(req);
    const check = checkBruteForce(identifier);

    if (check.blocked) {
      res.set('Retry-After', String(Math.ceil(check.retryAfterMs! / 1000)));
      return res.status(429).json({
        success: false,
        error: check.message,
        retryAfter: check.retryAfterMs
      });
    }

    next();
  };
}

// Helper to get login attempts info (for admin dashboard)
export function getLoginAttemptsStats(): {
  totalTracked: number;
  totalBlocked: number;
  attempts: Array<{
    identifier: string;
    count: number;
    blockedUntil?: number;
  }>;
} {
  const now = Date.now();
  const attempts: Array<{
    identifier: string;
    count: number;
    blockedUntil?: number;
  }> = [];

  let totalBlocked = 0;

  for (const [identifier, attempt] of loginAttempts.entries()) {
    attempts.push({
      identifier,
      count: attempt.count,
      blockedUntil: attempt.blockedUntil,
    });

    if (attempt.blockedUntil && now < attempt.blockedUntil) {
      totalBlocked++;
    }
  }

  return {
    totalTracked: loginAttempts.size,
    totalBlocked,
    attempts: attempts.sort((a, b) => b.count - a.count).slice(0, 100), // Top 100
  };
}

// PRODUCTION NOTE: For distributed systems, replace with Redis:
/*
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });

async function trackLoginAttemptRedis(identifier: string, success: boolean) {
  const key = `brute:${identifier}`;
  if (success) {
    await redis.del(key);
    return;
  }
  
  const attempts = await redis.incr(key);
  await redis.expire(key, 3600); // 1 hour TTL
  
  const blockDuration = getBlockDuration(attempts);
  if (blockDuration > 0) {
    await redis.set(`block:${identifier}`, '1', 'PX', blockDuration);
  }
}
*/
