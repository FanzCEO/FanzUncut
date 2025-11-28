import { Express } from 'express';
import { storage } from '../storage';
import { isAuthenticated, requireAdmin, requireCreator } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';
import { z } from 'zod';
import { aiContentModerationService } from '../services/aiContentModerationService';
import { aiRecommendationEngine } from '../services/aiRecommendationEngine';

// NFT & Web3 Management Routes
export function setupNFTRoutes(app: Express) {
  // Create NFT from media asset
  app.post('/api/nft/mint', isAuthenticated, csrfProtection, async (req, res) => {
    try {
      const user = req.user!;
      
      const mintSchema = z.object({
        mediaAssetId: z.string(),
        blockchain: z.enum(['ethereum', 'polygon', 'base', 'arbitrum', 'solana']),
        royaltyPercentage: z.number().min(0).max(5000).optional().default(1000), // 10% default
      });
      
      const { mediaAssetId, blockchain, royaltyPercentage } = mintSchema.parse(req.body);
      
      // Verify user owns the media asset
      const mediaAsset = await storage.getMediaAsset(mediaAssetId);
      if (!mediaAsset || mediaAsset.ownerId !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Create NFT asset record (actual blockchain minting would happen asynchronously)
      const nftAsset = await storage.createNftAsset({
        mediaAssetId,
        ownerId: user.id,
        blockchain,
        royaltyPercentage,
        status: 'minting',
        metadataUri: `https://boyfanz.app/api/nft/metadata/${mediaAssetId}`,
        forensicSignature: mediaAsset.forensicSignature || '',
      });
      
      res.json({
        success: true,
        nft: nftAsset,
        message: 'NFT minting initiated. You will receive a notification when complete.'
      });
    } catch (error: any) {
      console.error('NFT mint error:', error);
      res.status(400).json({ error: error.message || 'Failed to mint NFT' });
    }
  });
  
  // Get user's NFT collection
  app.get('/api/nft/collection/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = req.user!;
      
      // Users can only view their own NFTs or if they're admin
      if (userId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const nfts = await storage.getNftAssetsByOwner(userId);
      res.json({ nfts });
    } catch (error: any) {
      console.error('NFT collection error:', error);
      res.status(500).json({ error: 'Failed to fetch NFT collection' });
    }
  });
  
  // NFT metadata endpoint (public for marketplaces)
  app.get('/api/nft/metadata/:mediaAssetId', async (req, res) => {
    try {
      const { mediaAssetId } = req.params;
      
      const mediaAsset = await storage.getMediaAsset(mediaAssetId);
      if (!mediaAsset) {
        return res.status(404).json({ error: 'Media asset not found' });
      }
      
      // Return OpenSea-compatible metadata (only blurred preview for public access)
      const metadata = {
        name: mediaAsset.title,
        description: mediaAsset.description || `Exclusive content from BoyFanz creator`,
        image: `https://boyfanz.app/api/media/${mediaAssetId}/preview`, // Blurred preview
        external_url: `https://boyfanz.app/media/${mediaAssetId}`,
        attributes: [
          {
            trait_type: "Content Type",
            value: mediaAsset.mimeType.split('/')[0]
          },
          {
            trait_type: "Risk Score", 
            value: mediaAsset.riskScore
          },
          {
            trait_type: "Created",
            value: mediaAsset.createdAt.toISOString().split('T')[0]
          }
        ],
        // Content tags as traits
        ...(mediaAsset.contentTags?.map(tag => ({
          trait_type: "Tag",
          value: tag
        })) || [])
      };
      
      res.json(metadata);
    } catch (error: any) {
      console.error('NFT metadata error:', error);
      res.status(500).json({ error: 'Failed to fetch metadata' });
    }
  });
}

// AI-Powered Personalized Feed Routes
export function setupAIFeedRoutes(app: Express) {
  // Get personalized infinite feed with age verification
  app.get('/api/feed/personalized', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const { cursor, limit = '20', segment = 'for-you' } = req.query;
      
      const feedResult = await storage.getPersonalizedFeed(
        user.id,
        cursor as string,
        Math.min(parseInt(limit as string), 50)
      );
      
      res.json({
        success: true,
        ...feedResult,
        segment
      });
    } catch (error: any) {
      console.error('Personalized feed error:', error);
      res.status(500).json({ error: 'Failed to fetch personalized feed' });
    }
  });
  
  // Track analytics events for feed personalization
  app.post('/api/analytics/events', isAuthenticated, csrfProtection, async (req, res) => {
    try {
      const user = req.user!;
      
      const eventSchema = z.object({
        eventType: z.enum([
          'page_view', 'media_view', 'purchase', 'tip', 'subscription', 'message',
          'like', 'comment', 'share', 'upload', 'stream_start', 'stream_end',
          'nft_mint', 'nft_purchase', 'profile_view', 'search'
        ]),
        targetId: z.string().optional(),
        targetType: z.string().optional(),
        properties: z.record(z.any()).optional(),
        revenue: z.number().optional(),
        dwellTime: z.number().optional(), // seconds
      });
      
      const eventData = eventSchema.parse(req.body);
      
      const event = await storage.createAnalyticsEvent({
        ...eventData,
        userId: user.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        referrer: req.get('Referer') || ''
      });
      
      res.json({ success: true, eventId: event.id });
    } catch (error: any) {
      console.error('Analytics event error:', error);
      res.status(400).json({ error: error.message || 'Failed to record event' });
    }
  });
  
  // Update feed preferences
  app.put('/api/feed/preferences', isAuthenticated, csrfProtection, async (req, res) => {
    try {
      const user = req.user!;
      
      const preferencesSchema = z.object({
        personalizedEnabled: z.boolean().optional(),
        aiRecommendations: z.boolean().optional(),
        contentTags: z.array(z.string()).optional(),
        excludedTags: z.array(z.string()).optional(),
        showBlurredContent: z.boolean().optional(),
      });
      
      const preferences = preferencesSchema.parse(req.body);
      
      const updated = await storage.upsertFeedPreferences({
        userId: user.id,
        ...preferences
      });
      
      res.json({ success: true, preferences: updated });
    } catch (error: any) {
      console.error('Feed preferences error:', error);
      res.status(400).json({ error: error.message || 'Failed to update preferences' });
    }
  });
}

