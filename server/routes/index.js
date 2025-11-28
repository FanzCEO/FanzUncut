// FANZ Core Routes Configuration
// Main router configuration that imports and sets up all API routes

import express from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import contentRoutes from './content.js';
import paymentRoutes from './payment.js';
import analyticsRoutes from './analytics.js';
import mobileApiRoutes from './mobileApi.js';
import revolutionarySocialRoutes from './revolutionarySocial.js';
import advancedMonetizationRoutes from './advancedMonetization.js';
import creatorEconomyDashboardRoutes from './creatorEconomyDashboard.js';
import fanEngagementToolsRoutes from './fanEngagementTools.js';
import revenueOptimizationRoutes from './revenueOptimizationRoutes.js';
import orchestrationRoutes from './orchestration.js';

const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/content', contentRoutes);
router.use('/payments', paymentRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/mobile', mobileApiRoutes);
router.use('/social', revolutionarySocialRoutes);
router.use('/monetization', advancedMonetizationRoutes);
router.use('/dashboard', creatorEconomyDashboardRoutes);
router.use('/fan-engagement', fanEngagementToolsRoutes);
router.use('/revenue-ai', revenueOptimizationRoutes);
router.use('/orchestration', orchestrationRoutes);

// 404 handler for unknown routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

export default router;