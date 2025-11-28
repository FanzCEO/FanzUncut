// Mobile API Routes for ClubCentral
// Complete mobile backend API with push notifications, real-time sync, and mobile-specific features

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { WebSocket } from 'ws';
import {
  MobileBackendService,
  MobileConfigSchema,
  MobileConfig,
  MobileUser,
  UserPreferences,
  RegisteredDevice,
  PushNotification
} from '../services/mobileBackendService.js';
import { isAuthenticated, requireAdmin } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';

const router = Router();

// Initialize mobile backend service with production configuration
const defaultMobileConfig: MobileConfig = {
  appName: 'ClubCentral',
  appVersion: '1.0.0',
  bundleId: 'com.fanz.clubcentral',
  pushNotifications: {
    enabled: true,
    apns: {
      keyId: process.env.APNS_KEY_ID || '',
      teamId: process.env.APNS_TEAM_ID || '',
      bundleId: 'com.fanz.clubcentral',
      production: process.env.NODE_ENV === 'production',
      keyPath: process.env.APNS_KEY_PATH
    },
    fcm: {
      projectId: process.env.FCM_PROJECT_ID || '',
      serviceAccountPath: process.env.FCM_SERVICE_ACCOUNT_PATH
    }
  },
  realTimeSync: {
    enabled: true,
    syncInterval: 30, // 30 seconds
    conflictResolution: 'server_wins'
  },
  deviceManagement: {
    maxDevicesPerUser: 5,
    deviceVerification: true
  },
  offlineSupport: {
    enabled: true,
    cacheDuration: 24, // 24 hours
    syncOnReconnect: true
  }
};

const mobileService = new MobileBackendService(defaultMobileConfig);

// Validation schemas
const DeviceRegistrationSchema = z.object({
  deviceId: z.string(),
  deviceType: z.enum(['ios', 'android', 'web']),
  deviceName: z.string(),
  pushToken: z.string().optional(),
  appVersion: z.string(),
  osVersion: z.string()
});

const PushNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(200),
  data: z.record(z.any()).optional(),
  badge: z.number().optional(),
  sound: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().url().optional(),
  actionUrl: z.string().optional(),
  scheduledFor: z.string().datetime().optional()
});

const BulkNotificationSchema = z.object({
  userIds: z.array(z.string()).min(1).max(1000),
  notification: PushNotificationSchema
});

const PreferencesUpdateSchema = z.object({
  notifications: z.object({
    push: z.boolean().optional(),
    email: z.boolean().optional(),
    marketing: z.boolean().optional(),
    newContent: z.boolean().optional(),
    messages: z.boolean().optional(),
    liveStreams: z.boolean().optional()
  }).optional(),
  privacy: z.object({
    showOnlineStatus: z.boolean().optional(),
    allowDirectMessages: z.boolean().optional(),
    showInSearch: z.boolean().optional()
  }).optional(),
  contentFilters: z.object({
    explicitContent: z.boolean().optional(),
    categories: z.array(z.string()).optional()
  }).optional(),
  language: z.string().optional(),
  timezone: z.string().optional()
});

const SyncDataSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  action: z.enum(['create', 'update', 'delete']),
  data: z.any(),
  deviceId: z.string().optional()
});

// Apply authentication to most mobile routes
const authenticatedRoutes = Router();
authenticatedRoutes.use(isAuthenticated);

// Public routes (no auth required)