// Enhanced Age Verification Routes  
export function setupAgeVerificationRoutes(app: Express) {
  // Submit age verification
  app.post('/api/age-verification/submit', isAuthenticated, csrfProtection, async (req, res) => {
    try {
      const user = req.user!;
      
      const verificationSchema = z.object({
        method: z.enum(['id_document', 'credit_card', 'phone_verification', 'third_party']),
        verificationData: z.record(z.any()),
      });
      
      const { method, verificationData } = verificationSchema.parse(req.body);
      
      // Create age verification record
      const verification = await storage.createAgeVerification({
        userId: user.id,
        method,
        verificationData,
        isVerified: false, // Will be verified by admin/automated system
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || ''
      });
      
      res.json({
        success: true,
        verificationId: verification.id,
        message: 'Age verification submitted for review'
      });
    } catch (error: any) {
      console.error('Age verification error:', error);
      res.status(400).json({ error: error.message || 'Failed to submit verification' });
    }
  });
  
  // Check verification status
  app.get('/api/age-verification/status', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      
      const isVerified = await storage.isUserAgeVerified(user.id);
      const verifications = await storage.getUserAgeVerifications(user.id);
      
      res.json({
        isVerified,
        verifications: verifications.slice(0, 5) // Latest 5 attempts
      });
    } catch (error: any) {
      console.error('Age verification status error:', error);
      res.status(500).json({ error: 'Failed to check verification status' });
    }
  });
  
  // Admin: Approve/reject age verification
  app.post('/api/admin/age-verification/:verificationId/review', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { verificationId } = req.params;
      const { decision, reason } = req.body;
      
      if (!['approve', 'reject'].includes(decision)) {
        return res.status(400).json({ error: 'Invalid decision' });
      }
      
      // Update verification status
      await storage.updateAgeVerification(verificationId, {
        isVerified: decision === 'approve',
        verifiedAt: decision === 'approve' ? new Date() : null,
        reviewReason: reason
      });
      
      res.json({ success: true, decision });
    } catch (error: any) {
      console.error('Age verification review error:', error);
      res.status(500).json({ error: 'Failed to review verification' });
    }
  });
}

// Real-time Analytics Dashboard Routes
export function setupAnalyticsDashboardRoutes(app: Express) {
  // Create custom dashboard chart
  app.post('/api/dashboard/charts', requireCreator, csrfProtection, async (req, res) => {
    try {
      const user = req.user!;
      
      const chartSchema = z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        chartType: z.enum(['line', 'bar', 'pie', 'area', 'scatter']),
        vegaLiteSpec: z.record(z.any()), // Vega-Lite JSON specification
        dataSource: z.string(),
        filters: z.record(z.any()).optional(),
        refreshInterval: z.number().min(10).max(3600).optional(),
        isPublic: z.boolean().optional()
      });
      
      const chartData = chartSchema.parse(req.body);
      
      const chart = await storage.createDashboardChart({
        ...chartData,
        userId: user.id
      });
      
      res.json({ success: true, chart });
    } catch (error: any) {
      console.error('Dashboard chart error:', error);
      res.status(400).json({ error: error.message || 'Failed to create chart' });
    }
  });
  
  // Get user's dashboard charts
  app.get('/api/dashboard/charts', requireCreator, async (req, res) => {
    try {
      const user = req.user!;
      
      const charts = await storage.getUserDashboardCharts(user.id);
      res.json({ charts });
    } catch (error: any) {
      console.error('Dashboard charts error:', error);  
      res.status(500).json({ error: 'Failed to fetch charts' });
    }
  });
  
  // Get analytics data for charts
  app.get('/api/analytics/data', requireCreator, async (req, res) => {
    try {
      const user = req.user!;
      const { 
        eventType, 
        startDate, 
        endDate, 
        groupBy = 'day',
        limit = '100' 
      } = req.query;
      
      const events = await storage.getAnalyticsEvents({
        userId: user.id,
        eventType: eventType as string,
        startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate ? new Date(endDate as string) : new Date(),
        limit: parseInt(limit as string)
      });
      
      res.json({ events });
    } catch (error: any) {
      console.error('Analytics data error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
  });
}

// AI Analysis Routes
export function setupAIAnalysisRoutes(app: Express) {
  // AI-powered content analysis for creators
  app.post('/api/ai/analyze-performance', requireCreator, csrfProtection, async (req, res) => {
    try {
      const user = req.user!;
      const { timeframe = '7d', metric = 'engagement' } = req.body;
      
      // Get user's recent analytics
      const events = await storage.getAnalyticsEvents({
        userId: user.id,
        startDate: new Date(Date.now() - (timeframe === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000),
        limit: 1000
      });
      
      // Generate AI analysis using your OpenAI integration
      const analysis = await aiRecommendationEngine.analyzeCreatorPerformance(user.id, events, metric);
      
      res.json({
        success: true,
        analysis,
        timeframe,
        dataPoints: events.length
      });
    } catch (error: any) {
      console.error('AI analysis error:', error);
      res.status(500).json({ error: 'Failed to generate AI analysis' });
    }
  });
}