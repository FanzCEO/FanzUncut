// PWA Database Schema Extensions
// This file adds PWA-specific schemas to the existing BoyFanz database

import { sql } from 'drizzle-orm';
import {
  index,
  unique,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema";

// ===== PWA-SPECIFIC ENUMS =====

export const deviceTypeEnum = pgEnum("device_type", ["web", "ios", "android", "desktop"]);
export const platformEnum = pgEnum("platform", ["chrome", "firefox", "safari", "edge", "samsung", "other"]);
export const syncStatusEnum = pgEnum("sync_status", ["pending", "syncing", "completed", "failed", "cancelled"]);
export const installationSourceEnum = pgEnum("installation_source", ["manual", "prompt", "banner", "shortcut"]);

// ===== PWA DEVICE SUBSCRIPTIONS =====

export const pwaDeviceSubscriptions = pgTable("pwa_device_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceId: varchar("device_id").notNull(), // unique device identifier
  deviceType: deviceTypeEnum("device_type").notNull(),
  platform: platformEnum("platform").notNull(),
  userAgent: text("user_agent"),
  
  // Push Subscription Details
  pushSubscription: jsonb("push_subscription"), // complete push subscription object
  pushEndpoint: text("push_endpoint"),
  pushAuth: text("push_auth"),
  pushP256dh: text("push_p256dh"),
  
  // Device Metadata
  deviceName: varchar("device_name"),
  osVersion: varchar("os_version"),
  appVersion: varchar("app_version"),
  screenResolution: varchar("screen_resolution"),
  timezone: varchar("timezone"),
  language: varchar("language"),
  
  // Preferences
  notificationsEnabled: boolean("notifications_enabled").default(true),
  badgeEnabled: boolean("badge_enabled").default(true),
  soundEnabled: boolean("sound_enabled").default(true),
  vibrationEnabled: boolean("vibration_enabled").default(true),
  
  // Status
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used").defaultNow(),
  subscriptionExpiry: timestamp("subscription_expiry"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique().on(table.userId, table.deviceId),
  index("idx_pwa_devices_user").on(table.userId),
  index("idx_pwa_devices_active").on(table.isActive),
  index("idx_pwa_devices_endpoint").on(table.pushEndpoint),
]);

// ===== PWA PUSH NOTIFICATION QUEUE =====

export const pwaPushNotificationQueue = pgTable("pwa_push_notification_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceSubscriptionId: varchar("device_subscription_id").references(() => pwaDeviceSubscriptions.id, { onDelete: "cascade" }),
  
  // Notification Content
  title: varchar("title").notNull(),
  body: text("body").notNull(),
  icon: varchar("icon"),
  badge: varchar("badge"),
  image: varchar("image"),
  
  // Notification Behavior
  tag: varchar("tag"),
  requireInteraction: boolean("require_interaction").default(false),
  silent: boolean("silent").default(false),
  vibrate: text("vibrate").array(),
  
  // Actions and Data
  actions: jsonb("actions").default([]),
  data: jsonb("data").default({}),
  clickAction: varchar("click_action"),
  deepLink: varchar("deep_link"),
  
  // Scheduling
  scheduledFor: timestamp("scheduled_for"),
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  
  // Status
  status: syncStatusEnum("status").default("pending"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  clickedAt: timestamp("clicked_at"),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_pwa_push_queue_user").on(table.userId),
  index("idx_pwa_push_queue_device").on(table.deviceSubscriptionId),
  index("idx_pwa_push_queue_status").on(table.status),
  index("idx_pwa_push_queue_scheduled").on(table.scheduledFor),
]);

// ===== PWA OFFLINE SYNC QUEUE =====

export const pwaOfflineSyncQueue = pgTable("pwa_offline_sync_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceId: varchar("device_id").notNull(),
  
  // Action Details
  actionType: varchar("action_type").notNull(), // 'send_message', 'like_content', 'upload_media', etc.
  endpoint: varchar("endpoint").notNull(), // API endpoint to sync to
  method: varchar("method").notNull(), // HTTP method
  payload: jsonb("payload").notNull(), // request payload
  headers: jsonb("headers").default({}),
  
  // Metadata
  clientTimestamp: timestamp("client_timestamp").notNull(),
  priority: integer("priority").default(5), // 1-10, higher is more important
  
  // Retry Logic
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(5),
  nextRetryAt: timestamp("next_retry_at"),
  
  // Status
  status: syncStatusEnum("status").default("pending"),
  syncedAt: timestamp("synced_at"),
  errorMessage: text("error_message"),
  responseData: jsonb("response_data"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_pwa_sync_queue_user").on(table.userId),
  index("idx_pwa_sync_queue_device").on(table.deviceId),
  index("idx_pwa_sync_queue_status").on(table.status),
  index("idx_pwa_sync_queue_priority").on(table.priority),
  index("idx_pwa_sync_queue_retry").on(table.nextRetryAt),
]);

// ===== PWA INSTALLATION ANALYTICS =====

export const pwaInstallationAnalytics = pgTable("pwa_installation_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Installation Details
  installationSource: installationSourceEnum("installation_source").notNull(),
  deviceType: deviceTypeEnum("device_type").notNull(),
  platform: platformEnum("platform").notNull(),
  userAgent: text("user_agent"),
  
  // Device Info
  screenWidth: integer("screen_width"),
  screenHeight: integer("screen_height"),
  devicePixelRatio: integer("device_pixel_ratio"),
  timezone: varchar("timezone"),
  language: varchar("language"),
  
  // Session Context
  referrer: text("referrer"),
  landingPage: varchar("landing_page"),
  sessionDuration: integer("session_duration"), // seconds until install
  pageViews: integer("page_views"),
  
  // Installation Flow
  promptShown: boolean("prompt_shown").default(false),
  promptAccepted: boolean("prompt_accepted").default(false),
  promptDismissed: boolean("prompt_dismissed").default(false),
  timeToInstall: integer("time_to_install"), // ms from prompt to install
  
  // Geographic
  ipAddress: varchar("ip_address"),
  country: varchar("country"),
  city: varchar("city"),
  
  installedAt: timestamp("installed_at").defaultNow(),
}, (table) => [
  index("idx_pwa_install_user").on(table.userId),
  index("idx_pwa_install_source").on(table.installationSource),
  index("idx_pwa_install_platform").on(table.platform),
  index("idx_pwa_install_date").on(table.installedAt),
]);

