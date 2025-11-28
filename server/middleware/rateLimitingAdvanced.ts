import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";

// IP-based rate limiters for different endpoint categories
// PRODUCTION: Replace with Redis store for distributed rate limiting across instances

// Strictest: Auth endpoints to prevent brute force attacks
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many authentication attempts. Please try again in 15 minutes."
  },
  skipSuccessfulRequests: false,
  // Default keyGenerator uses req.ip which handles IPv6 correctly
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: "Too many requests. Please try again later.",
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

// Moderate: Payment/financial endpoints
export const paymentRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: "Too many payment requests. Please try again shortly."
  }
});

// Relaxed: Content upload/creation endpoints
export const uploadRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 uploads per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
  message: {
    success: false,
    error: "Upload rate limit exceeded. Please wait before uploading more content."
  }
});

// General API endpoints
export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "API rate limit exceeded. Please slow down your requests."
  }
});

// Aggressive: High-frequency read endpoints (feed, search, etc.)
export const readRateLimit = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 50, // 50 requests per 10 seconds per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: "Too many read requests. Please slow down."
  }
});

// WebSocket connection rate limiting
export const wsConnectionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 connections per 5 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many WebSocket connection attempts."
  }
});

// PRODUCTION NOTE: For 20M+ concurrent users, replace in-memory store with Redis:
/*
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL
});

const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'rl:',
});

// Then use: store: redisStore in each rateLimit config
*/
