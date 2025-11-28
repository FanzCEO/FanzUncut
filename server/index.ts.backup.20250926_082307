import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logger, requestIdMiddleware, requestLoggingMiddleware } from "./logger";
import { setupHealthEndpoints, setupGracefulShutdown } from "./health";
import { setupCSRFTokenEndpoint } from "./middleware/csrf";

const app = express();

// Trust proxy for correct IP handling behind load balancers/CDN
app.set('trust proxy', true);

// CRITICAL SECURITY: Comprehensive security headers for compliance
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: process.env.NODE_ENV === 'production' 
        ? ["'self'", "https://js.stripe.com"] // Production: only trusted scripts
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"], // Development: allow Vite HMR
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Google Fonts
      fontSrc: ["'self'", "https://fonts.gstatic.com"], // Google Fonts
      imgSrc: ["'self'", "data:", "https:", "blob:"], // Support for media uploads
      connectSrc: process.env.NODE_ENV === 'production'
        ? ["'self'", "wss:", "https://api.stripe.com"] // Production: specific endpoints
        : ["'self'", "wss:", "ws:", "https://api.stripe.com", "ws://localhost:*", "http://localhost:*"], // Development: local HMR
      mediaSrc: ["'self'", "blob:"], // Media playback
      objectSrc: ["'none'"], // Prevent object/embed attacks
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"], // Allow Stripe payment iframes
      baseUri: ["'self'"], // Restrict base tag
      formAction: ["'self'"], // Restrict form submissions
      frameAncestors: ["'none'"], // Additional clickjacking protection
    },
  },
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false, // Only enable HSTS in production (HTTPS required)
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
  // Additional security headers
  xssFilter: true, // X-XSS-Protection
  noSniff: true, // X-Content-Type-Options: nosniff  
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Referrer-Policy
  // Note: Permissions-Policy headers will be added separately as custom headers
}));

// CRITICAL SECURITY: Additional security headers for compliance
app.use((req, res, next) => {
  // Permissions-Policy header (controls browser features)
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(self), usb=(), bluetooth=(), midi=()');
  next();
});

// Request tracing and logging
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);

// Cookie parsing for CSRF tokens
app.use(cookieParser());

// Body parsing
// Register GetStream webhook BEFORE global JSON parser to preserve raw body
app.post('/api/webhooks/getstream', express.raw({ type: 'application/json' }), async (req: any, res) => {
  try {
    // Ensure we have raw body buffer for signature verification
    if (!Buffer.isBuffer(req.body)) {
      console.error('❌ GetStream webhook: Expected raw body buffer but got:', typeof req.body);
      return res.status(400).json({ message: "Invalid request body format" });
    }

    const rawBody = req.body as Buffer;
    const signature = req.headers['x-stream-signature'] || req.headers['x-signature'] || '';
    
    if (!signature) {
      console.error('❌ GetStream webhook: Missing signature header');
      return res.status(401).json({ message: "Missing signature" });
    }

    // Import and initialize GetStream service
    const { createGetstreamService } = await import('./services/getstreamService');
    const { storage } = await import('./storage');
    const getstreamService = createGetstreamService(storage);
    
    // Extract signature value (handle "sha256=..." prefix if present)
    const signatureValue = signature.toString().replace(/^sha256=/, '');
    
    // Verify signature using raw bytes FIRST
    if (!getstreamService.verifyWebhookSignature(rawBody.toString('utf8'), signatureValue)) {
      console.error('❌ GetStream webhook: Invalid signature');
      return res.status(401).json({ message: "Invalid signature" });
    }

    // Only AFTER verification, parse the JSON payload
    const event = JSON.parse(rawBody.toString('utf8'));
    
    // Process the verified webhook event
    await getstreamService.handleWebhookEvent(event);
    
    console.log('✅ GetStream webhook processed successfully');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Error processing GetStream webhook:", error);
    res.status(500).json({ message: "Failed to process webhook" });
  }
});

// CRITICAL: Order matters! Stripe webhook must be registered BEFORE global JSON parser
// or signature verification will fail. Stripe webhook is registered in routes.ts

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Health endpoints (before auth setup)
setupHealthEndpoints(app);

// CSRF token endpoint
setupCSRFTokenEndpoint(app);

(async () => {
  await registerRoutes(app);
  
  // Import and register advanced features
  const { setupAdvancedRoutes } = await import('./routes');
  setupAdvancedRoutes(app);
  
  // Create server from the Express app
  const { createServer } = await import('http');
  const server = createServer(app);
  
  // Initialize WebSocket server
  const { wsManager } = await import('./websocket');
  logger.info('WebSocket server initialized on port 3001');

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Structured error logging
    logger.error({
      error: err,
      req: {
        id: (req as any).id,
        method: req.method,
        path: req.path,
        userAgent: req.headers['user-agent']
      },
      status
    }, 'Request error occurred');

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // 404 handler for unmatched API routes only (after static file serving)
  app.use('/api/*', (req: Request, res: Response) => {
    logger.warn({
      req: {
        id: (req as any).id,
        method: req.method,
        path: req.path
      }
    }, 'API route not found');
    
    res.status(404).json({ message: "Route not found" });
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info({ port }, 'Server started successfully');
    log(`serving on port ${port}`);
  });

  // Setup graceful shutdown handling
  setupGracefulShutdown(server);
})();
