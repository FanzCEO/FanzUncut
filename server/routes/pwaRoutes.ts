// BoyFanz PWA Backend API Routes
// Handles push subscriptions, offline sync, installation analytics, and PWA features

import express, { type Request, Response } from "express";
import { z } from "zod";
import webpush from "web-push";
import { db } from "../db";
import { 
  pwaDeviceSubscriptions, 
  pwaPushNotificationQueue, 
  pwaOfflineSyncQueue,
  pwaInstallationAnalytics,
  pwaUsageAnalytics,
  insertPwaDeviceSubscriptionSchema,
  insertPwaPushNotificationQueueSchema,
  insertPwaOfflineSyncQueueSchema,
  insertPwaInstallationAnalyticsSchema,
  insertPwaUsageAnalyticsSchema
} from "../../shared/pwaPatch";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { isAuthenticated } from "../middleware/auth";

const router = express.Router();

// VAPID Keys Configuration (In production, store these securely)
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@boyfanz.com';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// Function to validate VAPID key format
function isValidVapidKey(key: string | undefined, expectedLength: number): boolean {
  if (!key) return false;
  try {
    // Basic base64 validation and length check
    const decoded = Buffer.from(key, 'base64');
    return decoded.length === expectedLength;
  } catch {
    return false;
  }
}

// Configuration state
let isPushNotificationEnabled = false;
let vapidConfigurationError: string | null = null;