// ===== PWA APP USAGE ANALYTICS =====

export const pwaUsageAnalytics = pgTable("pwa_usage_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  deviceId: varchar("device_id").notNull(),
  
  // Session Info
  sessionId: varchar("session_id").notNull(),
  sessionStart: timestamp("session_start").notNull(),
  sessionEnd: timestamp("session_end"),
  sessionDuration: integer("session_duration"), // seconds
  
  // Usage Metrics
  pageViews: integer("page_views").default(0),
  featuresUsed: text("features_used").array().default([]),
  offlineTime: integer("offline_time").default(0), // seconds spent offline
  
  // Performance Metrics
  loadTime: integer("load_time"), // initial load time in ms
  timeToInteractive: integer("time_to_interactive"), // TTI in ms
  cacheHitRate: integer("cache_hit_rate"), // percentage
  
  // Network Info
  connectionType: varchar("connection_type"), // 4g, 3g, wifi, etc.
  onlineStatus: boolean("online_status").default(true),
  
  // Engagement
  pushNotificationsReceived: integer("push_notifications_received").default(0),
  pushNotificationsClicked: integer("push_notifications_clicked").default(0),
  backgroundSyncs: integer("background_syncs").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pwa_usage_user").on(table.userId),
  index("idx_pwa_usage_device").on(table.deviceId),
  index("idx_pwa_usage_session").on(table.sessionId),
  index("idx_pwa_usage_date").on(table.createdAt),
]);

// ===== PWA FEATURE FLAGS =====

export const pwaFeatureFlags = pgTable("pwa_feature_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Feature Details
  name: varchar("name").notNull().unique(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(false),
  
  // Targeting
  targetPlatforms: text("target_platforms").array().default([]), // empty = all platforms
  targetDeviceTypes: text("target_device_types").array().default([]),
  targetUserIds: text("target_user_ids").array().default([]),
  
  // Configuration
  config: jsonb("config").default({}),
  rolloutPercentage: integer("rollout_percentage").default(0), // 0-100
  
  // Metadata
  createdBy: varchar("created_by").references(() => users.id),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_pwa_flags_enabled").on(table.isEnabled),
  index("idx_pwa_flags_rollout").on(table.rolloutPercentage),
]);

// ===== ZOD SCHEMAS FOR PWA TABLES =====

export const insertPwaDeviceSubscriptionSchema = createInsertSchema(pwaDeviceSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPwaDeviceSubscription = z.infer<typeof insertPwaDeviceSubscriptionSchema>;
export type SelectPwaDeviceSubscription = typeof pwaDeviceSubscriptions.$inferSelect;

export const insertPwaPushNotificationQueueSchema = createInsertSchema(pwaPushNotificationQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPwaPushNotificationQueue = z.infer<typeof insertPwaPushNotificationQueueSchema>;
export type SelectPwaPushNotificationQueue = typeof pwaPushNotificationQueue.$inferSelect;

export const insertPwaOfflineSyncQueueSchema = createInsertSchema(pwaOfflineSyncQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPwaOfflineSyncQueue = z.infer<typeof insertPwaOfflineSyncQueueSchema>;
export type SelectPwaOfflineSyncQueue = typeof pwaOfflineSyncQueue.$inferSelect;

export const insertPwaInstallationAnalyticsSchema = createInsertSchema(pwaInstallationAnalytics).omit({
  id: true,
  installedAt: true,
});
export type InsertPwaInstallationAnalytics = z.infer<typeof insertPwaInstallationAnalyticsSchema>;
export type SelectPwaInstallationAnalytics = typeof pwaInstallationAnalytics.$inferSelect;

export const insertPwaUsageAnalyticsSchema = createInsertSchema(pwaUsageAnalytics).omit({
  id: true,
  createdAt: true,
});
export type InsertPwaUsageAnalytics = z.infer<typeof insertPwaUsageAnalyticsSchema>;
export type SelectPwaUsageAnalytics = typeof pwaUsageAnalytics.$inferSelect;

export const insertPwaFeatureFlagSchema = createInsertSchema(pwaFeatureFlags).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPwaFeatureFlag = z.infer<typeof insertPwaFeatureFlagSchema>;
export type SelectPwaFeatureFlag = typeof pwaFeatureFlags.$inferSelect;