// API Gateway Dashboard Routes Module
// Compatible with existing BoyFanz routing pattern

import { Router } from 'express';
import { apiGateway, registerFANZServices, getGatewayStatus } from '../services/apiGatewayInit.js';
import { setupAPIGatewayRoutes } from './apiGatewayDashboard.js';

const router = Router();

// Initialize FANZ services registration
registerFANZServices();

// Setup all gateway dashboard routes
setupAPIGatewayRoutes(router, apiGateway);

// Add a quick status endpoint that matches BoyFanz pattern
router.get('/status', async (req, res) => {
  try {
    const status = getGatewayStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Gateway status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gateway status',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;