// Configure webpush only if valid keys are available
try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    // Validate VAPID keys before attempting to use them
    const isPublicKeyValid = isValidVapidKey(VAPID_PUBLIC_KEY, 65); // 65 bytes for public key
    const isPrivateKeyValid = isValidVapidKey(VAPID_PRIVATE_KEY, 32); // 32 bytes for private key

    if (isPublicKeyValid && isPrivateKeyValid) {
      try {
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
        isPushNotificationEnabled = true;
        console.log('✅ VAPID keys configured successfully - Push notifications enabled');
      } catch (error) {
        vapidConfigurationError = `VAPID configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.warn('⚠️', vapidConfigurationError);
        isPushNotificationEnabled = false;
      }
    } else {
      vapidConfigurationError = 'Invalid VAPID key format - Public key must be 65 bytes, private key must be 32 bytes when base64 decoded';
      console.warn('⚠️', vapidConfigurationError);
      isPushNotificationEnabled = false;
    }
  } else {
    vapidConfigurationError = 'VAPID keys not configured - Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables to enable push notifications';
    console.log('ℹ️ VAPID keys not configured - Push notifications disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables to enable.');
    isPushNotificationEnabled = false;
  }
} catch (error) {
  vapidConfigurationError = `Failed to configure push notifications: ${error instanceof Error ? error.message : 'Unknown error'}`;
  console.warn('⚠️ Push notification configuration failed:', vapidConfigurationError);
  isPushNotificationEnabled = false;
}

// ===== PUSH SUBSCRIPTION MANAGEMENT =====

// Get VAPID public key
router.get('/vapid-public-key', (req: Request, res: Response) => {
  if (!isPushNotificationEnabled) {
    return res.status(503).json({ 
      error: 'Push notifications not configured', 
      message: vapidConfigurationError || 'VAPID keys not available' 
    });
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
router.post('/push-subscription', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const subscriptionData = insertPwaDeviceSubscriptionSchema.parse({
      userId: req.user!.id,
      deviceId: req.body.deviceId || `device_${Date.now()}`,
      deviceType: req.body.deviceType || 'web',
      platform: req.body.platform || 'chrome',
      userAgent: req.headers['user-agent'],
      pushSubscription: req.body.subscription,
      pushEndpoint: req.body.subscription?.endpoint,
      pushAuth: req.body.subscription?.keys?.auth,
      pushP256dh: req.body.subscription?.keys?.p256dh,
      deviceName: req.body.deviceName,
      osVersion: req.body.osVersion,
      appVersion: req.body.appVersion,
      screenResolution: req.body.screenResolution,
      timezone: req.body.timezone,
      language: req.body.language,
      notificationsEnabled: true,
      badgeEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      isActive: true,
      lastUsed: new Date(),
    });

    // Check if subscription already exists
    const existingSubscription = await db
      .select()
      .from(pwaDeviceSubscriptions)
      .where(and(
        eq(pwaDeviceSubscriptions.userId, req.user!.id),
        eq(pwaDeviceSubscriptions.deviceId, subscriptionData.deviceId)
      ))
      .limit(1);

    let subscription;
    if (existingSubscription.length > 0) {
      // Update existing subscription
      subscription = await db
        .update(pwaDeviceSubscriptions)
        .set({
          ...subscriptionData,
          updatedAt: new Date()
        })
        .where(eq(pwaDeviceSubscriptions.id, existingSubscription[0].id))
        .returning();
    } else {
      // Create new subscription
      subscription = await db
        .insert(pwaDeviceSubscriptions)
        .values(subscriptionData)
        .returning();
    }

    console.log('✅ Push subscription saved:', subscription[0].id);
    res.status(201).json({ 
      success: true, 
      subscriptionId: subscription[0].id 
    });

  } catch (error) {
    console.error('❌ Push subscription error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Subscription failed' 
    });
  }
});

// Unsubscribe from push notifications
router.delete('/push-subscription', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.body;

    await db
      .update(pwaDeviceSubscriptions)
      .set({ 
        isActive: false, 
        updatedAt: new Date() 
      })
      .where(and(
        eq(pwaDeviceSubscriptions.userId, req.user!.id),
        eq(pwaDeviceSubscriptions.deviceId, deviceId)
      ));

    console.log('✅ Push subscription deactivated');
    res.json({ success: true });

  } catch (error) {
    console.error('❌ Push unsubscription error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Unsubscription failed' 
    });
  }
});

// Update push notification preferences
router.put('/push-preferences', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { deviceId, preferences } = req.body;

    await db
      .update(pwaDeviceSubscriptions)
      .set({
        notificationsEnabled: preferences.notifications,
        badgeEnabled: preferences.badge,
        soundEnabled: preferences.sound,
        vibrationEnabled: preferences.vibration,
        updatedAt: new Date()
      })
      .where(and(
        eq(pwaDeviceSubscriptions.userId, req.user!.id),
        eq(pwaDeviceSubscriptions.deviceId, deviceId)
      ));

    res.json({ success: true });

  } catch (error) {
    console.error('❌ Preferences update error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Preferences update failed' 
    });
  }
});

// ===== PUSH NOTIFICATION SENDING =====

// Send push notification to user
router.post('/send-push-notification', isAuthenticated, async (req: Request, res: Response) => {
  // Check if push notifications are enabled
  if (!isPushNotificationEnabled) {
    return res.status(503).json({
      success: false,
      error: 'Push notifications not configured',
      message: vapidConfigurationError || 'VAPID keys not available'
    });
  }

  try {
    const notificationData = insertPwaPushNotificationQueueSchema.parse({
      userId: req.body.userId || req.user!.id,
      title: req.body.title,
      body: req.body.body,
      icon: req.body.icon || '/pwa-icons/icon-192x192.png',
      badge: req.body.badge || '/pwa-icons/badge-72x72.png',
      image: req.body.image,
      tag: req.body.tag,
      requireInteraction: req.body.requireInteraction || false,
      silent: req.body.silent || false,
      vibrate: req.body.vibrate || [100, 50, 100],
      actions: req.body.actions || [],
      data: req.body.data || {},
      clickAction: req.body.clickAction,
      deepLink: req.body.deepLink,
      scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : new Date(),
    });

    // Queue the notification
    const queuedNotification = await db
      .insert(pwaPushNotificationQueue)
      .values(notificationData)
      .returning();

    // Get active device subscriptions for the user
    const deviceSubscriptions = await db
      .select()
      .from(pwaDeviceSubscriptions)
      .where(and(
        eq(pwaDeviceSubscriptions.userId, notificationData.userId),
        eq(pwaDeviceSubscriptions.isActive, true),
        eq(pwaDeviceSubscriptions.notificationsEnabled, true)
      ));

    let successCount = 0;
    let failureCount = 0;

    // Send to each device
    for (const device of deviceSubscriptions) {
      if (!device.pushSubscription) continue;

      try {
        const pushSubscription = device.pushSubscription as any;
        const payload = JSON.stringify({
          title: notificationData.title,
          body: notificationData.body,
          icon: notificationData.icon,
          badge: notificationData.badge,
          image: notificationData.image,
          tag: notificationData.tag,
          requireInteraction: notificationData.requireInteraction,
          actions: notificationData.actions,
          data: notificationData.data
        });

        // Only send if push notifications are enabled
        if (isPushNotificationEnabled) {
          await webpush.sendNotification(pushSubscription, payload);
        } else {
          throw new Error('Push notifications disabled');
        }
        successCount++;

        // Update notification status
        await db
          .update(pwaPushNotificationQueue)
          .set({
            status: 'completed',
            sentAt: new Date(),
            deliveredAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(pwaPushNotificationQueue.id, queuedNotification[0].id));

      } catch (pushError) {
        console.error('❌ Push send error:', pushError);
        failureCount++;

        // Mark device subscription as potentially invalid
        if ((pushError as any).statusCode === 410) {
          await db
            .update(pwaDeviceSubscriptions)
            .set({ isActive: false })
            .where(eq(pwaDeviceSubscriptions.id, device.id));
        }
      }
    }

    console.log(`📬 Push notification sent: ${successCount} success, ${failureCount} failed`);
    res.json({ 
      success: true, 
      notificationId: queuedNotification[0].id,
      sent: successCount,
      failed: failureCount
    });

  } catch (error) {
    console.error('❌ Push notification error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Notification failed' 
    });
  }
});

// ===== OFFLINE SYNC MANAGEMENT =====

// Queue offline action for sync
router.post('/sync-queue', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const syncData = insertPwaOfflineSyncQueueSchema.parse({
      userId: req.user!.id,
      deviceId: req.body.deviceId,
      actionType: req.body.actionType,
      endpoint: req.body.endpoint,
      method: req.body.method,
      payload: req.body.payload,
      headers: req.body.headers || {},
      clientTimestamp: new Date(req.body.clientTimestamp),
      priority: req.body.priority || 5,
      maxRetries: req.body.maxRetries || 5,
    });

    const queuedAction = await db
      .insert(pwaOfflineSyncQueue)
      .values(syncData)
      .returning();

    res.status(201).json({ 
      success: true, 
      actionId: queuedAction[0].id 
    });

  } catch (error) {
    console.error('❌ Sync queue error:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Queue failed' 
    });
  }
});

// Get pending sync actions
router.get('/sync-queue', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.query;

    const pendingActions = await db
      .select()
      .from(pwaOfflineSyncQueue)
      .where(and(
        eq(pwaOfflineSyncQueue.userId, req.user!.id),
        eq(pwaOfflineSyncQueue.deviceId, deviceId as string),
        eq(pwaOfflineSyncQueue.status, 'pending')
      ))
      .orderBy(desc(pwaOfflineSyncQueue.priority), asc(pwaOfflineSyncQueue.createdAt));

    res.json({ 
      success: true, 
      actions: pendingActions 
    });

  } catch (error) {
    console.error('❌ Sync queue fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Queue fetch failed' 
    });
  }
});

// Mark sync action as completed
router.put('/sync-queue/:actionId/complete', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { actionId } = req.params;
    const { responseData } = req.body;

    await db
      .update(pwaOfflineSyncQueue)
      .set({
        status: 'completed',
        syncedAt: new Date(),
        responseData,
        updatedAt: new Date()
      })
      .where(and(
        eq(pwaOfflineSyncQueue.id, actionId),
        eq(pwaOfflineSyncQueue.userId, req.user!.id)
      ));

    res.json({ success: true });

  } catch (error) {
    console.error('❌ Sync complete error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Sync completion failed' 
    });
  }
});

// ===== INSTALLATION ANALYTICS =====

// Track PWA installation
router.post('/installation', async (req: Request, res: Response) => {
  try {
    const analyticsData = insertPwaInstallationAnalyticsSchema.parse({
      userId: req.user?.id || null,
      installationSource: req.body.method || 'manual',
      deviceType: req.body.deviceType || 'web',
      platform: req.body.platform || 'chrome',
      userAgent: req.headers['user-agent'],
      screenWidth: req.body.screenWidth,
      screenHeight: req.body.screenHeight,
      devicePixelRatio: req.body.devicePixelRatio,
      timezone: req.body.timezone,
      language: req.body.language,
      referrer: req.body.referrer,
      landingPage: req.body.landingPage,
      sessionDuration: req.body.sessionDuration,
      pageViews: req.body.pageViews,
      promptShown: req.body.promptShown || false,
      promptAccepted: req.body.promptAccepted || false,
      promptDismissed: req.body.promptDismissed || false,
      timeToInstall: req.body.timeToInstall,
      ipAddress: req.ip,
      country: req.body.country,
      city: req.body.city,
    });

    await db
      .insert(pwaInstallationAnalytics)
      .values(analyticsData);

    console.log('📊 PWA installation tracked');
    res.json({ success: true });

  } catch (error) {
    console.error('❌ Installation tracking error:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Tracking failed' 
    });
  }
});

// ===== USAGE ANALYTICS =====

// Track PWA usage session
router.post('/usage-analytics', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const usageData = insertPwaUsageAnalyticsSchema.parse({
      userId: req.user!.id,
      deviceId: req.body.deviceId,
      sessionId: req.body.sessionId,
      sessionStart: new Date(req.body.sessionStart),
      sessionEnd: req.body.sessionEnd ? new Date(req.body.sessionEnd) : null,
      sessionDuration: req.body.sessionDuration,
      pageViews: req.body.pageViews,
      featuresUsed: req.body.featuresUsed || [],
      offlineTime: req.body.offlineTime || 0,
      loadTime: req.body.loadTime,
      timeToInteractive: req.body.timeToInteractive,
      cacheHitRate: req.body.cacheHitRate,
      connectionType: req.body.connectionType,
      onlineStatus: req.body.onlineStatus || true,
      pushNotificationsReceived: req.body.pushNotificationsReceived || 0,
      pushNotificationsClicked: req.body.pushNotificationsClicked || 0,
      backgroundSyncs: req.body.backgroundSyncs || 0,
    });

    await db
      .insert(pwaUsageAnalytics)
      .values(usageData);

    res.json({ success: true });

  } catch (error) {
    console.error('❌ Usage analytics error:', error);
    res.status(400).json({ 
      success: false, 
      error: 'Analytics failed' 
    });
  }
});

// ===== PWA STATUS AND HEALTH =====

// Get PWA status for user
router.get('/status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const deviceSubscriptions = await db
      .select()
      .from(pwaDeviceSubscriptions)
      .where(and(
        eq(pwaDeviceSubscriptions.userId, req.user!.id),
        eq(pwaDeviceSubscriptions.isActive, true)
      ));

    const pendingSync = await db
      .select({ count: sql<number>`count(*)` })
      .from(pwaOfflineSyncQueue)
      .where(and(
        eq(pwaOfflineSyncQueue.userId, req.user!.id),
        eq(pwaOfflineSyncQueue.status, 'pending')
      ));

    res.json({
      success: true,
      subscriptions: deviceSubscriptions.length,
      pushEnabled: isPushNotificationEnabled && deviceSubscriptions.some(d => d.notificationsEnabled),
      pushNotificationConfigured: isPushNotificationEnabled,
      pendingSyncActions: pendingSync[0].count,
      vapidPublicKey: isPushNotificationEnabled ? VAPID_PUBLIC_KEY : null,
      configurationError: vapidConfigurationError
    });

  } catch (error) {
    console.error('❌ PWA status error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Status fetch failed' 
    });
  }
});

export default router;