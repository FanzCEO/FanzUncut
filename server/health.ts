import type { Express } from 'express';
import { pool } from './db';
import { logger } from './logger';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  database: 'connected' | 'disconnected';
  sessionStore: 'available' | 'unavailable';
}

// Database health check
async function checkDatabase(): Promise<'connected' | 'disconnected'> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return 'connected';
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return 'disconnected';
  }
}

// Session store health check  
async function checkSessionStore(): Promise<'available' | 'unavailable'> {
  try {
    const client = await pool.connect();
    // Check if sessions table exists and is accessible
    await client.query(`SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'session'
    )`);
    client.release();
    return 'available';
  } catch (error) {
    logger.error({ error }, 'Session store health check failed');
    return 'unavailable';
  }
}

// Comprehensive health check
async function performHealthCheck(): Promise<HealthCheck> {
  const [database, sessionStore] = await Promise.all([
    checkDatabase(),
    checkSessionStore()
  ]);

  const status: HealthCheck['status'] = 
    database === 'connected' && sessionStore === 'available' 
      ? 'healthy' 
      : 'unhealthy';

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database,
    sessionStore
  };
}

// Setup health endpoints
export function setupHealthEndpoints(app: Express) {
  // Liveness probe - basic service availability
  app.get('/health', async (req, res) => {
    res.json({ 
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Readiness probe - service ready to handle traffic
  app.get('/ready', async (req, res) => {
    try {
      const health = await performHealthCheck();
      
      if (health.status === 'healthy') {
        res.json(health);
      } else {
        res.status(503).json(health);
      }
    } catch (error) {
      logger.error({ error }, 'Readiness check failed');
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  });

  // Detailed health check for monitoring
  app.get('/health/detailed', async (req, res) => {
    try {
      const health = await performHealthCheck();
      res.json(health);
    } catch (error) {
      logger.error({ error }, 'Detailed health check failed');
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check system failure'
      });
    }
  });
}

// Graceful shutdown handler
export function setupGracefulShutdown(server: any) {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    
    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        // Close database pool
        await pool.end();
        logger.info('Database pool closed');
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during graceful shutdown');
        process.exit(1);
      }
    });
    
    // Force exit after timeout
    setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}