// GET /api/mobile/app-info
// Get mobile app information and configuration
router.get('/app-info', async (req: Request, res: Response) => {
  try {
    const appInfo = await mobileService.getMobileAppInfo();
    
    res.json({
      ...appInfo,
      serverTime: new Date(),
      apiVersion: '1.0.0',
      endpoints: {
        auth: '/api/mobile/auth',
        sync: '/api/mobile/sync',
        notifications: '/api/mobile/notifications',
        websocket: process.env.WEBSOCKET_URL || 'ws://localhost:3001'
      }
    });
  } catch (error) {
    console.error('App info error:', error);
    res.status(500).json({
      error: 'Failed to get app info',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/mobile/health
// Mobile service health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await mobileService.getServiceHealth();
    res.json(health);
  } catch (error) {
    console.error('Mobile health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    });
  }
});

// Authenticated routes

// GET /api/mobile/user
// Get current mobile user profile
authenticatedRoutes.get('/user', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Invalid authorization header' });
    }
    
    const token = authHeader.substring(7);
    const user = await mobileService.authenticateMobileUser(token);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Mobile user fetch error:', error);
    res.status(500).json({
      error: 'Failed to get user profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/mobile/device/register
// Register a mobile device
authenticatedRoutes.post('/device/register', validateRequest(DeviceRegistrationSchema), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const deviceInfo = req.body;
    const device = await mobileService.deviceService.registerDevice(userId, deviceInfo);
    
    res.json({
      success: true,
      device,
      message: 'Device registered successfully'
    });
  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({
      error: 'Failed to register device',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/mobile/device/:deviceId
// Unregister a mobile device
authenticatedRoutes.delete('/device/:deviceId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { deviceId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const success = await mobileService.deviceService.unregisterDevice(userId, deviceId);
    
    if (success) {
      res.json({ success: true, message: 'Device unregistered successfully' });
    } else {
      res.status(404).json({ error: 'Device not found' });
    }
  } catch (error) {
    console.error('Device unregistration error:', error);
    res.status(500).json({
      error: 'Failed to unregister device',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/mobile/devices
// Get user's registered devices
authenticatedRoutes.get('/devices', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const devices = await mobileService.deviceService.getUserDevices(userId);
    
    res.json({
      devices,
      total: devices.length,
      maxDevices: defaultMobileConfig.deviceManagement.maxDevicesPerUser
    });
  } catch (error) {
    console.error('Device list error:', error);
    res.status(500).json({
      error: 'Failed to get devices',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/mobile/device/:deviceId/activity
// Update device activity
authenticatedRoutes.put('/device/:deviceId/activity', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { deviceId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    await mobileService.deviceService.updateDeviceActivity(userId, deviceId);
    
    res.json({ success: true, message: 'Device activity updated' });
  } catch (error) {
    console.error('Device activity update error:', error);
    res.status(500).json({
      error: 'Failed to update device activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/mobile/notifications/send
// Send push notification to current user
authenticatedRoutes.post('/notifications/send', validateRequest(PushNotificationSchema), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const notificationData = req.body;
    const notification = await mobileService.pushService.sendPushNotification(userId, notificationData);
    
    res.json({
      success: notification.sent,
      notification,
      deliveryStatus: notification.deliveryStatus
    });
  } catch (error) {
    console.error('Push notification error:', error);
    res.status(500).json({
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/mobile/notifications/bulk
// Send bulk notifications (admin/creator only)
authenticatedRoutes.post('/notifications/bulk', validateRequest(BulkNotificationSchema), async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    
    // Check if user has permission to send bulk notifications
    if (!currentUser || !['admin', 'creator'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for bulk notifications' });
    }
    
    const { userIds, notification } = req.body;
    const notifications = await mobileService.pushService.sendBulkNotifications(userIds, notification);
    
    const successCount = notifications.filter(n => n.sent).length;
    const failureCount = notifications.length - successCount;
    
    res.json({
      success: successCount > 0,
      results: {
        total: notifications.length,
        successful: successCount,
        failed: failureCount
      },
      notifications: notifications.slice(0, 10) // Return first 10 for debugging
    });
  } catch (error) {
    console.error('Bulk notification error:', error);
    res.status(500).json({
      error: 'Failed to send bulk notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/mobile/notifications/history
// Get notification history for current user
authenticatedRoutes.get('/notifications/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const notifications = await mobileService.getNotificationHistory(userId, limit);
    
    res.json({
      notifications,
      total: notifications.length,
      hasMore: notifications.length === limit
    });
  } catch (error) {
    console.error('Notification history error:', error);
    res.status(500).json({
      error: 'Failed to get notification history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/mobile/preferences
// Update user preferences
authenticatedRoutes.put('/preferences', validateRequest(PreferencesUpdateSchema), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const preferences = req.body;
    const updatedPreferences = await mobileService.updateUserPreferences(userId, preferences);
    
    res.json({
      success: true,
      preferences: updatedPreferences,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({
      error: 'Failed to update preferences',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/mobile/content/personalized
// Get personalized content feed
authenticatedRoutes.get('/content/personalized', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const content = await mobileService.getPersonalizedContent(userId, limit);
    
    res.json({
      content,
      pagination: {
        limit,
        offset,
        total: content.length,
        hasMore: content.length === limit
      }
    });
  } catch (error) {
    console.error('Personalized content error:', error);
    res.status(500).json({
      error: 'Failed to get personalized content',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/mobile/assets/optimized
// Get optimized assets for mobile device
authenticatedRoutes.get('/assets/optimized', async (req: Request, res: Response) => {
  try {
    const deviceType = req.query.deviceType as 'ios' | 'android';
    const screenDensity = req.query.screenDensity as string;
    
    if (!deviceType || !['ios', 'android'].includes(deviceType)) {
      return res.status(400).json({ error: 'Invalid or missing deviceType parameter' });
    }
    
    const assets = await mobileService.getOptimizedAssets(deviceType, screenDensity);
    
    res.json({
      assets,
      deviceType,
      screenDensity: screenDensity || 'default',
      cacheExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
  } catch (error) {
    console.error('Optimized assets error:', error);
    res.status(500).json({
      error: 'Failed to get optimized assets',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/mobile/sync/data
// Sync data from mobile client
authenticatedRoutes.post('/sync/data', validateRequest(SyncDataSchema), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const syncData = { ...req.body, userId };
    mobileService.syncService.queueSyncData(syncData);
    
    res.json({
      success: true,
      message: 'Data queued for sync',
      syncId: `sync_${Date.now()}`,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Sync data error:', error);
    res.status(500).json({
      error: 'Failed to sync data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/mobile/sync/status
// Get sync status for current user
authenticatedRoutes.get('/sync/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    // Get sync queue status
    const queuedItems = mobileService.syncService['syncQueue'].get(userId)?.length || 0;
    const isConnected = mobileService.syncService['websocketClients'].has(userId);
    
    res.json({
      userId,
      queuedItems,
      isConnected,
      lastSync: new Date(), // Mock - would track actual last sync
      syncEnabled: defaultMobileConfig.realTimeSync.enabled,
      conflictResolution: defaultMobileConfig.realTimeSync.conflictResolution
    });
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({
      error: 'Failed to get sync status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// WebSocket endpoint for real-time sync
// This would typically be handled by a separate WebSocket server
// but we include the logic here for completeness
router.ws = (path: string, handler: (ws: WebSocket, req: Request) => void) => {
  // Mock WebSocket handler - in production this would be implemented with ws library
  console.log(`📱 WebSocket endpoint registered: ${path}`);
};

// Template notification endpoints
// POST /api/mobile/notifications/welcome
authenticatedRoutes.post('/notifications/welcome', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    const notification = await mobileService.pushService.sendWelcomeNotification(userId);
    
    res.json({
      success: notification.sent,
      notification,
      type: 'welcome'
    });
  } catch (error) {
    console.error('Welcome notification error:', error);
    res.status(500).json({
      error: 'Failed to send welcome notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/mobile/notifications/content
authenticatedRoutes.post('/notifications/content', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { creatorName, contentType } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    if (!creatorName || !contentType) {
      return res.status(400).json({ error: 'creatorName and contentType are required' });
    }
    
    const notification = await mobileService.pushService.sendContentNotification(userId, creatorName, contentType);
    
    res.json({
      success: notification.sent,
      notification,
      type: 'content'
    });
  } catch (error) {
    console.error('Content notification error:', error);
    res.status(500).json({
      error: 'Failed to send content notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/mobile/notifications/message
authenticatedRoutes.post('/notifications/message', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { senderName, preview } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    if (!senderName || !preview) {
      return res.status(400).json({ error: 'senderName and preview are required' });
    }
    
    const notification = await mobileService.pushService.sendMessageNotification(userId, senderName, preview);
    
    res.json({
      success: notification.sent,
      notification,
      type: 'message'
    });
  } catch (error) {
    console.error('Message notification error:', error);
    res.status(500).json({
      error: 'Failed to send message notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/mobile/notifications/livestream
authenticatedRoutes.post('/notifications/livestream', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { creatorName } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }
    
    if (!creatorName) {
      return res.status(400).json({ error: 'creatorName is required' });
    }
    
    const notification = await mobileService.pushService.sendLiveStreamNotification(userId, creatorName);
    
    res.json({
      success: notification.sent,
      notification,
      type: 'livestream'
    });
  } catch (error) {
    console.error('Livestream notification error:', error);
    res.status(500).json({
      error: 'Failed to send livestream notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Device analytics (admin only)
authenticatedRoutes.get('/analytics/devices', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const analytics = await mobileService.deviceService.getDeviceAnalytics();
    
    res.json({
      analytics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Device analytics error:', error);
    res.status(500).json({
      error: 'Failed to get device analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mount authenticated routes
router.use(authenticatedRoutes);

// Error handling middleware for mobile routes
router.use((error: any, req: Request, res: Response, next: any) => {
  console.error('Mobile API error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.message
    });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Authentication failed',
      details: error.message
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Contact support'
  });
});

export default router;