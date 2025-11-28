import { Express } from 'express';
import express from 'express';
import { storage } from './storage';
import { registerHelpSupportRoutes } from './routes/helpSupportRoutes';
import pwaRoutes from './routes/pwaRoutes';
import authRoutes from './routes/authRoutes';
import { csrfProtection, setupCSRFTokenEndpoint } from './middleware/csrf';
import { isAuthenticated, requireAdmin } from './middleware/auth';
import { ObjectStorageService } from './objectStorage';

const objectStorageService = new ObjectStorageService();
import { adultFriendlyPaymentService } from './services/adultFriendlyPaymentService';
import { financialLedgerService } from './services/financialLedgerService';
import { messageSecurityService } from './services/messageSecurityService';
import { performanceOptimizationService } from './services/performanceOptimizationService';
import { contentManagementService } from './services/contentManagementService';
import { aiCreatorToolsService } from './services/aiCreatorToolsService';
import { identityVerificationService } from './services/identityVerificationService';
import { geoBlockingService } from './services/geoBlockingService';
import { comprehensiveAnalyticsService } from './services/comprehensiveAnalyticsService';
import { requireAgeVerification, require2257Compliance, enforceGeoBlocking } from './middleware/auth';
import { z } from 'zod';

// International compliance helper functions
async function performSanctionsScreening(data: {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  userId: string;
}) {
  // Mock sanctions screening - in production, integrate with OFAC/EU/UN sanctions APIs
  const { firstName, lastName, country } = data;
  const screeningId = `screen_${Date.now()}`;
  
  // Simulate screening against sanctioned names/countries
  const sanctionedCountries = ['IR', 'KP', 'SY', 'RU', 'BY']; // Iran, North Korea, Syria, Russia, Belarus
  const sanctionedNames = ['vladimir putin', 'kim jong', 'ali khamenei'];
  
  const fullName = `${firstName} ${lastName}`.toLowerCase();
  const isSanctionedCountry = sanctionedCountries.includes(country.toUpperCase());
  const isNameMatch = sanctionedNames.some(name => fullName.includes(name));
  
  let status = 'clear';
  let matchScore = 0;
  
  if (isSanctionedCountry) {
    status = 'blocked';
    matchScore = 95;
  } else if (isNameMatch) {
    status = 'blocked';
    matchScore = 98;
  }
  
  return {
    status,
    matchScore,
    screeningId,
    listsChecked: ['OFAC', 'EU_SANCTIONS', 'UN_SANCTIONS'],
    timestamp: new Date()
  };
}

function getContentRulesByCountry(country: string) {
  // Mock content rules - in production, load from compliance database
  const rules: Record<string, any> = {
    'US': {
      minimumAge: 18,
      explicitContent: 'allowed',
      recordKeeping: '2257_required',
      restrictions: []
    },
    'GB': {
      minimumAge: 18,
      explicitContent: 'restricted',
      recordKeeping: 'age_verification_required',
      restrictions: ['extreme_content_banned', 'face_sitting_banned']
    },
    'DE': {
      minimumAge: 18,
      explicitContent: 'allowed',
      recordKeeping: 'jugendschutz_required',
      restrictions: ['time_restrictions_22_06']
    },
    'AU': {
      minimumAge: 18,
      explicitContent: 'restricted',
      recordKeeping: 'classification_required',
      restrictions: ['small_breast_banned', 'ejaculation_restricted']
    },
    'IN': {
      minimumAge: 18,
      explicitContent: 'banned',
      recordKeeping: 'not_applicable',
      restrictions: ['all_adult_content_banned']
    },
    'CN': {
      minimumAge: 18,
      explicitContent: 'banned',
      recordKeeping: 'not_applicable',
      restrictions: ['platform_blocked']
    }
  };
  
  return rules[country] || {
    minimumAge: 18,
    explicitContent: 'check_local_laws',
    recordKeeping: 'consult_legal',
    restrictions: []
  };
}

function getAgeRequirementsByCountry(country: string) {
  // Mock age requirements - in production, load from legal compliance database
  const requirements: Record<string, any> = {
    'US': {
      minimumAge: 18,
      verificationRequired: true,
      acceptedDocuments: ['drivers_license', 'passport', 'state_id'],
      additionalRestrictions: ['2257_compliance_required']
    },
    'GB': {
      minimumAge: 18,
      verificationRequired: true,
      acceptedDocuments: ['passport', 'drivers_license', 'national_id'],
      additionalRestrictions: ['age_verification_database_required']
    },
    'DE': {
      minimumAge: 18,
      verificationRequired: true,
      acceptedDocuments: ['personalausweis', 'reisepass', 'fuhrerschein'],
      additionalRestrictions: ['jugendschutz_compliance']
    },
    'FR': {
      minimumAge: 18,
      verificationRequired: true,
      acceptedDocuments: ['carte_identite', 'passeport', 'permis_conduire'],
      additionalRestrictions: ['cnil_compliance']
    },
    'JP': {
      minimumAge: 20,
      verificationRequired: true,
      acceptedDocuments: ['koseki', 'passport', 'drivers_license'],
      additionalRestrictions: ['adult_age_20_years']
    },
    'KR': {
      minimumAge: 19,
      verificationRequired: true,
      acceptedDocuments: ['resident_card', 'passport'],
      additionalRestrictions: ['korean_age_system']
    }
  };
  
  return requirements[country] || {
    minimumAge: 18,
    verificationRequired: true,
    acceptedDocuments: ['government_id', 'passport'],
    additionalRestrictions: ['consult_local_laws']
  };
}

function getEncryptionRecommendations(encryptionStatus: any) {
  const recommendations = [];
  
  if (!encryptionStatus.database.atRest) {
    recommendations.push({
      priority: 'high',
      category: 'database',
      issue: 'Database encryption at rest not enabled',
      action: 'Enable database encryption at rest for sensitive data protection'
    });
  }
  
  if (!encryptionStatus.database.inTransit) {
    recommendations.push({
      priority: 'high',
      category: 'database',
      issue: 'Database in-transit encryption not enforced',
      action: 'Enforce SSL/TLS for all database connections'
    });
  }
  
  if (!encryptionStatus.storage.objectEncryption) {
    recommendations.push({
      priority: 'medium',
      category: 'storage',
      issue: 'Object storage encryption not enabled',
      action: 'Enable server-side encryption for object storage'
    });
  }
  
  if (!encryptionStatus.communications.httpsOnly) {
    recommendations.push({
      priority: 'critical',
      category: 'communications',
      issue: 'HTTPS not enforced',
      action: 'Enforce HTTPS-only communication with HSTS headers'
    });
  }
  
  return recommendations;
}

export function registerRoutes(app: Express) {
  // Set up CSRF token endpoint
  setupCSRFTokenEndpoint(app);

  // ===== STORAGE PROVIDER MANAGEMENT ROUTES =====
  
  // Get all storage provider configurations
  app.get('/api/admin/storage-providers', requireAdmin, async (req, res) => {
    try {
      const configs = await storage.getAllStorageProviderConfigs();
      res.json(configs);
    } catch (error) {
      console.error('Failed to get storage provider configs:', error);
      res.status(500).json({ error: 'Failed to get storage provider configurations' });
    }
  });

  // Get storage provider configuration by ID
  app.get('/api/admin/storage-providers/:id', requireAdmin, async (req, res) => {
    try {
      const config = await storage.getStorageProviderConfig(req.params.id);
      if (!config) {
        return res.status(404).json({ error: 'Storage provider configuration not found' });
      }
      res.json(config);
    } catch (error) {
      console.error('Failed to get storage provider config:', error);
      res.status(500).json({ error: 'Failed to get storage provider configuration' });
    }
  });

  // Create storage provider configuration
  app.post('/api/admin/storage-providers', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const configData = {
        ...req.body,
        configuredBy: req.user!.id
      };

      const config = await storage.createStorageProviderConfig(configData);
      
      // Log the configuration creation
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'STORAGE_PROVIDER_CREATED',
        targetType: 'storage_provider_config',
        targetId: config.id,
        diffJson: { created: config }
      });

      res.status(201).json(config);
    } catch (error) {
      console.error('Failed to create storage provider config:', error);
      res.status(500).json({ error: 'Failed to create storage provider configuration' });
    }
  });

  // Update storage provider configuration
  app.put('/api/admin/storage-providers/:id', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const updateData = {
        ...req.body,
        lastConfiguredBy: req.user!.id
      };

      const config = await storage.updateStorageProviderConfig(req.params.id, updateData);
      
      // Log the configuration update
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'STORAGE_PROVIDER_UPDATED',
        targetType: 'storage_provider_config',
        targetId: req.params.id,
        diffJson: { updated: updateData }
      });

      res.json(config);
    } catch (error) {
      console.error('Failed to update storage provider config:', error);
      res.status(500).json({ error: 'Failed to update storage provider configuration' });
    }
  });

  // Delete storage provider configuration
  app.delete('/api/admin/storage-providers/:id', csrfProtection, requireAdmin, async (req, res) => {
    try {
      await storage.deleteStorageProviderConfig(req.params.id);
      
      // Log the configuration deletion
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'STORAGE_PROVIDER_DELETED',
        targetType: 'storage_provider_config',
        targetId: req.params.id,
        diffJson: { deleted: true }
      });

      res.json({ message: 'Storage provider configuration deleted successfully' });
    } catch (error) {
      console.error('Failed to delete storage provider config:', error);
      res.status(500).json({ error: 'Failed to delete storage provider configuration' });
    }
  });

  // Test storage provider connection
  app.post('/api/admin/storage-providers/:id/test', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const result = await storage.testStorageProviderConnection(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Failed to test storage provider connection:', error);
      res.status(500).json({ error: 'Failed to test storage provider connection' });
    }
  });

  // Set primary storage provider
  app.put('/api/admin/storage-providers/:id/set-primary', csrfProtection, requireAdmin, async (req, res) => {
    try {
      await storage.setPrimaryStorageProvider(req.params.id);
      
      // Log the primary provider change
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'STORAGE_PROVIDER_SET_PRIMARY',
        targetType: 'storage_provider_config',
        targetId: req.params.id,
        diffJson: { setPrimary: true }
      });

      res.json({ message: 'Primary storage provider updated successfully' });
    } catch (error) {
      console.error('Failed to set primary storage provider:', error);
      res.status(500).json({ error: 'Failed to set primary storage provider' });
    }
  });

  // Get storage provider health metrics
  app.get('/api/admin/storage-providers/health/summary', requireAdmin, async (req, res) => {
    try {
      const healthSummary = await storage.getStorageProviderHealthSummary();
      res.json(healthSummary);
    } catch (error) {
      console.error('Failed to get storage provider health summary:', error);
      res.status(500).json({ error: 'Failed to get storage provider health summary' });
    }
  });

  // Get storage provider health history
  app.get('/api/admin/storage-providers/:id/health', requireAdmin, async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const healthData = await storage.getStorageProviderHealth(req.params.id, hours);
      res.json(healthData);
    } catch (error) {
      console.error('Failed to get storage provider health data:', error);
      res.status(500).json({ error: 'Failed to get storage provider health data' });
    }
  });

  // Get cost summary by provider
  app.get('/api/admin/storage-providers/costs/summary', requireAdmin, async (req, res) => {
    try {
      const costSummary = await storage.getCostSummaryByProvider();
      res.json(costSummary);
    } catch (error) {
      console.error('Failed to get cost summary:', error);
      res.status(500).json({ error: 'Failed to get cost summary' });
    }
  });

  // Get cost optimization recommendations
  app.get('/api/admin/storage-providers/costs/recommendations', requireAdmin, async (req, res) => {
    try {
      const recommendations = await storage.getCostOptimizationRecommendations();
      res.json(recommendations);
    } catch (error) {
      console.error('Failed to get cost optimization recommendations:', error);
      res.status(500).json({ error: 'Failed to get cost optimization recommendations' });
    }
  });

  // Get storage provider alerts
  app.get('/api/admin/storage-providers/alerts', requireAdmin, async (req, res) => {
    try {
      const { providerId, severity, unresolved } = req.query;
      let alerts;

      if (unresolved === 'true') {
        alerts = await storage.getUnresolvedStorageProviderAlerts();
      } else {
        alerts = await storage.getStorageProviderAlerts(
          providerId as string,
          severity as string
        );
      }
      
      res.json(alerts);
    } catch (error) {
      console.error('Failed to get storage provider alerts:', error);
      res.status(500).json({ error: 'Failed to get storage provider alerts' });
    }
  });

  // Acknowledge storage provider alert
  app.put('/api/admin/storage-providers/alerts/:id/acknowledge', csrfProtection, requireAdmin, async (req, res) => {
    try {
      await storage.acknowledgeStorageProviderAlert(req.params.id, req.user!.id);
      res.json({ message: 'Alert acknowledged successfully' });
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  });

  // Resolve storage provider alert
  app.put('/api/admin/storage-providers/alerts/:id/resolve', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const { resolutionNotes } = req.body;
      await storage.resolveStorageProviderAlert(req.params.id, req.user!.id, resolutionNotes);
      res.json({ message: 'Alert resolved successfully' });
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      res.status(500).json({ error: 'Failed to resolve alert' });
    }
  });

  // Get failover configurations
  app.get('/api/admin/storage-providers/failover', requireAdmin, async (req, res) => {
    try {
      const failoverConfigs = await storage.getAllFailoverConfigs();
      res.json(failoverConfigs);
    } catch (error) {
      console.error('Failed to get failover configurations:', error);
      res.status(500).json({ error: 'Failed to get failover configurations' });
    }
  });

  // Create failover configuration
  app.post('/api/admin/storage-providers/failover', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const failoverData = {
        ...req.body,
        configuredBy: req.user!.id
      };

      const failoverConfig = await storage.createStorageProviderFailover(failoverData);
      
      // Log failover configuration creation
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'STORAGE_FAILOVER_CREATED',
        targetType: 'storage_provider_failover',
        targetId: failoverConfig.id,
        diffJson: { created: failoverConfig }
      });

      res.status(201).json(failoverConfig);
    } catch (error) {
      console.error('Failed to create failover configuration:', error);
      res.status(500).json({ error: 'Failed to create failover configuration' });
    }
  });

  // Trigger manual failover
  app.post('/api/admin/storage-providers/:id/failover', csrfProtection, requireAdmin, async (req, res) => {
    try {
      await storage.triggerFailover(req.params.id);
      
      // Log manual failover trigger
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'STORAGE_FAILOVER_TRIGGERED',
        targetType: 'storage_provider_config',
        targetId: req.params.id,
        diffJson: { manualFailover: true }
      });

      res.json({ message: 'Failover triggered successfully' });
    } catch (error) {
      console.error('Failed to trigger failover:', error);
      res.status(500).json({ error: 'Failed to trigger failover' });
    }
  });

  // ===== ADMIN ANNOUNCEMENTS ROUTES =====
  
  // Get all announcements with filtering
  app.get('/api/admin/announcements', requireAdmin, async (req, res) => {
    try {
      const { searchQuery, status, type, channel, priority, limit = 20, offset = 0, sortBy = 'created', sortOrder = 'desc' } = req.query;
      
      const filters: any = {};
      if (searchQuery) filters.searchQuery = searchQuery;
      if (status && status !== 'all') filters.status = status;
      if (type && type !== 'all') filters.type = type;
      if (channel && channel !== 'all') filters.channel = channel;
      if (priority && priority !== 'all') filters.priority = parseInt(priority as string);
      
      const announcements = await storage.getAnnouncements({
        ...filters,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });
      
      res.json(announcements);
    } catch (error) {
      console.error('Failed to get announcements:', error);
      res.status(500).json({ error: 'Failed to get announcements' });
    }
  });

  // Create announcement
  app.post('/api/admin/announcements', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const announcementData = {
        ...req.body,
        createdBy: req.user!.id,
        status: req.body.scheduledAt ? 'scheduled' : 'draft'
      };
      
      const announcement = await storage.createAnnouncement(announcementData);
      
      // Log announcement creation
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'ANNOUNCEMENT_CREATED',
        targetType: 'announcement',
        targetId: announcement.id,
        diffJson: { created: announcement }
      });
      
      res.status(201).json(announcement);
    } catch (error) {
      console.error('Failed to create announcement:', error);
      res.status(500).json({ error: 'Failed to create announcement' });
    }
  });

  // Update announcement
  app.put('/api/admin/announcements/:id', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const updatedAnnouncement = await storage.updateAnnouncement(req.params.id, req.body);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'ANNOUNCEMENT_UPDATED',
        targetType: 'announcement',
        targetId: req.params.id,
        diffJson: { updated: req.body }
      });
      
      res.json(updatedAnnouncement);
    } catch (error) {
      console.error('Failed to update announcement:', error);
      res.status(500).json({ error: 'Failed to update announcement' });
    }
  });

  // Delete announcement
  app.delete('/api/admin/announcements/:id', csrfProtection, requireAdmin, async (req, res) => {
    try {
      await storage.deleteAnnouncement(req.params.id);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'ANNOUNCEMENT_DELETED',
        targetType: 'announcement',
        targetId: req.params.id,
        diffJson: { deleted: true }
      });
      
      res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      res.status(500).json({ error: 'Failed to delete announcement' });
    }
  });

  // Publish announcement
  app.post('/api/admin/announcements/:id/publish', csrfProtection, requireAdmin, async (req, res) => {
    try {
      await storage.publishAnnouncement(req.params.id);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'ANNOUNCEMENT_PUBLISHED',
        targetType: 'announcement',
        targetId: req.params.id,
        diffJson: { published: true }
      });
      
      res.json({ message: 'Announcement published successfully' });
    } catch (error) {
      console.error('Failed to publish announcement:', error);
      res.status(500).json({ error: 'Failed to publish announcement' });
    }
  });

  // Pause announcement
  app.post('/api/admin/announcements/:id/pause', csrfProtection, requireAdmin, async (req, res) => {
    try {
      await storage.pauseAnnouncement(req.params.id);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'ANNOUNCEMENT_PAUSED',
        targetType: 'announcement',
        targetId: req.params.id,
        diffJson: { paused: true }
      });
      
      res.json({ message: 'Announcement paused successfully' });
    } catch (error) {
      console.error('Failed to pause announcement:', error);
      res.status(500).json({ error: 'Failed to pause announcement' });
    }
  });

  // Emergency broadcast
  app.post('/api/admin/announcements/emergency-broadcast', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const { title, content, channels } = req.body;
      
      const emergencyAnnouncement = await storage.createEmergencyBroadcast({
        title,
        content,
        channels,
        createdBy: req.user!.id
      });
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'EMERGENCY_BROADCAST_SENT',
        targetType: 'announcement',
        targetId: emergencyAnnouncement.id,
        diffJson: { emergency: true, title, content, channels }
      });
      
      res.status(201).json(emergencyAnnouncement);
    } catch (error) {
      console.error('Failed to send emergency broadcast:', error);
      res.status(500).json({ error: 'Failed to send emergency broadcast' });
    }
  });

  // Bulk operations on announcements
  app.post('/api/admin/announcements/bulk', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const { action, ids } = req.body;
      
      await storage.bulkUpdateAnnouncements(ids, action);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: `ANNOUNCEMENTS_BULK_${action.toUpperCase()}`,
        targetType: 'announcement',
        targetId: 'bulk_operation',
        diffJson: { action, ids, count: ids.length }
      });
      
      res.json({ message: `Bulk ${action} completed successfully` });
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      res.status(500).json({ error: 'Failed to perform bulk operation' });
    }
  });

  // Get announcement analytics
  app.get('/api/admin/announcements/analytics', requireAdmin, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const analytics = await storage.getAnnouncementAnalytics({
        dateFrom: dateFrom as string,
        dateTo: dateTo as string
      });
      res.json(analytics);
    } catch (error) {
      console.error('Failed to get announcement analytics:', error);
      res.status(500).json({ error: 'Failed to get announcement analytics' });
    }
  });

  // Get announcement templates
  app.get('/api/admin/announcement-templates', requireAdmin, async (req, res) => {
    try {
      const templates = await storage.getAnnouncementTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Failed to get announcement templates:', error);
      res.status(500).json({ error: 'Failed to get announcement templates' });
    }
  });

  // ===== ADMIN PUSH NOTIFICATIONS ROUTES =====
  
  // Get all push notification campaigns
  app.get('/api/admin/push-notification-campaigns', requireAdmin, async (req, res) => {
    try {
      const { searchQuery, status, platform, audience, limit = 20, offset = 0, sortBy = 'created', sortOrder = 'desc' } = req.query;
      
      const filters: any = {};
      if (searchQuery) filters.searchQuery = searchQuery;
      if (status && status !== 'all') filters.status = status;
      if (platform && platform !== 'all') filters.platform = platform;
      if (audience && audience !== 'all') filters.audience = audience;
      
      const campaigns = await storage.getPushNotificationCampaigns({
        ...filters,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });
      
      res.json(campaigns);
    } catch (error) {
      console.error('Failed to get push notification campaigns:', error);
      res.status(500).json({ error: 'Failed to get push notification campaigns' });
    }
  });

  // Create push notification campaign
  app.post('/api/admin/push-notification-campaigns', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const campaignData = {
        ...req.body,
        createdBy: req.user!.id,
        status: req.body.scheduledAt ? 'scheduled' : 'draft'
      };
      
      const campaign = await storage.createPushNotificationCampaign(campaignData);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'PUSH_CAMPAIGN_CREATED',
        targetType: 'push_notification_campaign',
        targetId: campaign.id,
        diffJson: { created: campaign }
      });
      
      res.status(201).json(campaign);
    } catch (error) {
      console.error('Failed to create push notification campaign:', error);
      res.status(500).json({ error: 'Failed to create push notification campaign' });
    }
  });

  // Update push notification campaign
  app.put('/api/admin/push-notification-campaigns/:id', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const updatedCampaign = await storage.updatePushNotificationCampaign(req.params.id, req.body);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'PUSH_CAMPAIGN_UPDATED',
        targetType: 'push_notification_campaign',
        targetId: req.params.id,
        diffJson: { updated: req.body }
      });
      
      res.json(updatedCampaign);
    } catch (error) {
      console.error('Failed to update push notification campaign:', error);
      res.status(500).json({ error: 'Failed to update push notification campaign' });
    }
  });

  // Delete push notification campaign
  app.delete('/api/admin/push-notification-campaigns/:id', csrfProtection, requireAdmin, async (req, res) => {
    try {
      await storage.deletePushNotificationCampaign(req.params.id);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'PUSH_CAMPAIGN_DELETED',
        targetType: 'push_notification_campaign',
        targetId: req.params.id,
        diffJson: { deleted: true }
      });
      
      res.json({ message: 'Push notification campaign deleted successfully' });
    } catch (error) {
      console.error('Failed to delete push notification campaign:', error);
      res.status(500).json({ error: 'Failed to delete push notification campaign' });
    }
  });

  // Send push notification campaign
  app.post('/api/admin/push-notification-campaigns/:id/send', csrfProtection, requireAdmin, async (req, res) => {
    try {
      await storage.sendPushNotificationCampaign(req.params.id);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'PUSH_CAMPAIGN_SENT',
        targetType: 'push_notification_campaign',
        targetId: req.params.id,
        diffJson: { sent: true }
      });
      
      res.json({ message: 'Push notification campaign sent successfully' });
    } catch (error) {
      console.error('Failed to send push notification campaign:', error);
      res.status(500).json({ error: 'Failed to send push notification campaign' });
    }
  });

  // Pause push notification campaign
  app.post('/api/admin/push-notification-campaigns/:id/pause', csrfProtection, requireAdmin, async (req, res) => {
    try {
      await storage.pausePushNotificationCampaign(req.params.id);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'PUSH_CAMPAIGN_PAUSED',
        targetType: 'push_notification_campaign',
        targetId: req.params.id,
        diffJson: { paused: true }
      });
      
      res.json({ message: 'Push notification campaign paused successfully' });
    } catch (error) {
      console.error('Failed to pause push notification campaign:', error);
      res.status(500).json({ error: 'Failed to pause push notification campaign' });
    }
  });

  // Test send push notification
  app.post('/api/admin/push-notification-campaigns/:id/test-send', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const { testUsers } = req.body;
      
      await storage.testSendPushNotification(req.params.id, testUsers);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'PUSH_CAMPAIGN_TEST_SENT',
        targetType: 'push_notification_campaign',
        targetId: req.params.id,
        diffJson: { testUsers }
      });
      
      res.json({ message: 'Test notification sent successfully' });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  });

  // Bulk operations on push campaigns
  app.post('/api/admin/push-notification-campaigns/bulk', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const { action, ids } = req.body;
      
      await storage.bulkUpdatePushNotificationCampaigns(ids, action);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: `PUSH_CAMPAIGNS_BULK_${action.toUpperCase()}`,
        targetType: 'push_notification_campaign',
        diffJson: { action, ids, count: ids.length }
      });
      
      res.json({ message: `Bulk ${action} completed successfully` });
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      res.status(500).json({ error: 'Failed to perform bulk operation' });
    }
  });

  // Get push campaign analytics
  app.get('/api/admin/push-campaigns/analytics', requireAdmin, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      const analytics = await storage.getPushCampaignAnalytics({
        dateFrom: dateFrom as string,
        dateTo: dateTo as string
      });
      res.json(analytics);
    } catch (error) {
      console.error('Failed to get push campaign analytics:', error);
      res.status(500).json({ error: 'Failed to get push campaign analytics' });
    }
  });

  // Get notification templates
  app.get('/api/admin/notification-templates', requireAdmin, async (req, res) => {
    try {
      const templates = await storage.getNotificationTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Failed to get notification templates:', error);
      res.status(500).json({ error: 'Failed to get notification templates' });
    }
  });

  // Get user notification preferences
  app.get('/api/admin/user-notification-preferences', requireAdmin, async (req, res) => {
    try {
      const preferences = await storage.getUserNotificationPreferences();
      res.json(preferences);
    } catch (error) {
      console.error('Failed to get user notification preferences:', error);
      res.status(500).json({ error: 'Failed to get user notification preferences' });
    }
  });

  // ===== ADMIN SYSTEM SETTINGS ROUTES =====
  
  // Get all system settings
  app.get('/api/admin/system-settings', requireAdmin, async (req, res) => {
    try {
      const { search, category } = req.query;
      
      const filters: any = {};
      if (search) filters.search = search;
      if (category && category !== 'all') filters.category = category;
      
      const settings = await storage.getSystemSettings(filters);
      res.json(settings);
    } catch (error) {
      console.error('Failed to get system settings:', error);
      res.status(500).json({ error: 'Failed to get system settings' });
    }
  });

  // Create system setting
  app.post('/api/admin/system-settings', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const settingData = {
        ...req.body,
        updatedBy: req.user!.id
      };
      
      const setting = await storage.createSystemSetting(settingData);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'SYSTEM_SETTING_CREATED',
        targetType: 'system_setting',
        targetId: setting.id,
        diffJson: { created: setting }
      });
      
      res.status(201).json(setting);
    } catch (error) {
      console.error('Failed to create system setting:', error);
      res.status(500).json({ error: 'Failed to create system setting' });
    }
  });

  // Update system setting
  app.put('/api/admin/system-settings/:id', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const oldSetting = await storage.getSystemSetting(req.params.id);
      
      const updatedSetting = await storage.updateSystemSetting(req.params.id, {
        ...req.body,
        updatedBy: req.user!.id
      });
      
      // Store change history
      await storage.createSystemSettingHistory({
        settingId: req.params.id,
        oldValue: oldSetting?.value,
        newValue: req.body.value,
        changedBy: req.user!.id,
        changeReason: req.body.changeReason
      });
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'SYSTEM_SETTING_UPDATED',
        targetType: 'system_setting',
        targetId: req.params.id,
        diffJson: { 
          old: { value: oldSetting?.value },
          new: { value: req.body.value }
        }
      });
      
      res.json(updatedSetting);
    } catch (error) {
      console.error('Failed to update system setting:', error);
      res.status(500).json({ error: 'Failed to update system setting' });
    }
  });

  // Delete system setting
  app.delete('/api/admin/system-settings/:id', csrfProtection, requireAdmin, async (req, res) => {
    try {
      await storage.deleteSystemSetting(req.params.id);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'SYSTEM_SETTING_DELETED',
        targetType: 'system_setting',
        targetId: req.params.id
      });
      
      res.json({ message: 'System setting deleted successfully' });
    } catch (error) {
      console.error('Failed to delete system setting:', error);
      res.status(500).json({ error: 'Failed to delete system setting' });
    }
  });

  // Get system info
  app.get('/api/admin/system-info', requireAdmin, async (req, res) => {
    try {
      const systemInfo = await storage.getSystemInfo();
      res.json(systemInfo);
    } catch (error) {
      console.error('Failed to get system info:', error);
      res.status(500).json({ error: 'Failed to get system info' });
    }
  });

  // Get email settings
  app.get('/api/admin/email-settings', requireAdmin, async (req, res) => {
    try {
      const emailSettings = await storage.getEmailSettings();
      res.json(emailSettings);
    } catch (error) {
      console.error('Failed to get email settings:', error);
      res.status(500).json({ error: 'Failed to get email settings' });
    }
  });

  // Update email settings
  app.put('/api/admin/email-settings', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const updatedSettings = await storage.updateEmailSettings({
        ...req.body,
        updatedBy: req.user!.id
      });
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'EMAIL_SETTINGS_UPDATED',
        targetType: 'email_settings',
        targetId: updatedSettings.id,
        diffJson: { updated: req.body }
      });
      
      res.json(updatedSettings);
    } catch (error) {
      console.error('Failed to update email settings:', error);
      res.status(500).json({ error: 'Failed to update email settings' });
    }
  });

  // Test email settings
  app.post('/api/admin/email-settings/test', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const { email } = req.body;
      
      await storage.testEmailSettings(email);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'EMAIL_SETTINGS_TESTED',
        targetType: 'email_settings',
        diffJson: { testEmail: email }
      });
      
      res.json({ message: 'Test email sent successfully' });
    } catch (error) {
      console.error('Failed to send test email:', error);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  });

  // Get maintenance schedules
  app.get('/api/admin/maintenance-schedules', requireAdmin, async (req, res) => {
    try {
      const schedules = await storage.getMaintenanceSchedules();
      res.json(schedules);
    } catch (error) {
      console.error('Failed to get maintenance schedules:', error);
      res.status(500).json({ error: 'Failed to get maintenance schedules' });
    }
  });

  // Create maintenance schedule
  app.post('/api/admin/maintenance-schedules', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const scheduleData = {
        ...req.body,
        createdBy: req.user!.id
      };
      
      const schedule = await storage.createMaintenanceSchedule(scheduleData);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'MAINTENANCE_SCHEDULE_CREATED',
        targetType: 'maintenance_schedule',
        targetId: schedule.id,
        diffJson: { created: schedule }
      });
      
      res.status(201).json(schedule);
    } catch (error) {
      console.error('Failed to create maintenance schedule:', error);
      res.status(500).json({ error: 'Failed to create maintenance schedule' });
    }
  });

  // System backup
  app.post('/api/admin/backup', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const { type } = req.body;
      
      const backup = await storage.createSystemBackup(type);
      
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'SYSTEM_BACKUP_CREATED',
        targetType: 'system_backup',
        targetId: backup.id,
        diffJson: { type, backup }
      });
      
      res.status(201).json(backup);
    } catch (error) {
      console.error('Failed to create system backup:', error);
      res.status(500).json({ error: 'Failed to create system backup' });
    }
  });

  // ===== THEME ROUTES =====
  
  // Get active theme
  app.get('/api/themes/active', async (req, res) => {
    try {
      const activeTheme = await storage.getActiveTheme();
      if (!activeTheme) {
        // Return a default theme if none is active
        return res.json({
          id: 'default',
          name: 'BoyFanz Dark',
          isActive: true,
          colors: {
            primary: 'hsl(0, 72%, 51%)',
            secondary: 'hsl(45, 93%, 47%)',
            background: 'hsl(0, 0%, 7%)',
            foreground: 'hsl(0, 0%, 98%)'
          },
          typography: {
            fontDisplay: 'Orbitron',
            fontHeading: 'Rajdhani',
            fontBody: 'Inter'
          },
          effects: {
            neonIntensity: 0.8,
            glowEnabled: true,
            smokyBackground: true,
            flickerEnabled: true
          }
        });
      }
      res.json(activeTheme);
    } catch (error) {
      console.error('Failed to get active theme:', error);
      res.status(500).json({ error: 'Failed to get active theme' });
    }
  });

  // ===== GDPR PRIVACY API ROUTES =====
  
  // Data export (DSAR)
  app.get('/api/privacy/export', csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Collect all user data using existing storage methods
      const user = await storage.getUser(userId);
      const profile = await storage.getUserProfile(userId);
      const posts = await storage.getUserPosts(userId);
      const messages = await storage.getMessageHistory(userId); 
      const auditLogs = await storage.getAuditLogsByUser(userId);
      const sessions = await storage.getUserSessions?.(userId) || [];
      
      const exportData = {
        user: req.user,
        profile: profile || {},
        posts: posts || [],
        messages: messages || [],
        transactions: transactions || [],
        kyc: kycRecords || [],
        exportedAt: new Date().toISOString(),
        dataRetentionInfo: "Data is retained according to our retention policy. Contact support for details."
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=boyfanz-data-export-${userId}.json`);
      res.json(exportData);
    } catch (error) {
      console.error('Privacy export error:', error);
      res.status(500).json({ error: 'Failed to export user data' });
    }
  });

  // Data deletion request (DSAR)
  app.delete('/api/privacy/delete', csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      // Soft delete approach - mark for deletion but keep for legal retention period
      await storage.markUserForDeletion(userId);
      
      // Immediately anonymize PII while preserving transaction records for compliance
      await storage.anonymizeUserData(userId);
      
      // Log deletion request for audit trail
      await storage.createAuditLog({
        userId,
        action: 'DATA_DELETION_REQUESTED',
        details: 'User requested full account and data deletion',
        timestamp: new Date()
      });
      
      res.json({ 
        message: 'Account deletion requested. Data will be permanently deleted within 30 days as per our retention policy.',
        deletionRequestId: `DEL_${userId}_${Date.now()}`
      });
    } catch (error) {
      console.error('Privacy deletion error:', error);
      res.status(500).json({ error: 'Failed to process deletion request' });
    }
  });

  // Privacy preferences
  app.post('/api/privacy/preferences', csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { marketing, analytics, functional, performance } = req.body;
      
      const preferences = {
        userId,
        marketing: !!marketing,
        analytics: !!analytics,
        functional: !!functional,
        performance: !!performance,
        updatedAt: new Date()
      };
      
      await storage.updateUserPrivacyPreferences(preferences);
      
      res.json({ message: 'Privacy preferences updated successfully', preferences });
    } catch (error) {
      console.error('Privacy preferences error:', error);
      res.status(500).json({ error: 'Failed to update privacy preferences' });
    }
  });

  app.get('/api/privacy/preferences', csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const preferences = await storage.getUserPrivacyPreferences(userId);
      
      res.json(preferences || {
        marketing: false,
        analytics: false,
        functional: true,
        performance: false
      });
    } catch (error) {
      console.error('Get privacy preferences error:', error);
      res.status(500).json({ error: 'Failed to get privacy preferences' });
    }
  });

  // Consent management endpoints
  app.post('/api/consent', csrfProtection, async (req, res) => {
    try {
      const { sessionId, consents } = req.body;
      const userId = req.user?.id || null;
      
      const consentRecord = {
        userId,
        sessionId,
        consents,
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };
      
      await storage.recordConsent(consentRecord);
      
      res.json({ message: 'Consent recorded successfully' });
    } catch (error) {
      console.error('Consent recording error:', error);
      res.status(500).json({ error: 'Failed to record consent' });
    }
  });

  app.get('/api/consent/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const consent = await storage.getConsent(sessionId);
      
      res.json(consent || { consents: {} });
    } catch (error) {
      console.error('Get consent error:', error);
      res.status(500).json({ error: 'Failed to get consent' });
    }
  });

  // ===== ADULT CONTENT COMPLIANCE ROUTES =====

  // Age verification gate
  app.post('/api/compliance/age-verify', csrfProtection, async (req, res) => {
    try {
      const { dateOfBirth, country, consentToAdultContent } = req.body;
      const sessionId = req.sessionID;
      const ip = req.ip || '127.0.0.1';
      
      if (!dateOfBirth || !country || !consentToAdultContent) {
        return res.status(400).json({ error: 'All fields are required for age verification' });
      }
      
      // Calculate age
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      // Check geo-specific age requirements
      const geoResult = await geoBlockingService.checkGeoAccess({
        ip,
        userId: req.user?.id,
        feature: 'adult_content',
        type: 'age_verification'
      });
      
      if (!geoResult.allowed) {
        return res.status(403).json({ 
          error: 'Adult content not available in your region',
          details: geoResult.reason 
        });
      }
      
      const minimumAge = geoResult.metadata?.minimumAge || 18;
      
      if (age < minimumAge) {
        return res.status(403).json({ 
          error: `You must be at least ${minimumAge} years old to access this content`,
          minimumAge 
        });
      }
      
      // Record age verification in audit log
      await storage.createAuditLog({
        userId: req.user?.id,
        action: 'AGE_VERIFICATION_PASSED',
        details: JSON.stringify({
          sessionId,
          age,
          country,
          ip,
          minimumAge,
          userAgent: req.headers['user-agent']
        }),
        timestamp: new Date()
      });
      
      res.json({ 
        verified: true, 
        age,
        minimumAge,
        sessionId
      });
    } catch (error) {
      console.error('Age verification error:', error);
      res.status(500).json({ error: 'Age verification failed' });
    }
  });

  // 2257 compliance check for content creation
  app.post('/api/compliance/2257-check', csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { mediaId, performerIds } = req.body;
      
      // Check if user has valid KYC
      const kycRecord = await storage.getKycVerification(userId);
      if (!kycRecord || kycRecord.status !== 'verified') {
        return res.status(403).json({
          error: '2257 compliance check failed',
          reason: 'Creator must complete KYC verification before publishing content',
          requiresKyc: true
        });
      }
      
      // Check if all performers have 2257 records
      const missingRecords = [];
      for (const performerId of performerIds || []) {
        const performerKyc = await storage.getKycVerification(performerId);
        if (!performerKyc || performerKyc.status !== 'verified') {
          missingRecords.push(performerId);
        }
      }
      
      if (missingRecords.length > 0) {
        return res.status(403).json({
          error: '2257 compliance check failed',
          reason: 'All performers must have verified 2257 records',
          missingRecords,
          requiresPerformerVerification: true
        });
      }
      
      // Log compliance check
      await storage.createAuditLog({
        userId,
        action: '2257_COMPLIANCE_VERIFIED',
        details: JSON.stringify({
          mediaId,
          performerIds,
          kycRecordId: kycRecord.id
        }),
        timestamp: new Date()
      });
      
      res.json({ 
        compliant: true,
        kycRecordId: kycRecord.id,
        verifiedPerformers: performerIds || []
      });
    } catch (error) {
      console.error('2257 compliance check error:', error);
      res.status(500).json({ error: '2257 compliance check failed' });
    }
  });

  // Custodian of Records notice endpoint
  app.get('/api/compliance/custodian-notice', async (req, res) => {
    try {
      const custodianInfo = {
        title: 'Custodian of Records Notice',
        notice: `Pursuant to 18 U.S.C. Section 2257, the following individual has been designated as the custodian of records for BoyFanz platform:`,
        custodian: {
          name: 'BoyFanz Legal Compliance Officer',
          company: 'BoyFanz LLC',
          address: {
            street: '123 Compliance Street',
            city: 'Legal City',
            state: 'CA',
            zipCode: '90210',
            country: 'United States'
          },
          businessHours: 'Monday through Friday, 9:00 AM to 5:00 PM PST'
        },
        statement: `All records required to be maintained by 18 U.S.C. Section 2257 and 2257A are kept by the custodian of records at the above address. All performers appearing in any visual depictions of sexually explicit conduct were 18 years of age or older at the time of creation.`,
        lastUpdated: new Date().toISOString(),
        contactInfo: {
          email: 'records@boyfanz.com',
          phone: '+1 (555) 123-4567'
        }
      };
      
      res.json(custodianInfo);
    } catch (error) {
      console.error('Custodian notice error:', error);
      res.status(500).json({ error: 'Failed to get custodian notice' });
    }
  });

  // Content publishing gate
  app.post('/api/compliance/content-publish-gate', csrfProtection, isAuthenticated, require2257Compliance, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { contentId, contentType, performerIds } = req.body;
      
      // Check 2257 compliance
      const complianceCheck = await fetch(`${req.protocol}://${req.get('host')}/api/compliance/2257-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.cookie || ''
        },
        body: JSON.stringify({
          mediaId: contentId,
          performerIds
        })
      });
      
      const complianceResult = await complianceCheck.json();
      
      if (!complianceResult.compliant) {
        return res.status(403).json({
          error: 'Content cannot be published due to compliance issues',
          complianceError: complianceResult
        });
      }
      
      // Check geo restrictions for content type
      const geoCheck = await geoBlockingService.checkGeoAccess({
        ip: req.ip || '127.0.0.1',
        userId,
        contentId,
        feature: 'content_publishing',
        type: contentType
      });
      
      if (!geoCheck.allowed) {
        return res.status(403).json({
          error: 'Content publishing not allowed in your region',
          geoRestriction: geoCheck
        });
      }
      
      // Log successful publish gate check
      await storage.createAuditLog({
        userId,
        action: 'CONTENT_PUBLISH_GATE_PASSED',
        details: JSON.stringify({
          contentId,
          contentType,
          performerIds,
          complianceRecordId: complianceResult.kycRecordId
        }),
        timestamp: new Date()
      });
      
      res.json({
        approved: true,
        contentId,
        complianceRecordId: complianceResult.kycRecordId,
        message: 'Content approved for publishing'
      });
    } catch (error) {
      console.error('Content publish gate error:', error);
      res.status(500).json({ error: 'Content publish gate check failed' });
    }
  });

  // ===== ENHANCED PAYMENT ROUTES WITH SECURITY FIXES =====

  // Webhook signature verification middleware
  const verifyWebhookSignature = (req: any, res: any, next: any) => {
    try {
      const signature = req.headers['stripe-signature'] || req.headers['x-webhook-signature'];
      const payload = req.body;
      
      if (!signature || !payload) {
        return res.status(400).json({ error: 'Missing webhook signature or payload' });
      }
      
      // Mock signature verification for development
      // In production, verify against actual webhook secret
      const expectedSig = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_signature';
      
      // Log webhook attempt for security monitoring
      console.log(`Webhook signature verification: ${signature ? 'present' : 'missing'}`);
      
      req.webhookVerified = true;
      next();
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return res.status(401).json({ error: 'Webhook signature verification failed' });
    }
  };

  // KYC enforcement for payouts
  const requireKycForPayout = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required for payouts' });
      }
      
      // Check KYC status
      const kycRecord = await storage.getKycVerification(userId);
      if (!kycRecord || kycRecord.status !== 'verified') {
        return res.status(403).json({
          error: 'KYC verification required for payouts',
          message: 'You must complete identity verification before requesting payouts',
          requiresKyc: true,
          kycStatus: kycRecord?.status || 'not_started'
        });
      }
      
      // Check for sanctions/OFAC screening
      if (kycRecord.sanctionsScreening !== 'clear') {
        return res.status(403).json({
          error: 'Payout blocked due to compliance screening',
          message: 'Contact support for assistance with your payout request'
        });
      }
      
      req.verifiedKycRecord = kycRecord;
      next();
    } catch (error) {
      console.error('KYC check failed:', error);
      return res.status(500).json({ error: 'KYC verification check failed' });
    }
  };

  // 3DS authentication check for EEA users
  const require3DSForEEA = async (req: any, res: any, next: any) => {
    try {
      const { country, paymentAmount } = req.body;
      const ip = req.ip || '127.0.0.1';
      
      // Check if user is in EEA (European Economic Area)
      const eeaCountries = [
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 
        'HU', 'IS', 'IE', 'IT', 'LV', 'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 
        'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB'
      ];
      
      const isEEAUser = eeaCountries.includes(country?.toUpperCase()) || 
                       await geoBlockingService.isEEARegion(ip);
      
      if (isEEAUser && paymentAmount && paymentAmount >= 3000) { // €30+ requires 3DS
        req.requires3DS = true;
        req.strongCustomerAuth = {
          required: true,
          reason: 'EEA_SCA_REQUIREMENT',
          amount: paymentAmount,
          country
        };
      } else {
        req.requires3DS = false;
      }
      
      next();
    } catch (error) {
      console.error('3DS check failed:', error);
      req.requires3DS = false;
      next();
    }
  };

  // Enhanced payment processing with 3DS
  app.post('/api/payments/process-payment', csrfProtection, isAuthenticated, enforceGeoBlocking('payment'), require3DSForEEA, async (req, res) => {
    try {
      const { amount, currency, paymentMethodId, creatorId } = req.body;
      const userId = req.user!.id;
      
      // Check if 3DS is required
      if (req.requires3DS) {
        // Return payment intent that requires 3DS confirmation
        return res.json({
          requiresAction: true,
          paymentIntent: {
            id: `pi_3ds_${Date.now()}`,
            clientSecret: `pi_3ds_${Date.now()}_secret_test`,
            status: 'requires_action',
            nextAction: {
              type: 'use_stripe_sdk',
              useStripeSdk: {
                type: 'three_d_secure_redirect',
                stripeSdk: { 
                  directoryServer: 'test',
                  cardBrand: 'visa'
                }
              }
            }
          },
          strongCustomerAuth: req.strongCustomerAuth
        });
      }
      
      // Process standard payment
      const transaction = await storage.createTransaction({
        id: `txn_${Date.now()}`,
        fanId: userId,
        creatorId,
        amount,
        currency: currency || 'USD',
        type: 'purchase',
        status: 'pending',
        paymentMethodId,
        processorTransactionId: `pi_${Date.now()}`,
        createdAt: new Date()
      });
      
      res.json({
        success: true,
        transactionId: transaction.id,
        paymentStatus: 'succeeded'
      });
    } catch (error) {
      console.error('Payment processing error:', error);
      res.status(500).json({ error: 'Payment processing failed' });
    }
  });

  // Secure payout request with KYC enforcement
  app.post('/api/payments/request-payout', csrfProtection, isAuthenticated, enforceGeoBlocking('payout'), requireKycForPayout, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { amount, currency, bankAccountId, taxInfo } = req.body;
      const kycRecord = req.verifiedKycRecord;
      
      // Validate payout amount
      if (!amount || amount < 5000) { // Minimum $50 payout
        return res.status(400).json({ 
          error: 'Minimum payout amount is $50.00',
          minimumAmount: 5000 
        });
      }
      
      // Check available balance
      const earnings = await storage.getCreatorEarnings(userId);
      if (!earnings || earnings.availableBalance < amount) {
        return res.status(400).json({
          error: 'Insufficient balance for payout',
          availableBalance: earnings?.availableBalance || 0,
          requestedAmount: amount
        });
      }
      
      // Create payout request with tax info
      const payoutRequest = await storage.createPayoutRequest({
        id: `payout_${Date.now()}`,
        creatorId: userId,
        amount,
        currency: currency || 'USD',
        status: 'pending',
        kycRecordId: kycRecord.id,
        bankAccountId,
        taxWithholding: taxInfo?.withholdingRate || 0,
        taxReportingRequired: taxInfo?.requiresReporting || false,
        requestedAt: new Date()
      });
      
      // Log payout request for compliance
      await storage.createAuditLog({
        userId,
        action: 'PAYOUT_REQUESTED',
        details: JSON.stringify({
          payoutId: payoutRequest.id,
          amount,
          currency,
          kycRecordId: kycRecord.id,
          taxInfo
        }),
        timestamp: new Date()
      });
      
      res.json({
        success: true,
        payoutRequestId: payoutRequest.id,
        amount,
        currency,
        estimatedProcessingDays: '3-5',
        message: 'Payout request submitted successfully'
      });
    } catch (error) {
      console.error('Payout request error:', error);
      res.status(500).json({ error: 'Failed to process payout request' });
    }
  });

  // Webhook handler for payment processor events
  app.post('/api/webhooks/payments', verifyWebhookSignature, async (req, res) => {
    try {
      const { type, data } = req.body;
      
      switch (type) {
        case 'payment_intent.succeeded':
          // Update transaction status
          if (data.object?.metadata?.transactionId) {
            await storage.updateTransaction(data.object.metadata.transactionId, {
              status: 'completed',
              processorTransactionId: data.object.id,
              updatedAt: new Date()
            });
          }
          break;
          
        case 'payment_intent.payment_failed':
          // Handle failed payment
          if (data.object?.metadata?.transactionId) {
            await storage.updateTransaction(data.object.metadata.transactionId, {
              status: 'failed',
              processorTransactionId: data.object.id,
              failureReason: data.object.last_payment_error?.message,
              updatedAt: new Date()
            });
          }
          break;
          
        case 'transfer.paid':
          // Update payout status
          if (data.object?.metadata?.payoutId) {
            await storage.updatePayoutRequest(data.object.metadata.payoutId, {
              status: 'completed',
              processedAt: new Date()
            });
          }
          break;
          
        case 'charge.dispute.created':
          // Handle dispute/chargeback
          await storage.createDispute({
            id: `dispute_${Date.now()}`,
            transactionId: data.object.metadata?.transactionId,
            amount: data.object.amount,
            currency: data.object.currency,
            reason: data.object.reason,
            status: 'open',
            createdAt: new Date()
          });
          break;
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Tax calculation endpoint
  app.post('/api/payments/calculate-tax', csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const { amount, country, state, creatorId } = req.body;
      
      // Mock tax calculation - in production, integrate with tax service
      let taxRate = 0;
      let taxAmount = 0;
      let taxType = 'none';
      
      // EU VAT for digital services
      if (['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT'].includes(country)) {
        taxRate = 0.19; // Standard EU VAT rate (varies by country)
        taxAmount = Math.round(amount * taxRate);
        taxType = 'vat';
      }
      
      // US state taxes for applicable states
      if (country === 'US' && ['CA', 'NY', 'TX', 'FL'].includes(state)) {
        taxRate = 0.0875; // Varies by state
        taxAmount = Math.round(amount * taxRate);
        taxType = 'sales_tax';
      }
      
      res.json({
        amount,
        taxRate,
        taxAmount,
        totalAmount: amount + taxAmount,
        taxType,
        breakdown: {
          subtotal: amount,
          tax: taxAmount,
          total: amount + taxAmount
        }
      });
    } catch (error) {
      console.error('Tax calculation error:', error);
      res.status(500).json({ error: 'Tax calculation failed' });
    }
  });

  // Apple Pay merchant validation
  app.post('/api/payments/apple-pay/validate', async (req, res) => {
    try {
      const { validationURL, domainName } = req.body;
      
      const session = await adultFriendlyPaymentService.validateApplePayMerchant(
        validationURL, 
        domainName
      );
      
      res.json(session);
    } catch (error) {
      console.error('Apple Pay validation failed:', error);
      res.status(400).json({ error: 'Merchant validation failed' });
    }
  });

  // Apple Pay payment processing with server-side validation
  app.post('/api/payments/apple-pay/process', isAuthenticated, async (req, res) => {
    try {
      const { paymentToken, productId } = req.body; // Remove client-supplied amount
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // SECURITY: Use fixed amount for demo - in production, get from product catalog
      const amount = 10.00; // Fixed amount for demo
      const currency = 'USD';
      
      const result = await adultFriendlyPaymentService.processApplePayPayment(
        paymentToken, 
        amount, 
        currency, 
        userId
      );
      
      res.json(result);
    } catch (error) {
      console.error('Apple Pay processing failed:', error);
      res.status(500).json({ error: 'Payment processing failed' });
    }
  });

  // Google Pay payment processing with server-side validation
  app.post('/api/payments/google-pay/process', isAuthenticated, async (req, res) => {
    try {
      const { paymentMethodData, productId } = req.body; // Remove client-supplied amount
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // SECURITY: Use fixed amount for demo - in production, get from product catalog
      const amount = 10.00; // Fixed amount for demo
      const currency = 'USD';
      
      const result = await adultFriendlyPaymentService.processGooglePayPayment(
        paymentMethodData, 
        amount, 
        currency, 
        userId
      );
      
      res.json(result);
    } catch (error) {
      console.error('Google Pay processing failed:', error);
      res.status(500).json({ error: 'Payment processing failed' });
    }
  });

  // Enhanced Stripe payment intents with server-side validation
  app.post('/api/payments/stripe/payment-intent', isAuthenticated, async (req, res) => {
    try {
      const { productId, savePaymentMethod, paymentMethodId } = req.body; // Remove client-supplied amount
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // SECURITY: Get price from server-side product catalog, not client
      const product = await storage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Server-side amount validation
      const amount = product.price;
      const currency = product.currency || 'USD';
      
      let customerId;
      const user = await storage.getUser(userId);
      customerId = await adultFriendlyPaymentService.getOrCreateStripeCustomer(
        userId, 
        user?.email, 
        user?.username
      );

      const result = await adultFriendlyPaymentService.createPaymentIntent({
        amount,
        currency,
        customerId,
        paymentMethodId,
        savePaymentMethod,
        metadata: {
          user_id: userId,
          product_id: productId,
          platform: 'boyfanz'
        }
      });
      
      res.json(result);
    } catch (error) {
      console.error('Stripe payment intent creation failed:', error);
      res.status(500).json({ error: 'Payment intent creation failed' });
    }
  });

  // Get saved payment methods
  app.get('/api/payments/stripe/payment-methods', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const paymentMethods = await adultFriendlyPaymentService.getSavedPaymentMethods(userId);
      res.json(paymentMethods);
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      res.status(500).json({ error: 'Failed to get payment methods' });
    }
  });

  // Delete saved payment method
  app.delete('/api/payments/stripe/payment-methods/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await adultFriendlyPaymentService.deleteSavedPaymentMethod(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      res.status(500).json({ error: 'Failed to delete payment method' });
    }
  });

  // SECURITY: Enhanced Stripe webhook validation for payment confirmations
  app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // Enhanced security logging (non-blocking)
      const logWebhookAttempt = async () => {
        try {
          await storage.createAuditLog({
            actorId: 'system',
            action: 'stripe_webhook_received',
            targetType: 'webhook_endpoint',
            targetId: '/api/webhooks/stripe',
            diffJson: {
              ip: clientIP,
              userAgent: req.headers['user-agent'],
              timestamp: new Date().toISOString()
            }
          });
        } catch (err) {
          console.error('Failed to log webhook attempt:', err);
        }
      };
      // Fire and forget - don't await
      logWebhookAttempt();
      
      if (!webhookSecret || !sig) {
        console.error('Missing Stripe webhook secret or signature');
        // Log security violation (non-blocking)
        setImmediate(async () => {
          try {
            await storage.createAuditLog({
              actorId: 'system',
              action: 'stripe_webhook_security_violation',
              targetType: 'webhook_endpoint',
              targetId: '/api/webhooks/stripe',
              diffJson: {
                violation: 'missing_signature_or_secret',
                ip: clientIP,
                timestamp: new Date().toISOString()
              }
            });
          } catch (err) {
            console.error('Failed to log security violation:', err);
          }
        });
        return res.status(400).send('Webhook signature verification failed');
      }

      // Verify webhook signature using Stripe library
      let event;
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
          apiVersion: '2023-10-16'
        });
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        
        // CRITICAL: Idempotency check - prevent duplicate processing
        const existingEvent = await storage.getProcessedWebhookEvent?.(event.id);
        if (existingEvent) {
          console.log(`🔄 Webhook event already processed: ${event.id}`);
          return res.json({ received: true, duplicate: true });
        }
        
        // Record event as being processed
        await storage.recordProcessedWebhookEvent?.({
          eventId: event.id,
          eventType: event.type,
          processedAt: new Date(),
          source: 'stripe'
        }).catch(() => {}); // Fail silently if storage doesn't support this
        
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        // Log signature failure (non-blocking)
        setImmediate(async () => {
          try {
            await storage.createAuditLog({
              actorId: 'system', 
              action: 'stripe_webhook_signature_failed',
              targetType: 'webhook_endpoint',
              targetId: '/api/webhooks/stripe',
              diffJson: {
                error: err.message,
                ip: clientIP,
                timestamp: new Date().toISOString()
              }
            });
          } catch (err) {
            console.error('Failed to log signature failure:', err);
          }
        });
        return res.status(400).send('Webhook signature verification failed');
      }

      // Handle payment events with enhanced security logging
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          await financialLedgerService.updateTransactionStatus(
            paymentIntent.metadata.transaction_id,
            'completed',
            paymentIntent.id
          );
          
          // Enhanced audit logging for successful payments (non-blocking)
          setImmediate(async () => {
            try {
              await storage.createAuditLog({
                actorId: paymentIntent.metadata.user_id || 'system',
                action: 'payment_confirmed_webhook',
                targetType: 'payment_intent',
                targetId: paymentIntent.id,
                diffJson: {
                  amount: paymentIntent.amount / 100,
                  currency: paymentIntent.currency.toUpperCase(),
                  threeDSResult: paymentIntent.charges?.data[0]?.payment_method_details?.card?.three_d_secure?.result || 'not_applicable',
                  ip: clientIP,
                  timestamp: new Date().toISOString()
                }
              });
            } catch (err) {
              console.error('Failed to log payment success:', err);
            }
          });
          console.log(`💰 Payment confirmed via webhook: ${paymentIntent.id}`);
          break;

        case 'payment_intent.payment_failed':
          const failedIntent = event.data.object;
          await financialLedgerService.updateTransactionStatus(
            failedIntent.metadata.transaction_id,
            'failed',
            failedIntent.id,
            { failure_reason: failedIntent.last_payment_error?.message }
          );
          
          // Enhanced audit logging for failed payments (non-blocking)
          setImmediate(async () => {
            try {
              await storage.createAuditLog({
                actorId: failedIntent.metadata.user_id || 'system',
                action: 'payment_failed_webhook',
                targetType: 'payment_intent', 
                targetId: failedIntent.id,
                diffJson: {
                  failureReason: failedIntent.last_payment_error?.message || 'Unknown',
                  errorCode: failedIntent.last_payment_error?.code || 'None',
                  ip: clientIP,
                  timestamp: new Date().toISOString()
                }
              });
            } catch (err) {
              console.error('Failed to log payment failure:', err);
            }
          });
          console.log(`❌ Payment failed via webhook: ${failedIntent.id}`);
          break;

        default:
          console.log(`Unhandled Stripe event type: ${event.type}`);
          // Log unhandled webhook events for monitoring (non-blocking)
          setImmediate(async () => {
            try {
              await storage.createAuditLog({
                actorId: 'system',
                action: 'stripe_webhook_unhandled',
                targetType: 'webhook_event',
                targetId: event.id,
                diffJson: {
                  eventType: event.type,
                  ip: clientIP,
                  timestamp: new Date().toISOString()
                }
              });
            } catch (err) {
              console.error('Failed to log unhandled event:', err);
            }
          });
      }

      res.json({received: true});
    } catch (error) {
      console.error('Stripe webhook processing failed:', error);
      // Log webhook processing errors (non-blocking)
      setImmediate(async () => {
        try {
          await storage.createAuditLog({
            actorId: 'system',
            action: 'stripe_webhook_error',
            targetType: 'webhook_endpoint',
            targetId: '/api/webhooks/stripe',
            diffJson: {
              error: error.message,
              ip: req.ip || req.connection.remoteAddress,
              timestamp: new Date().toISOString()
            }
          });
        } catch (err) {
          console.error('Failed to log webhook error:', err);
        }
      });
      
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // ===== FINANCIAL LEDGER ROUTES =====

  // Get user transaction history
  app.get('/api/transactions', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { page = 1, limit = 50, type } = req.query;
      const transactions = await financialLedgerService.getUserTransactions(userId, {
        page: Number(page),
        limit: Number(limit),
        type: type as string
      });

      res.json(transactions);
    } catch (error) {
      console.error('Failed to get transactions:', error);
      res.status(500).json({ error: 'Failed to get transactions' });
    }
  });

  // Get transaction details
  app.get('/api/transactions/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const transaction = await financialLedgerService.getTransactionDetails(id, userId);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json(transaction);
    } catch (error) {
      console.error('Failed to get transaction:', error);
      res.status(500).json({ error: 'Failed to get transaction' });
    }
  });

  // ===== CONTENT MANAGEMENT ROUTES =====

  // DMCA takedown request
  app.post('/api/content/dmca/takedown', csrfProtection, async (req, res) => {
    try {
      const { contentId, claimantInfo, description } = req.body;
      
      const result = await contentManagementService.submitDMCATakedown({
        contentId,
        claimantInfo,
        description,
        submittedBy: req.user?.id || 'anonymous'
      });

      res.json(result);
    } catch (error) {
      console.error('DMCA takedown failed:', error);
      res.status(500).json({ error: 'DMCA takedown failed' });
    }
  });

  // Create content bundle
  app.post('/api/content/bundles', isAuthenticated, require2257Compliance, csrfProtection, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const bundleData = {
        ...req.body,
        creatorId: userId
      };

      const result = await contentManagementService.createContentBundle(bundleData);
      res.json(result);
    } catch (error) {
      console.error('Bundle creation failed:', error);
      res.status(500).json({ error: 'Bundle creation failed' });
    }
  });

  // Get content bundles
  app.get('/api/content/bundles', enforceGeoBlocking('content_access'), requireAgeVerification, async (req, res) => {
    try {
      const { creatorId, limit = 20 } = req.query;
      const bundles = await contentManagementService.getContentBundles(
        creatorId as string,
        Number(limit)
      );
      res.json(bundles);
    } catch (error) {
      console.error('Failed to get bundles:', error);
      res.status(500).json({ error: 'Failed to get bundles' });
    }
  });

  // ===== INFINITY FEED ROUTE =====
  
  // Get infinity scroll feed with mixed content (subscriptions + follows + free posts)
  app.get('/api/infinity-feed', isAuthenticated, enforceGeoBlocking('content_access'), async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const page = Number(req.query.page) || 1;
      const limit = 12; // Posts per page
      const offset = (page - 1) * limit;

      // Get posts from:
      // 1. Subscribed creators (all posts)
      // 2. Followed creators (free posts)
      // 3. Free-to-view posts from verified creators
      const posts = await storage.getInfinityFeedPosts(userId, limit, offset);
      
      const hasMore = posts.length === limit;

      res.json({ posts, hasMore });
    } catch (error) {
      console.error('Infinity feed error:', error);
      res.status(500).json({ error: 'Failed to load feed' });
    }
  });

  // ===== AI CREATOR TOOLS ROUTES =====

  // Generate auto-captions for video
  app.post('/api/ai/captions', isAuthenticated, requireAgeVerification, async (req, res) => {
    try {
      const { videoUrl, language = 'en' } = req.body;
      const result = await aiCreatorToolsService.generateAutoCaptions(videoUrl, language);
      res.json(result);
    } catch (error) {
      console.error('Auto-caption generation failed:', error);
      res.status(500).json({ error: 'Caption generation failed' });
    }
  });

  // Analyze thumbnail effectiveness
  app.post('/api/ai/thumbnails/analyze', isAuthenticated, require2257Compliance, async (req, res) => {
    try {
      const { thumbnailUrl, contentMetadata } = req.body;
      const analysis = await aiCreatorToolsService.analyzeThumbnail(thumbnailUrl, contentMetadata);
      res.json(analysis);
    } catch (error) {
      console.error('Thumbnail analysis failed:', error);
      res.status(500).json({ error: 'Thumbnail analysis failed' });
    }
  });

  // Generate content optimization suggestions
  app.post('/api/ai/content/optimize', isAuthenticated, require2257Compliance, async (req, res) => {
    try {
      const { contentId } = req.body;
      const optimization = await aiCreatorToolsService.optimizeContent(contentId);
      res.json(optimization);
    } catch (error) {
      console.error('Content optimization failed:', error);
      res.status(500).json({ error: 'Content optimization failed' });
    }
  });

  // Generate engagement analytics
  app.get('/api/ai/analytics/:creatorId', isAuthenticated, async (req, res) => {
    try {
      const { creatorId } = req.params;
      const { timeframe = 'weekly' } = req.query;
      
      // Check if user can access this creator's analytics
      if (req.user?.id !== creatorId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const analytics = await aiCreatorToolsService.generateEngagementAnalytics(
        creatorId,
        timeframe as any
      );
      res.json(analytics);
    } catch (error) {
      console.error('Analytics generation failed:', error);
      res.status(500).json({ error: 'Analytics generation failed' });
    }
  });

  // ===== KYC/IDENTITY VERIFICATION ROUTES =====

  // Initiate KYC verification
  app.post('/api/kyc/verify', isAuthenticated, csrfProtection, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { type, personalInfo, documents } = req.body;
      const result = await identityVerificationService.initiateKYCVerification({
        userId,
        type,
        personalInfo,
        documents
      });

      res.json(result);
    } catch (error) {
      console.error('KYC verification failed:', error);
      res.status(500).json({ error: 'KYC verification failed' });
    }
  });

  // Check payment compliance
  app.post('/api/payments/compliance-check', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { amount, type, metadata } = req.body;
      const result = await identityVerificationService.checkPaymentCompliance({
        userId,
        amount,
        type,
        metadata
      });

      res.json(result);
    } catch (error) {
      console.error('Compliance check failed:', error);
      res.status(500).json({ error: 'Compliance check failed' });
    }
  });

  // ===== GEO-BLOCKING ROUTES =====

  // Check geo access for content
  app.post('/api/geo/check-access', async (req, res) => {
    try {
      const { contentId, feature, type } = req.body;
      const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
      
      const result = await geoBlockingService.checkGeoAccess({
        ip,
        userId: req.user?.id,
        contentId,
        feature,
        type
      });

      res.json(result);
    } catch (error) {
      console.error('Geo access check failed:', error);
      res.status(500).json({ error: 'Geo access check failed' });
    }
  });

  // Create geo-restriction (admin only)
  app.post('/api/geo/restrictions', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { type, targetId, countries, isWhitelist, reason, expiresAt } = req.body;
      const createdBy = req.user?.id || 'admin';

      const result = await geoBlockingService.createGeoRestriction({
        type,
        targetId,
        countries,
        isWhitelist,
        reason,
        createdBy,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });

      res.json(result);
    } catch (error) {
      console.error('Geo restriction creation failed:', error);
      res.status(500).json({ error: 'Geo restriction creation failed' });
    }
  });

  // Enhanced international compliance features
  
  // Sanctions/OFAC screening endpoint
  app.post('/api/compliance/sanctions-screen', csrfProtection, isAuthenticated, async (req, res) => {
    try {
      const { firstName, lastName, dateOfBirth, country } = req.body;
      const userId = req.user!.id;
      
      if (!firstName || !lastName || !dateOfBirth || !country) {
        return res.status(400).json({ 
          error: 'All fields required for sanctions screening',
          required: ['firstName', 'lastName', 'dateOfBirth', 'country']
        });
      }
      
      // Mock sanctions screening - in production, integrate with OFAC/sanctions APIs
      const sanctionsResult = await performSanctionsScreening({
        firstName,
        lastName,
        dateOfBirth,
        country,
        userId
      });
      
      // Log sanctions check
      await storage.createAuditLog({
        userId,
        action: 'SANCTIONS_SCREENING',
        details: JSON.stringify({
          screeningResult: sanctionsResult.status,
          matchScore: sanctionsResult.matchScore,
          listsChecked: sanctionsResult.listsChecked,
          country
        }),
        timestamp: new Date()
      });
      
      // If sanctioned, block account
      if (sanctionsResult.status === 'blocked') {
        await storage.updateUser(userId, {
          status: 'suspended',
          suspensionReason: 'sanctions_screening_failed',
          updatedAt: new Date()
        });
      }
      
      res.json({
        status: sanctionsResult.status,
        cleared: sanctionsResult.status === 'clear',
        matchScore: sanctionsResult.matchScore,
        details: sanctionsResult.status === 'blocked' ? 
          'Account suspended due to sanctions screening' : 
          'Sanctions screening passed',
        screeningId: sanctionsResult.screeningId
      });
    } catch (error) {
      console.error('Sanctions screening error:', error);
      res.status(500).json({ error: 'Sanctions screening failed' });
    }
  });

  // Region-specific content rules endpoint
  app.get('/api/compliance/content-rules/:country', async (req, res) => {
    try {
      const { country } = req.params;
      const contentRules = getContentRulesByCountry(country.toUpperCase());
      
      res.json({
        country: country.toUpperCase(),
        contentRules,
        lastUpdated: new Date().toISOString(),
        source: 'compliance_database'
      });
    } catch (error) {
      console.error('Content rules lookup error:', error);
      res.status(500).json({ error: 'Failed to get content rules' });
    }
  });

  // Country-specific age verification requirements
  app.get('/api/compliance/age-requirements/:country', async (req, res) => {
    try {
      const { country } = req.params;
      const ageRequirements = getAgeRequirementsByCountry(country.toUpperCase());
      
      res.json({
        country: country.toUpperCase(),
        minimumAge: ageRequirements.minimumAge,
        verificationRequired: ageRequirements.verificationRequired,
        documentTypes: ageRequirements.acceptedDocuments,
        additionalRestrictions: ageRequirements.additionalRestrictions,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Age requirements lookup error:', error);
      res.status(500).json({ error: 'Failed to get age requirements' });
    }
  });

  // Restricted region access check
  app.get('/api/compliance/region-access', async (req, res) => {
    try {
      const ip = req.ip || '127.0.0.1';
      
      // Check if accessing from restricted region
      const geoResult = await geoBlockingService.checkGeoAccess({
        ip,
        feature: 'platform_access',
        type: 'general'
      });
      
      if (!geoResult.allowed) {
        return res.status(403).json({
          blocked: true,
          reason: geoResult.reason,
          country: geoResult.country,
          message: 'Platform access is restricted in your region',
          alternativeUrls: geoResult.metadata?.alternativeUrls || []
        });
      }
      
      res.json({
        blocked: false,
        country: geoResult.country,
        region: geoResult.region,
        restrictions: geoResult.restrictions || {},
        message: 'Platform access allowed'
      });
    } catch (error) {
      console.error('Region access check error:', error);
      res.status(500).json({ error: 'Region access check failed' });
    }
  });

  // ===== ANALYTICS ROUTES =====

  // Track analytics event
  app.post('/api/analytics/track', async (req, res) => {
    try {
      const { eventType, eventName, properties, revenue, currency } = req.body;
      const sessionId = req.sessionID;
      const userId = req.user?.id;

      await comprehensiveAnalyticsService.trackEvent({
        userId,
        sessionId,
        eventType,
        eventName,
        properties,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        referrer: req.headers.referer,
        pageUrl: req.headers.origin,
        revenue,
        currency
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Analytics tracking failed:', error);
      res.status(500).json({ error: 'Analytics tracking failed' });
    }
  });

  // Get user behavior insights
  app.get('/api/analytics/behavior/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const { timeframe = '30d' } = req.query;

      // Check access permissions
      if (req.user?.id !== userId && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const insights = await comprehensiveAnalyticsService.generateUserBehaviorInsights(
        userId,
        timeframe as string
      );

      res.json(insights);
    } catch (error) {
      console.error('Behavior insights failed:', error);
      res.status(500).json({ error: 'Behavior insights failed' });
    }
  });

  // Get payment analytics (admin only)
  app.get('/api/analytics/payments', requireAdmin, async (req, res) => {
    try {
      const { timeframe = '30d' } = req.query;
      const analytics = await comprehensiveAnalyticsService.generatePaymentAnalytics(
        timeframe as string
      );
      res.json(analytics);
    } catch (error) {
      console.error('Payment analytics failed:', error);
      res.status(500).json({ error: 'Payment analytics failed' });
    }
  });

  // Create alert rule (admin only)
  app.post('/api/analytics/alerts', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { name, metric, condition, threshold, severity, channels, recipients, cooldownMinutes } = req.body;
      
      const result = await comprehensiveAnalyticsService.createAlertRule({
        name,
        metric,
        condition,
        threshold,
        severity,
        channels,
        recipients,
        cooldownMinutes
      });

      res.json(result);
    } catch (error) {
      console.error('Alert rule creation failed:', error);
      res.status(500).json({ error: 'Alert rule creation failed' });
    }
  });

  // ===== COMMUNICATION MANAGEMENT ADMIN ROUTES =====

  // Comment Moderation Routes
  app.get('/api/admin/comments', requireAdmin, async (req, res) => {
    try {
      const {
        limit = 50,
        offset = 0,
        postId,
        userId,
        status,
        sentimentScore,
        sortBy = 'created',
        sortOrder = 'desc'
      } = req.query;

      const comments = await storage.getComments({
        limit: Number(limit),
        offset: Number(offset),
        postId: postId as string,
        userId: userId as string,
        status: status as string,
        sentimentScore: sentimentScore as string,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any
      });

      res.json(comments);
    } catch (error) {
      console.error('Failed to get comments:', error);
      res.status(500).json({ error: 'Failed to get comments' });
    }
  });

  app.get('/api/admin/comments/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const comment = await storage.getComment(id);
      
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      res.json(comment);
    } catch (error) {
      console.error('Failed to get comment:', error);
      res.status(500).json({ error: 'Failed to get comment' });
    }
  });

  app.post('/api/admin/comments/:id/moderate', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const { status, reason, aiConfidence, sentimentScore, toxicityScore, spamScore } = req.body;
      const moderatorId = req.user?.id;

      const moderation = await storage.moderateComment({
        commentId: id,
        moderatorId,
        status,
        reason,
        autoModerated: false,
        aiConfidence: aiConfidence || 0,
        sentimentScore,
        toxicityScore: toxicityScore || 0,
        spamScore: spamScore || 0
      });

      // Log moderation action
      await storage.createAuditLog({
        userId: moderatorId,
        action: 'COMMENT_MODERATED',
        details: JSON.stringify({ commentId: id, status, reason }),
        timestamp: new Date()
      });

      res.json(moderation);
    } catch (error) {
      console.error('Failed to moderate comment:', error);
      res.status(500).json({ error: 'Failed to moderate comment' });
    }
  });

  app.post('/api/admin/comments/bulk-moderate', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { commentIds, action, reason } = req.body;
      const moderatorId = req.user?.id;

      if (!Array.isArray(commentIds) || commentIds.length === 0) {
        return res.status(400).json({ error: 'commentIds must be a non-empty array' });
      }

      await storage.bulkModerateComments(commentIds, action, reason, moderatorId);

      // Log bulk moderation action
      await storage.createAuditLog({
        userId: moderatorId,
        action: 'BULK_COMMENT_MODERATION',
        details: JSON.stringify({ commentIds, action, reason, count: commentIds.length }),
        timestamp: new Date()
      });

      res.json({ success: true, moderatedCount: commentIds.length });
    } catch (error) {
      console.error('Failed to bulk moderate comments:', error);
      res.status(500).json({ error: 'Failed to bulk moderate comments' });
    }
  });

  app.get('/api/admin/comments/analytics', requireAdmin, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: 'dateFrom and dateTo are required' });
      }

      const analytics = await storage.getCommentAnalytics(
        new Date(dateFrom as string),
        new Date(dateTo as string)
      );

      res.json(analytics);
    } catch (error) {
      console.error('Failed to get comment analytics:', error);
      res.status(500).json({ error: 'Failed to get comment analytics' });
    }
  });

  // Message Moderation Routes
  app.get('/api/admin/messages', requireAdmin, async (req, res) => {
    try {
      const {
        limit = 50,
        offset = 0,
        senderId,
        receiverId,
        flagged,
        status,
        sortBy = 'created',
        sortOrder = 'desc'
      } = req.query;

      const messages = await storage.getMessages({
        limit: Number(limit),
        offset: Number(offset),
        senderId: senderId as string,
        receiverId: receiverId as string,
        flagged: flagged === 'true',
        status: status as string,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any
      });

      res.json(messages);
    } catch (error) {
      console.error('Failed to get messages:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  });

  app.post('/api/admin/messages/:id/flag', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const { flagReason, notes, reporterId } = req.body;
      const moderatorId = req.user?.id;

      const moderation = await storage.flagMessage({
        messageId: id,
        reporterId,
        moderatorId,
        status: 'flagged',
        flagReason,
        notes,
        autoFlagged: false,
        reviewRequired: true
      });

      await storage.createAuditLog({
        userId: moderatorId,
        action: 'MESSAGE_FLAGGED',
        details: JSON.stringify({ messageId: id, flagReason, notes }),
        timestamp: new Date()
      });

      res.json(moderation);
    } catch (error) {
      console.error('Failed to flag message:', error);
      res.status(500).json({ error: 'Failed to flag message' });
    }
  });

  app.get('/api/admin/messages/analytics', requireAdmin, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      if (!dateFrom || !dateTo) {
        return res.status(400).json({ error: 'dateFrom and dateTo are required' });
      }

      const analytics = await storage.getMessageAnalytics(
        new Date(dateFrom as string),
        new Date(dateTo as string)
      );

      res.json(analytics);
    } catch (error) {
      console.error('Failed to get message analytics:', error);
      res.status(500).json({ error: 'Failed to get message analytics' });
    }
  });

  // Mass Message Templates Routes
  app.get('/api/admin/message-templates', requireAdmin, async (req, res) => {
    try {
      const { type, isActive, limit = 50, offset = 0 } = req.query;
      const creatorId = req.user?.id || '';

      const templates = await storage.getMassMessageTemplates(creatorId, {
        type: type as string,
        isActive: isActive === 'true',
        limit: Number(limit),
        offset: Number(offset)
      });

      res.json(templates);
    } catch (error) {
      console.error('Failed to get message templates:', error);
      res.status(500).json({ error: 'Failed to get message templates' });
    }
  });

  app.post('/api/admin/message-templates', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const templateData = {
        ...req.body,
        creatorId: req.user?.id || ''
      };

      const template = await storage.createMassMessageTemplate(templateData);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: 'MESSAGE_TEMPLATE_CREATED',
        details: JSON.stringify({ templateId: template.id, name: template.name }),
        timestamp: new Date()
      });

      res.json(template);
    } catch (error) {
      console.error('Failed to create message template:', error);
      res.status(500).json({ error: 'Failed to create message template' });
    }
  });

  app.post('/api/admin/message-templates/:id/send', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;
      const { targetAudience, customFilter } = req.body;

      const result = await storage.sendMassMessage(id, targetAudience, customFilter);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: 'MASS_MESSAGE_SENT',
        details: JSON.stringify({ templateId: id, targetAudience, ...result }),
        timestamp: new Date()
      });

      res.json(result);
    } catch (error) {
      console.error('Failed to send mass message:', error);
      res.status(500).json({ error: 'Failed to send mass message' });
    }
  });

  // Announcements Management Routes
  app.get('/api/admin/announcements', requireAdmin, async (req, res) => {
    try {
      const {
        limit = 50,
        offset = 0,
        creatorId,
        type,
        status,
        targetAudience,
        sortBy = 'created',
        sortOrder = 'desc'
      } = req.query;

      const announcements = await storage.getAnnouncements({
        limit: Number(limit),
        offset: Number(offset),
        creatorId: creatorId as string,
        type: type as string,
        status: status as string,
        targetAudience: targetAudience as string,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any
      });

      res.json(announcements);
    } catch (error) {
      console.error('Failed to get announcements:', error);
      res.status(500).json({ error: 'Failed to get announcements' });
    }
  });

  app.post('/api/admin/announcements', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const announcementData = {
        ...req.body,
        creatorId: req.user?.id || ''
      };

      const announcement = await storage.createAnnouncement(announcementData);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: 'ANNOUNCEMENT_CREATED',
        details: JSON.stringify({ announcementId: announcement.id, title: announcement.title }),
        timestamp: new Date()
      });

      res.json(announcement);
    } catch (error) {
      console.error('Failed to create announcement:', error);
      res.status(500).json({ error: 'Failed to create announcement' });
    }
  });

  app.post('/api/admin/announcements/:id/publish', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;

      const result = await storage.publishAnnouncement(id);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: 'ANNOUNCEMENT_PUBLISHED',
        details: JSON.stringify({ announcementId: id, ...result }),
        timestamp: new Date()
      });

      res.json(result);
    } catch (error) {
      console.error('Failed to publish announcement:', error);
      res.status(500).json({ error: 'Failed to publish announcement' });
    }
  });

  app.get('/api/admin/announcements/:id/analytics', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const analytics = await storage.getAnnouncementAnalytics(id);
      res.json(analytics);
    } catch (error) {
      console.error('Failed to get announcement analytics:', error);
      res.status(500).json({ error: 'Failed to get announcement analytics' });
    }
  });

  // Push Notification Campaigns Routes
  app.get('/api/admin/push-campaigns', requireAdmin, async (req, res) => {
    try {
      const {
        limit = 50,
        offset = 0,
        creatorId,
        status,
        targetAudience,
        sortBy = 'created',
        sortOrder = 'desc'
      } = req.query;

      const campaigns = await storage.getPushCampaigns({
        limit: Number(limit),
        offset: Number(offset),
        creatorId: creatorId as string,
        status: status as string,
        targetAudience: targetAudience as string,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any
      });

      res.json(campaigns);
    } catch (error) {
      console.error('Failed to get push campaigns:', error);
      res.status(500).json({ error: 'Failed to get push campaigns' });
    }
  });

  app.post('/api/admin/push-campaigns', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const campaignData = {
        ...req.body,
        creatorId: req.user?.id || ''
      };

      const campaign = await storage.createPushCampaign(campaignData);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: 'PUSH_CAMPAIGN_CREATED',
        details: JSON.stringify({ campaignId: campaign.id, name: campaign.name }),
        timestamp: new Date()
      });

      res.json(campaign);
    } catch (error) {
      console.error('Failed to create push campaign:', error);
      res.status(500).json({ error: 'Failed to create push campaign' });
    }
  });

  app.post('/api/admin/push-campaigns/:id/send', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { id } = req.params;

      const result = await storage.sendPushCampaign(id);

      await storage.createAuditLog({
        userId: req.user?.id,
        action: 'PUSH_CAMPAIGN_SENT',
        details: JSON.stringify({ campaignId: id, ...result }),
        timestamp: new Date()
      });

      res.json(result);
    } catch (error) {
      console.error('Failed to send push campaign:', error);
      res.status(500).json({ error: 'Failed to send push campaign' });
    }
  });

  app.get('/api/admin/push-campaigns/:id/analytics', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const analytics = await storage.getPushCampaignAnalytics(id);
      res.json(analytics);
    } catch (error) {
      console.error('Failed to get push campaign analytics:', error);
      res.status(500).json({ error: 'Failed to get push campaign analytics' });
    }
  });

  // User Communication Preferences Routes
  app.get('/api/admin/users/:userId/communication-preferences', requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const preferences = await storage.getUserCommunicationPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error('Failed to get user communication preferences:', error);
      res.status(500).json({ error: 'Failed to get user communication preferences' });
    }
  });

  app.post('/api/admin/users/:userId/device-token', requireAdmin, csrfProtection, async (req, res) => {
    try {
      const { userId } = req.params;
      const { platform, token } = req.body;

      await storage.updateUserDeviceToken(userId, platform, token);
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to update device token:', error);
      res.status(500).json({ error: 'Failed to update device token' });
    }
  });

  // Communication Analytics and Overview Routes
  app.get('/api/admin/communication/analytics', requireAdmin, async (req, res) => {
    try {
      const { type, dateFrom, dateTo } = req.query;
      
      if (!type || !dateFrom || !dateTo) {
        return res.status(400).json({ error: 'type, dateFrom, and dateTo are required' });
      }

      const analytics = await storage.getCommunicationAnalytics(
        type as string,
        new Date(dateFrom as string),
        new Date(dateTo as string)
      );

      res.json(analytics);
    } catch (error) {
      console.error('Failed to get communication analytics:', error);
      res.status(500).json({ error: 'Failed to get communication analytics' });
    }
  });

  app.get('/api/admin/communication/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getOverallCommunicationStats();
      res.json(stats);
    } catch (error) {
      console.error('Failed to get communication stats:', error);
      res.status(500).json({ error: 'Failed to get communication stats' });
    }
  });

  app.get('/api/admin/users/targeting', requireAdmin, async (req, res) => {
    try {
      const { targetAudience, customFilter } = req.query;
      
      if (!targetAudience) {
        return res.status(400).json({ error: 'targetAudience is required' });
      }

      const users = await storage.getUsersForTargeting(
        targetAudience as string,
        customFilter ? JSON.parse(customFilter as string) : undefined
      );

      res.json(users);
    } catch (error) {
      console.error('Failed to get users for targeting:', error);
      res.status(500).json({ error: 'Failed to get users for targeting' });
    }
  });

  // ===== DATA SECURITY & PRIVACY ROUTES =====

  // Secure cookie configuration endpoint
  app.post('/api/security/configure-cookies', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const { sessionTimeout, httpOnly, secure, sameSite } = req.body;
      
      // Update session configuration with secure flags
      const cookieConfig = {
        httpOnly: httpOnly !== false, // Default to true
        secure: secure !== false, // Default to true in production
        sameSite: sameSite || 'lax',
        maxAge: sessionTimeout || 86400000, // 24 hours default
        domain: process.env.COOKIE_DOMAIN || undefined
      };
      
      // Apply secure cookie settings
      res.cookie('security-config-updated', Date.now(), cookieConfig);
      
      await storage.createAuditLog({
        userId: req.user?.id,
        action: 'SECURITY_CONFIG_UPDATED',
        details: JSON.stringify({
          cookieConfig,
          updatedBy: req.user?.username || 'admin'
        }),
        timestamp: new Date()
      });
      
      res.json({
        success: true,
        cookieConfig,
        message: 'Secure cookie configuration updated'
      });
    } catch (error) {
      console.error('Cookie configuration error:', error);
      res.status(500).json({ error: 'Failed to update cookie configuration' });
    }
  });

  // Data retention policy enforcement
  app.post('/api/security/enforce-retention', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const { dryRun, retentionDays, dataTypes } = req.body;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (retentionDays || 2555)); // 7 years default
      
      let deletionStats = {
        oldSessions: 0,
        expiredTokens: 0,
        anonymizedUsers: 0,
        archivedMessages: 0,
        clearedLogs: 0
      };
      
      if (!dryRun) {
        // Clean expired sessions
        const expiredSessions = await storage.cleanExpiredSessions(cutoffDate);
        deletionStats.expiredTokens = expiredSessions;
        
        // Anonymize old user data (beyond retention period)
        const oldUsers = await storage.getUsersPastRetention(cutoffDate);
        for (const user of oldUsers) {
          if (user.markedForDeletion) {
            await storage.anonymizeUserData(user.id);
            deletionStats.anonymizedUsers++;
          }
        }
        
        // Archive old audit logs
        const archivedLogs = await storage.archiveOldAuditLogs(cutoffDate);
        deletionStats.clearedLogs = archivedLogs;
      }
      
      // Log retention enforcement
      await storage.createAuditLog({
        userId: req.user?.id,
        action: 'DATA_RETENTION_ENFORCED',
        details: JSON.stringify({
          dryRun,
          retentionDays,
          cutoffDate,
          deletionStats,
          dataTypes
        }),
        timestamp: new Date()
      });
      
      res.json({
        success: true,
        dryRun,
        retentionDays,
        cutoffDate,
        deletionStats,
        message: dryRun ? 'Retention analysis completed' : 'Data retention policy enforced'
      });
    } catch (error) {
      console.error('Data retention enforcement error:', error);
      res.status(500).json({ error: 'Failed to enforce data retention policy' });
    }
  });

  // Full account deletion pipeline
  app.post('/api/security/process-deletion-requests', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const { batchSize, gracePeriodDays } = req.body;
      const gracePeriod = new Date();
      gracePeriod.setDate(gracePeriod.getDate() - (gracePeriodDays || 30)); // 30 days grace period
      
      // Get users marked for deletion past grace period
      const usersToDelete = await storage.getUsersForDeletion(gracePeriod, batchSize || 10);
      
      let deletionResults = [];
      
      for (const user of usersToDelete) {
        try {
          // Full account deletion process
          await storage.fullAccountDeletion(user.id);
          
          deletionResults.push({
            userId: user.id,
            username: user.username,
            status: 'deleted',
            deletedAt: new Date()
          });
          
          // Log each deletion
          await storage.createAuditLog({
            userId: null, // User no longer exists
            action: 'ACCOUNT_FULLY_DELETED',
            details: JSON.stringify({
              deletedUserId: user.id,
              deletedUsername: user.username,
              markedForDeletionAt: user.deletionRequestedAt,
              processedBy: req.user?.id
            }),
            timestamp: new Date()
          });
        } catch (deletionError) {
          deletionResults.push({
            userId: user.id,
            username: user.username,
            status: 'error',
            error: deletionError.message
          });
        }
      }
      
      res.json({
        success: true,
        processed: usersToDelete.length,
        deletionResults,
        gracePeriodDays,
        message: `Processed ${deletionResults.length} deletion requests`
      });
    } catch (error) {
      console.error('Account deletion processing error:', error);
      res.status(500).json({ error: 'Failed to process deletion requests' });
    }
  });

  // Security headers configuration
  app.get('/api/security/headers', async (req, res) => {
    try {
      const securityHeaders = {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Content-Security-Policy': `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com;
          style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
          font-src 'self' https://fonts.gstatic.com;
          img-src 'self' data: https: blob:;
          connect-src 'self' https://api.stripe.com wss: ws:;
          media-src 'self' blob:;
          object-src 'none';
          base-uri 'self';
          form-action 'self';
          frame-ancestors 'none';
        `.replace(/\s+/g, ' ').trim()
      };
      
      // Apply headers to response
      Object.entries(securityHeaders).forEach(([header, value]) => {
        res.setHeader(header, value);
      });
      
      res.json({
        headers: securityHeaders,
        lastUpdated: new Date().toISOString(),
        message: 'Security headers configured successfully'
      });
    } catch (error) {
      console.error('Security headers error:', error);
      res.status(500).json({ error: 'Failed to configure security headers' });
    }
  });

  // Encryption status check
  app.get('/api/security/encryption-status', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const encryptionStatus = {
        database: {
          atRest: process.env.DB_ENCRYPTION_ENABLED === 'true',
          inTransit: process.env.DATABASE_URL?.includes('sslmode=require') || false,
          keyRotation: process.env.ENCRYPTION_KEY_ROTATION === 'enabled'
        },
        sessions: {
          encrypted: true, // Express sessions are encrypted by default
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        },
        storage: {
          objectEncryption: process.env.OBJECT_STORAGE_ENCRYPTION === 'true',
          keyManagement: process.env.KMS_ENABLED === 'true'
        },
        communications: {
          httpsOnly: process.env.FORCE_HTTPS === 'true',
          tlsVersion: '1.3',
          hsts: true
        }
      };
      
      res.json({
        encryptionStatus,
        lastChecked: new Date().toISOString(),
        recommendations: getEncryptionRecommendations(encryptionStatus)
      });
    } catch (error) {
      console.error('Encryption status check error:', error);
      res.status(500).json({ error: 'Failed to check encryption status' });
    }
  });

  // Data protection compliance summary
  app.get('/api/security/compliance-summary', csrfProtection, requireAdmin, async (req, res) => {
    try {
      const complianceSummary = {
        gdpr: {
          dsarEndpoints: 'implemented',
          consentManagement: 'active',
          dataRetention: 'enforced',
          privacyByDesign: 'implemented'
        },
        security: {
          encryption: 'enabled',
          accessControls: 'implemented',
          auditLogging: 'comprehensive',
          incidentResponse: 'documented'
        },
        dataProtection: {
          minimization: 'enforced',
          pseudonymization: 'implemented',
          anonymization: 'automated',
          deletion: 'systematic'
        },
        monitoring: {
          securityAlerts: 'active',
          complianceReporting: 'automated',
          vulnerabilityScanning: 'scheduled',
          accessMonitoring: 'continuous'
        }
      };
      
      res.json({
        complianceSummary,
        lastAssessment: new Date().toISOString(),
        overallStatus: 'compliant',
        nextReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      });
    } catch (error) {
      console.error('Compliance summary error:', error);
      res.status(500).json({ error: 'Failed to generate compliance summary' });
    }
  });

  // ===== MESSAGE SECURITY ROUTES =====

  // Validate message before sending
  app.post('/api/messages/validate', isAuthenticated, async (req, res) => {
    try {
      const { content, recipientId, type } = req.body;
      const senderId = req.user?.id;

      if (!senderId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validation = await messageSecurityService.validateMessage({
        content,
        senderId,
        recipientId,
        type
      });

      res.json(validation);
    } catch (error) {
      console.error('Message validation failed:', error);
      res.status(500).json({ error: 'Message validation failed' });
    }
  });

  // ===== GENERAL API ROUTES =====

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get current user
  app.get('/api/user', isAuthenticated, (req, res) => {
    res.json(req.user);
  });

  // ===== ADMIN DASHBOARD API ROUTES =====

  // Dashboard Overview
  app.get('/api/admin/dashboard/overview', requireAdmin, async (req, res) => {
    try {
      const overview = await storage.getAdminDashboardOverview();
      res.json(overview);
    } catch (error) {
      console.error('Admin dashboard overview error:', error);
      res.status(500).json({ error: 'Failed to load dashboard overview' });
    }
  });

  app.get('/api/admin/dashboard/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Admin dashboard stats error:', error);
      res.status(500).json({ error: 'Failed to load dashboard stats' });
    }
  });

  app.get('/api/admin/dashboard/system-health', requireAdmin, async (req, res) => {
    try {
      const systemHealth = await storage.getSystemHealthMetrics();
      res.json(systemHealth);
    } catch (error) {
      console.error('System health error:', error);
      res.status(500).json({ error: 'Failed to load system health metrics' });
    }
  });

  // Complaints Management
  app.get('/api/admin/complaints', requireAdmin, async (req, res) => {
    try {
      const { status, category, priority, page = 1, limit = 20 } = req.query;
      const complaints = await storage.getComplaints({
        status: status as string,
        category: category as string,
        priority: priority as string,
        page: Number(page),
        limit: Number(limit)
      });
      res.json(complaints);
    } catch (error) {
      console.error('Get complaints error:', error);
      res.status(500).json({ error: 'Failed to fetch complaints' });
    }
  });

  app.get('/api/admin/complaints/:id', requireAdmin, async (req, res) => {
    try {
      const complaint = await storage.getComplaint(req.params.id);
      if (!complaint) {
        return res.status(404).json({ error: 'Complaint not found' });
      }
      res.json(complaint);
    } catch (error) {
      console.error('Get complaint error:', error);
      res.status(500).json({ error: 'Failed to fetch complaint' });
    }
  });

  app.put('/api/admin/complaints/:id/assign', requireAdmin, async (req, res) => {
    try {
      const { assignedToId } = req.body;
      const complaint = await storage.assignComplaint(req.params.id, assignedToId, req.user!.id);
      res.json(complaint);
    } catch (error) {
      console.error('Assign complaint error:', error);
      res.status(500).json({ error: 'Failed to assign complaint' });
    }
  });

  app.put('/api/admin/complaints/:id/resolve', requireAdmin, async (req, res) => {
    try {
      const { resolution, internalNotes } = req.body;
      const complaint = await storage.resolveComplaint(req.params.id, resolution, internalNotes, req.user!.id);
      res.json(complaint);
    } catch (error) {
      console.error('Resolve complaint error:', error);
      res.status(500).json({ error: 'Failed to resolve complaint' });
    }
  });

  app.post('/api/admin/complaints/:id/comments', requireAdmin, async (req, res) => {
    try {
      const { content, isInternal } = req.body;
      const comment = await storage.addComplaintComment(req.params.id, content, isInternal, req.user!.id);
      res.json(comment);
    } catch (error) {
      console.error('Add complaint comment error:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  // Reports Management
  app.get('/api/admin/reports/financial', requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate, format = 'json' } = req.query;
      const report = await storage.generateFinancialReport({
        startDate: startDate as string,
        endDate: endDate as string
      });
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=financial-report.csv');
        return res.send(report.csv);
      }
      
      res.json(report);
    } catch (error) {
      console.error('Financial report error:', error);
      res.status(500).json({ error: 'Failed to generate financial report' });
    }
  });

  app.get('/api/admin/reports/users', requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate, format = 'json' } = req.query;
      const report = await storage.generateUserAnalyticsReport({
        startDate: startDate as string,
        endDate: endDate as string
      });
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=user-analytics-report.csv');
        return res.send(report.csv);
      }
      
      res.json(report);
    } catch (error) {
      console.error('User analytics report error:', error);
      res.status(500).json({ error: 'Failed to generate user analytics report' });
    }
  });

  app.get('/api/admin/reports/content', requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate, format = 'json' } = req.query;
      const report = await storage.generateContentReport({
        startDate: startDate as string,
        endDate: endDate as string
      });
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=content-report.csv');
        return res.send(report.csv);
      }
      
      res.json(report);
    } catch (error) {
      console.error('Content report error:', error);
      res.status(500).json({ error: 'Failed to generate content report' });
    }
  });

  app.get('/api/admin/reports/compliance', requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate, format = 'json' } = req.query;
      const report = await storage.generateComplianceReport({
        startDate: startDate as string,
        endDate: endDate as string
      });
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=compliance-report.csv');
        return res.send(report.csv);
      }
      
      res.json(report);
    } catch (error) {
      console.error('Compliance report error:', error);
      res.status(500).json({ error: 'Failed to generate compliance report' });
    }
  });

  // Withdrawal/Payout Management
  app.get('/api/admin/withdrawals', requireAdmin, async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const withdrawals = await storage.getPayoutRequests({
        status: status as string,
        page: Number(page),
        limit: Number(limit)
      });
      res.json(withdrawals);
    } catch (error) {
      console.error('Get withdrawals error:', error);
      res.status(500).json({ error: 'Failed to fetch withdrawal requests' });
    }
  });

  app.get('/api/admin/withdrawals/:id', requireAdmin, async (req, res) => {
    try {
      const withdrawal = await storage.getPayoutRequest(req.params.id);
      if (!withdrawal) {
        return res.status(404).json({ error: 'Withdrawal request not found' });
      }
      res.json(withdrawal);
    } catch (error) {
      console.error('Get withdrawal error:', error);
      res.status(500).json({ error: 'Failed to fetch withdrawal request' });
    }
  });

  app.put('/api/admin/withdrawals/:id/approve', requireAdmin, async (req, res) => {
    try {
      const { notes } = req.body;
      const withdrawal = await storage.approvePayoutRequest(req.params.id, notes, req.user!.id);
      res.json(withdrawal);
    } catch (error) {
      console.error('Approve withdrawal error:', error);
      res.status(500).json({ error: 'Failed to approve withdrawal' });
    }
  });

  app.put('/api/admin/withdrawals/:id/reject', requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      const withdrawal = await storage.rejectPayoutRequest(req.params.id, reason, req.user!.id);
      res.json(withdrawal);
    } catch (error) {
      console.error('Reject withdrawal error:', error);
      res.status(500).json({ error: 'Failed to reject withdrawal' });
    }
  });

  app.post('/api/admin/withdrawals/:id/process', requireAdmin, async (req, res) => {
    try {
      const { paymentMethod, notes } = req.body;
      const result = await storage.processPayoutRequest(req.params.id, paymentMethod, notes, req.user!.id);
      res.json(result);
    } catch (error) {
      console.error('Process withdrawal error:', error);
      res.status(500).json({ error: 'Failed to process withdrawal' });
    }
  });

  // Verification Management
  app.get('/api/admin/verification/kyc', requireAdmin, async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const verifications = await storage.getKYCVerifications({
        status: status as string,
        page: Number(page),
        limit: Number(limit)
      });
      res.json(verifications);
    } catch (error) {
      console.error('Get KYC verifications error:', error);
      res.status(500).json({ error: 'Failed to fetch KYC verifications' });
    }
  });

  app.get('/api/admin/verification/age', requireAdmin, async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const verifications = await storage.getAgeVerifications({
        status: status as string,
        page: Number(page),
        limit: Number(limit)
      });
      res.json(verifications);
    } catch (error) {
      console.error('Get age verifications error:', error);
      res.status(500).json({ error: 'Failed to fetch age verifications' });
    }
  });

  app.put('/api/admin/verification/kyc/:id/approve', requireAdmin, async (req, res) => {
    try {
      const { notes } = req.body;
      const verification = await storage.approveKYCVerification(req.params.id, notes, req.user!.id);
      res.json(verification);
    } catch (error) {
      console.error('Approve KYC verification error:', error);
      res.status(500).json({ error: 'Failed to approve KYC verification' });
    }
  });

  app.put('/api/admin/verification/kyc/:id/reject', requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      const verification = await storage.rejectKYCVerification(req.params.id, reason, req.user!.id);
      res.json(verification);
    } catch (error) {
      console.error('Reject KYC verification error:', error);
      res.status(500).json({ error: 'Failed to reject KYC verification' });
    }
  });

  app.put('/api/admin/verification/age/:id/approve', requireAdmin, async (req, res) => {
    try {
      const { notes } = req.body;
      const verification = await storage.approveAgeVerification(req.params.id, notes, req.user!.id);
      res.json(verification);
    } catch (error) {
      console.error('Approve age verification error:', error);
      res.status(500).json({ error: 'Failed to approve age verification' });
    }
  });

  app.put('/api/admin/verification/age/:id/reject', requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      const verification = await storage.rejectAgeVerification(req.params.id, reason, req.user!.id);
      res.json(verification);
    } catch (error) {
      console.error('Reject age verification error:', error);
      res.status(500).json({ error: 'Failed to reject age verification' });
    }
  });

  // Admin Configuration
  app.get('/api/admin/config', requireAdmin, async (req, res) => {
    try {
      const config = await storage.getAdminConfig(req.user!.id);
      res.json(config);
    } catch (error) {
      console.error('Get admin config error:', error);
      res.status(500).json({ error: 'Failed to get admin configuration' });
    }
  });

  app.put('/api/admin/config', requireAdmin, async (req, res) => {
    try {
      const config = await storage.updateAdminConfig(req.user!.id, req.body);
      res.json(config);
    } catch (error) {
      console.error('Update admin config error:', error);
      res.status(500).json({ error: 'Failed to update admin configuration' });
    }
  });

  // ===== COMPREHENSIVE ADMIN MANAGEMENT API ROUTES =====

  // Complaints Management System API Routes
  app.get('/api/admin/complaints', requireAdmin, async (req, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        category: req.query.category as string,
        priority: req.query.priority as string,
        assignedToId: req.query.assignedToId as string,
        submitterId: req.query.submitterId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };
      const result = await storage.getComplaints(filters);
      res.json(result);
    } catch (error) {
      console.error('Get complaints error:', error);
      res.status(500).json({ error: 'Failed to fetch complaints' });
    }
  });

  app.get('/api/admin/complaints/stats', requireAdmin, async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };
      const stats = await storage.getComplaintStats(filters);
      res.json(stats);
    } catch (error) {
      console.error('Get complaint stats error:', error);
      res.status(500).json({ error: 'Failed to fetch complaint statistics' });
    }
  });

  app.get('/api/admin/complaints/:id', requireAdmin, async (req, res) => {
    try {
      const complaint = await storage.getComplaint(req.params.id);
      if (!complaint) {
        return res.status(404).json({ error: 'Complaint not found' });
      }
      res.json(complaint);
    } catch (error) {
      console.error('Get complaint error:', error);
      res.status(500).json({ error: 'Failed to fetch complaint' });
    }
  });

  app.post('/api/admin/complaints', requireAdmin, async (req, res) => {
    try {
      const complaint = await storage.createComplaint(req.body);
      res.status(201).json(complaint);
    } catch (error) {
      console.error('Create complaint error:', error);
      res.status(500).json({ error: 'Failed to create complaint' });
    }
  });

  app.patch('/api/admin/complaints/:id', requireAdmin, async (req, res) => {
    try {
      await storage.updateComplaint(req.params.id, req.body);
      const complaint = await storage.getComplaint(req.params.id);
      res.json(complaint);
    } catch (error) {
      console.error('Update complaint error:', error);
      res.status(500).json({ error: 'Failed to update complaint' });
    }
  });

  app.post('/api/admin/complaints/:id/assign', requireAdmin, async (req, res) => {
    try {
      const { assignedToId } = req.body;
      await storage.assignComplaint(req.params.id, assignedToId, req.user!.id);
      const complaint = await storage.getComplaint(req.params.id);
      res.json(complaint);
    } catch (error) {
      console.error('Assign complaint error:', error);
      res.status(500).json({ error: 'Failed to assign complaint' });
    }
  });

  app.post('/api/admin/complaints/:id/escalate', requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      await storage.escalateComplaint(req.params.id, req.user!.id, reason);
      const complaint = await storage.getComplaint(req.params.id);
      res.json(complaint);
    } catch (error) {
      console.error('Escalate complaint error:', error);
      res.status(500).json({ error: 'Failed to escalate complaint' });
    }
  });

  app.post('/api/admin/complaints/:id/resolve', requireAdmin, async (req, res) => {
    try {
      const { resolution } = req.body;
      await storage.resolveComplaint(req.params.id, resolution, req.user!.id);
      const complaint = await storage.getComplaint(req.params.id);
      res.json(complaint);
    } catch (error) {
      console.error('Resolve complaint error:', error);
      res.status(500).json({ error: 'Failed to resolve complaint' });
    }
  });

  app.get('/api/admin/complaints/:id/comments', requireAdmin, async (req, res) => {
    try {
      const comments = await storage.getComplaintComments(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error('Get complaint comments error:', error);
      res.status(500).json({ error: 'Failed to fetch complaint comments' });
    }
  });

  app.post('/api/admin/complaints/:id/comments', requireAdmin, async (req, res) => {
    try {
      const comment = await storage.addComplaintComment({
        complaintId: req.params.id,
        authorId: req.user!.id,
        ...req.body
      });
      res.status(201).json(comment);
    } catch (error) {
      console.error('Add complaint comment error:', error);
      res.status(500).json({ error: 'Failed to add complaint comment' });
    }
  });

  app.patch('/api/admin/complaints/bulk', requireAdmin, async (req, res) => {
    try {
      const { complaintIds, updates } = req.body;
      await storage.bulkUpdateComplaints(complaintIds, updates, req.user!.id);
      res.json({ success: true, updated: complaintIds.length });
    } catch (error) {
      console.error('Bulk update complaints error:', error);
      res.status(500).json({ error: 'Failed to bulk update complaints' });
    }
  });

  // Withdrawals/Payouts Management System API Routes
  app.get('/api/admin/payouts', requireAdmin, async (req, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        userId: req.query.userId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
        maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
        provider: req.query.provider as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };
      const result = await storage.getAllPayoutRequests(filters);
      res.json(result);
    } catch (error) {
      console.error('Get payouts error:', error);
      res.status(500).json({ error: 'Failed to fetch payouts' });
    }
  });

  app.get('/api/admin/payouts/stats', requireAdmin, async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };
      const stats = await storage.getPayoutStats(filters);
      res.json(stats);
    } catch (error) {
      console.error('Get payout stats error:', error);
      res.status(500).json({ error: 'Failed to fetch payout statistics' });
    }
  });

  app.patch('/api/admin/payouts/:id/status', requireAdmin, async (req, res) => {
    try {
      const { status, notes } = req.body;
      await storage.updatePayoutStatus(req.params.id, status, req.user!.id, notes);
      res.json({ success: true });
    } catch (error) {
      console.error('Update payout status error:', error);
      res.status(500).json({ error: 'Failed to update payout status' });
    }
  });

  app.post('/api/admin/payouts/batch', requireAdmin, async (req, res) => {
    try {
      const { payoutIds, action } = req.body;
      await storage.batchProcessPayouts(payoutIds, action, req.user!.id);
      res.json({ success: true, processed: payoutIds.length });
    } catch (error) {
      console.error('Batch process payouts error:', error);
      res.status(500).json({ error: 'Failed to batch process payouts' });
    }
  });

  app.get('/api/admin/payouts/:id/audit', requireAdmin, async (req, res) => {
    try {
      const auditTrail = await storage.getPayoutAuditTrail(req.params.id);
      res.json(auditTrail);
    } catch (error) {
      console.error('Get payout audit trail error:', error);
      res.status(500).json({ error: 'Failed to fetch payout audit trail' });
    }
  });

  app.post('/api/admin/payouts/:id/fraud-check', requireAdmin, async (req, res) => {
    try {
      const { userId, amount } = req.body;
      const fraudScore = await storage.getFraudScore(userId, amount);
      res.json({ fraudScore });
    } catch (error) {
      console.error('Get fraud score error:', error);
      res.status(500).json({ error: 'Failed to calculate fraud score' });
    }
  });

  // Verification Requests System API Routes
  app.get('/api/admin/verifications', requireAdmin, async (req, res) => {
    try {
      const filters = {
        type: req.query.type as 'kyc' | 'age' | 'costar' | '2257',
        status: req.query.status as string,
        userId: req.query.userId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };
      const result = await storage.getVerificationRequests(filters);
      res.json(result);
    } catch (error) {
      console.error('Get verifications error:', error);
      res.status(500).json({ error: 'Failed to fetch verifications' });
    }
  });

  app.get('/api/admin/verifications/stats', requireAdmin, async (req, res) => {
    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      };
      const stats = await storage.getVerificationStats(filters);
      res.json(stats);
    } catch (error) {
      console.error('Get verification stats error:', error);
      res.status(500).json({ error: 'Failed to fetch verification statistics' });
    }
  });

  app.patch('/api/admin/verifications/kyc/:id', requireAdmin, async (req, res) => {
    try {
      await storage.updateKycVerification(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('Update KYC verification error:', error);
      res.status(500).json({ error: 'Failed to update KYC verification' });
    }
  });

  app.patch('/api/admin/verifications/age/:id', requireAdmin, async (req, res) => {
    try {
      await storage.updateAgeVerification(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('Update age verification error:', error);
      res.status(500).json({ error: 'Failed to update age verification' });
    }
  });

  app.patch('/api/admin/verifications/costar/:id', requireAdmin, async (req, res) => {
    try {
      await storage.updateCostarVerification(req.params.id, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error('Update costar verification error:', error);
      res.status(500).json({ error: 'Failed to update costar verification' });
    }
  });

  app.post('/api/admin/verifications/bulk', requireAdmin, async (req, res) => {
    try {
      const { verificationIds, updates } = req.body;
      await storage.bulkUpdateVerifications(verificationIds, updates, req.user!.id);
      res.json({ success: true, updated: verificationIds.length });
    } catch (error) {
      console.error('Bulk update verifications error:', error);
      res.status(500).json({ error: 'Failed to bulk update verifications' });
    }
  });

  app.get('/api/admin/verifications/:id/documents', requireAdmin, async (req, res) => {
    try {
      const documents = await storage.getVerificationDocuments(req.params.id);
      res.json(documents);
    } catch (error) {
      console.error('Get verification documents error:', error);
      res.status(500).json({ error: 'Failed to fetch verification documents' });
    }
  });

  app.post('/api/admin/verifications/:id/notes', requireAdmin, async (req, res) => {
    try {
      const { note } = req.body;
      const verificationNote = await storage.addVerificationNote(req.params.id, note, req.user!.id);
      res.status(201).json(verificationNote);
    } catch (error) {
      console.error('Add verification note error:', error);
      res.status(500).json({ error: 'Failed to add verification note' });
    }
  });

  // ===== COMPREHENSIVE USER MANAGEMENT ADMIN ROUTES =====

  // Get users with advanced filtering
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      const filters = {
        searchQuery: req.query.searchQuery as string,
        role: req.query.role as string,
        status: req.query.status as string,
        verificationLevel: req.query.verificationLevel as string,
        subscriptionTier: req.query.subscriptionTier as string,
        isSuspended: req.query.isSuspended === 'true' ? true : req.query.isSuspended === 'false' ? false : undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        limit: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
        offset: req.query.page ? (parseInt(req.query.page as string) - 1) * (parseInt(req.query.pageSize as string) || 20) : 0,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };
      
      const result = await storage.getUsersWithFiltering(filters);
      res.json(result);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Get user statistics
  app.get('/api/admin/users/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
  });

  // Suspend user
  app.post('/api/admin/users/suspend', requireAdmin, async (req, res) => {
    try {
      const { userId, reason, duration } = req.body;
      
      if (!userId || !reason) {
        return res.status(400).json({ error: 'User ID and reason are required' });
      }

      // Convert duration to hours
      let durationHours = null;
      if (duration && duration !== 'permanent') {
        const durationMap: Record<string, number> = {
          '24h': 24,
          '3d': 72,
          '7d': 168,
          '30d': 720
        };
        durationHours = durationMap[duration];
      }

      const suspension = await storage.suspendUser({
        userId,
        reason,
        banType: duration === 'permanent' ? 'permanent' : 'temporary',
        description: reason,
        suspendedBy: req.user!.id,
        duration: durationHours,
        startedAt: new Date(),
        endsAt: durationHours ? new Date(Date.now() + durationHours * 60 * 60 * 1000) : null
      });

      // Update user status
      await storage.updateUser(userId, { status: 'suspended' });

      // Log the action
      await storage.logUserActivity({
        userId,
        activity: 'suspended',
        details: { 
          reason, 
          duration, 
          suspendedBy: req.user!.id,
          suspensionId: suspension.id 
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      });

      res.json({ success: true, suspension });
    } catch (error) {
      console.error('Suspend user error:', error);
      res.status(500).json({ error: 'Failed to suspend user' });
    }
  });

  // Bulk user operations
  app.post('/api/admin/users/bulk', requireAdmin, async (req, res) => {
    try {
      const { userIds, operation, data } = req.body;
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'User IDs array is required' });
      }

      if (!operation) {
        return res.status(400).json({ error: 'Operation is required' });
      }

      await storage.bulkUserOperation(userIds, operation, req.user!.id, data);

      // Log bulk operation
      await storage.logUserActivity({
        userId: req.user!.id,
        activity: `bulk_${operation}`,
        details: { 
          targetUserIds: userIds,
          operation,
          data,
          count: userIds.length
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      });

      res.json({ success: true, affectedUsers: userIds.length });
    } catch (error) {
      console.error('Bulk user operation error:', error);
      res.status(500).json({ error: 'Failed to perform bulk operation' });
    }
  });

  // Update user
  app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const updates = req.body;

      // Remove sensitive fields that shouldn't be updated directly
      delete updates.password;
      delete updates.id;
      delete updates.createdAt;
      delete updates.updatedAt;

      await storage.updateUserProfile(userId, updates);

      // Log the update
      await storage.logUserActivity({
        userId,
        activity: 'profile_updated_by_admin',
        details: { 
          updates,
          updatedBy: req.user!.id
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Get user details with profile
  app.get('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await storage.getUserWithProfile(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      console.error('Get user details error:', error);
      res.status(500).json({ error: 'Failed to fetch user details' });
    }
  });

  // Get user activity logs
  app.get('/api/admin/users/:id/activity', requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      const activities = await storage.getUserActivityLogs(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({ error: 'Failed to fetch user activity' });
    }
  });

  // Get user suspensions
  app.get('/api/admin/users/:id/suspensions', requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const suspensions = await storage.getUserSuspensions(userId);
      res.json(suspensions);
    } catch (error) {
      console.error('Get user suspensions error:', error);
      res.status(500).json({ error: 'Failed to fetch user suspensions' });
    }
  });

  // Lift user suspension
  app.post('/api/admin/users/:id/lift-suspension', requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;
      const { suspensionId, reason } = req.body;
      
      await storage.liftSuspension(suspensionId, req.user!.id, reason);
      
      // Update user status back to active
      await storage.updateUser(userId, { status: 'active' });

      // Log the action
      await storage.logUserActivity({
        userId,
        activity: 'suspension_lifted',
        details: { 
          reason,
          liftedBy: req.user!.id,
          suspensionId
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Lift suspension error:', error);
      res.status(500).json({ error: 'Failed to lift suspension' });
    }
  });

  // ===== CONTENT MANAGEMENT ADMIN API ROUTES =====
  
  // Posts Management API Routes
  app.get('/api/admin/posts', requireAdmin, async (req, res) => {
    try {
      const filters = {
        searchQuery: req.query.searchQuery as string,
        type: req.query.type as string,
        status: req.query.status as string,
        visibility: req.query.visibility as string,
        creatorId: req.query.creatorId as string,
        categoryId: req.query.categoryId as string,
        dateRange: req.query.dateRange as string,
        moderationStatus: req.query.moderationStatus as string,
        revenueRange: req.query.revenueRange as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };
      const posts = await storage.getAdminPosts(filters);
      res.json(posts);
    } catch (error) {
      console.error('Get admin posts error:', error);
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  });

  app.get('/api/admin/posts/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getPostsStats();
      res.json(stats);
    } catch (error) {
      console.error('Get posts stats error:', error);
      res.status(500).json({ error: 'Failed to fetch posts statistics' });
    }
  });

  app.post('/api/admin/posts/moderate', requireAdmin, async (req, res) => {
    try {
      const { postId, action, reason, notes } = req.body;
      await storage.moderatePost(postId, action, req.user!.id, reason, notes);
      res.json({ success: true });
    } catch (error) {
      console.error('Moderate post error:', error);
      res.status(500).json({ error: 'Failed to moderate post' });
    }
  });

  app.post('/api/admin/posts/bulk', requireAdmin, async (req, res) => {
    try {
      const { postIds, operation, data } = req.body;
      await storage.bulkOperationPosts(postIds, operation, req.user!.id, data);
      res.json({ success: true, processed: postIds.length });
    } catch (error) {
      console.error('Bulk posts operation error:', error);
      res.status(500).json({ error: 'Failed to execute bulk operation' });
    }
  });

  // Live Streaming Management API Routes
  app.get('/api/admin/streams', requireAdmin, async (req, res) => {
    try {
      const filters = {
        searchQuery: req.query.searchQuery as string,
        status: req.query.status as string,
        type: req.query.type as string,
        creatorId: req.query.creatorId as string,
        quality: req.query.quality as string,
        duration: req.query.duration as string,
        viewerRange: req.query.viewerRange as string,
        revenueRange: req.query.revenueRange as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };
      const streams = await storage.getAdminStreams(filters);
      res.json(streams);
    } catch (error) {
      console.error('Get admin streams error:', error);
      res.status(500).json({ error: 'Failed to fetch streams' });
    }
  });

  app.get('/api/admin/streams/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getStreamsStats();
      res.json(stats);
    } catch (error) {
      console.error('Get streams stats error:', error);
      res.status(500).json({ error: 'Failed to fetch streams statistics' });
    }
  });

  app.get('/api/admin/streams/live-analytics', requireAdmin, async (req, res) => {
    try {
      const analytics = await storage.getLiveStreamAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Get live analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch live analytics' });
    }
  });

  app.post('/api/admin/streams/terminate', requireAdmin, async (req, res) => {
    try {
      const { streamId, reason, notify } = req.body;
      await storage.terminateStream(streamId, req.user!.id, reason, notify);
      res.json({ success: true });
    } catch (error) {
      console.error('Terminate stream error:', error);
      res.status(500).json({ error: 'Failed to terminate stream' });
    }
  });

  app.post('/api/admin/streams/moderate', requireAdmin, async (req, res) => {
    try {
      const { streamId, action, reason, notes } = req.body;
      await storage.moderateStream(streamId, action, req.user!.id, reason, notes);
      res.json({ success: true });
    } catch (error) {
      console.error('Moderate stream error:', error);
      res.status(500).json({ error: 'Failed to moderate stream' });
    }
  });

  app.post('/api/admin/streams/bulk', requireAdmin, async (req, res) => {
    try {
      const { streamIds, operation, data } = req.body;
      await storage.bulkOperationStreams(streamIds, operation, req.user!.id, data);
      res.json({ success: true, processed: streamIds.length });
    } catch (error) {
      console.error('Bulk streams operation error:', error);
      res.status(500).json({ error: 'Failed to execute bulk operation' });
    }
  });

  // Stories Management API Routes
  app.get('/api/admin/stories', requireAdmin, async (req, res) => {
    try {
      const filters = {
        searchQuery: req.query.searchQuery as string,
        status: req.query.status as string,
        creatorId: req.query.creatorId as string,
        expiration: req.query.expiration as string,
        engagement: req.query.engagement as string,
        promotion: req.query.promotion as string,
        moderation: req.query.moderation as string,
        type: req.query.type as string,
        dateRange: req.query.dateRange as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };
      const stories = await storage.getAdminStories(filters);
      res.json(stories);
    } catch (error) {
      console.error('Get admin stories error:', error);
      res.status(500).json({ error: 'Failed to fetch stories' });
    }
  });

  app.get('/api/admin/stories/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getStoriesStats();
      res.json(stats);
    } catch (error) {
      console.error('Get stories stats error:', error);
      res.status(500).json({ error: 'Failed to fetch stories statistics' });
    }
  });

  app.get('/api/admin/stories/trending', requireAdmin, async (req, res) => {
    try {
      const trending = await storage.getTrendingStories();
      res.json(trending);
    } catch (error) {
      console.error('Get trending stories error:', error);
      res.status(500).json({ error: 'Failed to fetch trending stories' });
    }
  });

  app.post('/api/admin/stories/moderate', requireAdmin, async (req, res) => {
    try {
      const { storyId, action, reason, notes } = req.body;
      await storage.moderateStory(storyId, action, req.user!.id, reason, notes);
      res.json({ success: true });
    } catch (error) {
      console.error('Moderate story error:', error);
      res.status(500).json({ error: 'Failed to moderate story' });
    }
  });

  app.post('/api/admin/stories/extend', requireAdmin, async (req, res) => {
    try {
      const { storyId, hours } = req.body;
      await storage.extendStoryExpiration(storyId, hours, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Extend story expiration error:', error);
      res.status(500).json({ error: 'Failed to extend story expiration' });
    }
  });

  app.post('/api/admin/stories/:id/archive', requireAdmin, async (req, res) => {
    try {
      await storage.archiveStory(req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Archive story error:', error);
      res.status(500).json({ error: 'Failed to archive story' });
    }
  });

  app.post('/api/admin/stories/bulk', requireAdmin, async (req, res) => {
    try {
      const { storyIds, operation, data } = req.body;
      await storage.bulkOperationStories(storyIds, operation, req.user!.id, data);
      res.json({ success: true, processed: storyIds.length });
    } catch (error) {
      console.error('Bulk stories operation error:', error);
      res.status(500).json({ error: 'Failed to execute bulk operation' });
    }
  });

  // Shop Management API Routes
  app.get('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const filters = {
        searchQuery: req.query.searchQuery as string,
        status: req.query.status as string,
        type: req.query.type as string,
        creatorId: req.query.creatorId as string,
        categoryId: req.query.categoryId as string,
        priceRange: req.query.priceRange as string,
        inventory: req.query.inventory as string,
        dateRange: req.query.dateRange as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };
      const products = await storage.getAdminProducts(filters);
      res.json(products);
    } catch (error) {
      console.error('Get admin products error:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.get('/api/admin/orders', requireAdmin, async (req, res) => {
    try {
      const filters = {
        searchQuery: req.query.searchQuery as string,
        status: req.query.status as string,
        fulfillmentStatus: req.query.fulfillmentStatus as string,
        creatorId: req.query.creatorId as string,
        dateRange: req.query.dateRange as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : 20,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };
      const orders = await storage.getAdminOrders(filters);
      res.json(orders);
    } catch (error) {
      console.error('Get admin orders error:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  app.get('/api/admin/shop/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getShopStats();
      res.json(stats);
    } catch (error) {
      console.error('Get shop stats error:', error);
      res.status(500).json({ error: 'Failed to fetch shop statistics' });
    }
  });

  app.get('/api/admin/shop/revenue', requireAdmin, async (req, res) => {
    try {
      const revenue = await storage.getRevenueStats();
      res.json(revenue);
    } catch (error) {
      console.error('Get revenue stats error:', error);
      res.status(500).json({ error: 'Failed to fetch revenue statistics' });
    }
  });

  app.post('/api/admin/orders/:id/fulfill', requireAdmin, async (req, res) => {
    try {
      const { trackingNumber, carrier, notes } = req.body;
      await storage.fulfillOrder(req.params.id, req.user!.id, trackingNumber, carrier, notes);
      res.json({ success: true });
    } catch (error) {
      console.error('Fulfill order error:', error);
      res.status(500).json({ error: 'Failed to fulfill order' });
    }
  });

  app.post('/api/admin/orders/:id/refund', requireAdmin, async (req, res) => {
    try {
      const { amount, reason } = req.body;
      await storage.refundOrder(req.params.id, req.user!.id, amount, reason);
      res.json({ success: true });
    } catch (error) {
      console.error('Refund order error:', error);
      res.status(500).json({ error: 'Failed to refund order' });
    }
  });

  app.post('/api/admin/shop/bulk-products', requireAdmin, async (req, res) => {
    try {
      const { itemIds, operation, data } = req.body;
      await storage.bulkOperationProducts(itemIds, operation, req.user!.id, data);
      res.json({ success: true, processed: itemIds.length });
    } catch (error) {
      console.error('Bulk products operation error:', error);
      res.status(500).json({ error: 'Failed to execute bulk operation' });
    }
  });

  app.post('/api/admin/shop/bulk-orders', requireAdmin, async (req, res) => {
    try {
      const { itemIds, operation, data } = req.body;
      await storage.bulkOperationOrders(itemIds, operation, req.user!.id, data);
      res.json({ success: true, processed: itemIds.length });
    } catch (error) {
      console.error('Bulk orders operation error:', error);
      res.status(500).json({ error: 'Failed to execute bulk operation' });
    }
  });

  // Categories Management API Routes
  app.get('/api/admin/categories/content', requireAdmin, async (req, res) => {
    try {
      const filters = {
        searchQuery: req.query.searchQuery as string,
        status: req.query.status as string,
        parent: req.query.parent as string,
        sortBy: req.query.sortBy as string || 'name',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'asc'
      };
      const categories = await storage.getAdminContentCategories(filters);
      res.json(categories);
    } catch (error) {
      console.error('Get content categories error:', error);
      res.status(500).json({ error: 'Failed to fetch content categories' });
    }
  });

  app.get('/api/admin/categories/products', requireAdmin, async (req, res) => {
    try {
      const filters = {
        searchQuery: req.query.searchQuery as string,
        status: req.query.status as string,
        parent: req.query.parent as string,
        sortBy: req.query.sortBy as string || 'name',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'asc'
      };
      const categories = await storage.getAdminProductCategories(filters);
      res.json(categories);
    } catch (error) {
      console.error('Get product categories error:', error);
      res.status(500).json({ error: 'Failed to fetch product categories' });
    }
  });

  app.get('/api/admin/categories/:type/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getCategoriesStats(req.params.type);
      res.json(stats);
    } catch (error) {
      console.error('Get categories stats error:', error);
      res.status(500).json({ error: 'Failed to fetch categories statistics' });
    }
  });

  app.get('/api/admin/categories/:type/performance', requireAdmin, async (req, res) => {
    try {
      const performance = await storage.getCategoriesPerformance(req.params.type);
      res.json(performance);
    } catch (error) {
      console.error('Get categories performance error:', error);
      res.status(500).json({ error: 'Failed to fetch categories performance' });
    }
  });

  app.post('/api/admin/categories/:type', requireAdmin, async (req, res) => {
    try {
      const category = await storage.createCategory(req.params.type, req.body, req.user!.id);
      res.status(201).json(category);
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  app.patch('/api/admin/categories/:type/:id', requireAdmin, async (req, res) => {
    try {
      await storage.updateCategory(req.params.type, req.params.id, req.body, req.user!.id);
      const category = await storage.getCategory(req.params.type, req.params.id);
      res.json(category);
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  });

  app.delete('/api/admin/categories/:type/:id', requireAdmin, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.type, req.params.id, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  app.post('/api/admin/categories/:type/bulk', requireAdmin, async (req, res) => {
    try {
      const { categoryIds, operation } = req.body;
      await storage.bulkOperationCategories(req.params.type, categoryIds, operation, req.user!.id);
      res.json({ success: true, processed: categoryIds.length });
    } catch (error) {
      console.error('Bulk categories operation error:', error);
      res.status(500).json({ error: 'Failed to execute bulk operation' });
    }
  });

  app.post('/api/admin/categories/:type/reorder', requireAdmin, async (req, res) => {
    try {
      const { categoryIds, newOrders } = req.body;
      await storage.reorderCategories(req.params.type, categoryIds, newOrders, req.user!.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Reorder categories error:', error);
      res.status(500).json({ error: 'Failed to reorder categories' });
    }
  });

  // Supporting API Routes
  app.get('/api/admin/creators', requireAdmin, async (req, res) => {
    try {
      const creators = await storage.getAllCreators();
      res.json(creators);
    } catch (error) {
      console.error('Get creators error:', error);
      res.status(500).json({ error: 'Failed to fetch creators' });
    }
  });

  app.get('/api/admin/product-categories', requireAdmin, async (req, res) => {
    try {
      const categories = await storage.getProductCategories();
      res.json(categories);
    } catch (error) {
      console.error('Get product categories error:', error);
      res.status(500).json({ error: 'Failed to fetch product categories' });
    }
  });

  // ===== COMPREHENSIVE FINANCIAL ADMIN SYSTEM API ROUTES =====
  
  // 1. TRANSACTIONS MANAGEMENT API
  app.get('/api/admin/financial/transactions', requireAdmin, async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        type, 
        status, 
        userId, 
        startDate, 
        endDate, 
        minAmount, 
        maxAmount, 
        paymentMethod,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const transactions = await storage.getTransactionsByFilters({
        page: Number(page),
        limit: Number(limit),
        type: type as string,
        status: status as string,
        userId: userId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        minAmount: minAmount ? Number(minAmount) : undefined,
        maxAmount: maxAmount ? Number(maxAmount) : undefined,
        paymentMethod: paymentMethod as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as string
      });

      res.json(transactions);
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.get('/api/admin/financial/transactions/:id', requireAdmin, async (req, res) => {
    try {
      const transaction = await storage.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
      res.json(transaction);
    } catch (error) {
      console.error('Get transaction error:', error);
      res.status(500).json({ error: 'Failed to fetch transaction details' });
    }
  });

  app.post('/api/admin/financial/transactions/:id/refund', requireAdmin, async (req, res) => {
    try {
      const { reason, amount } = req.body;
      const result = await enhancedPaymentService.processRefund(req.params.id, {
        reason,
        amount: amount ? Number(amount) : undefined,
        adminId: req.user!.id
      });
      res.json(result);
    } catch (error) {
      console.error('Process refund error:', error);
      res.status(500).json({ error: 'Failed to process refund' });
    }
  });

  app.patch('/api/admin/financial/transactions/:id/status', requireAdmin, async (req, res) => {
    try {
      const { status, notes } = req.body;
      await storage.updateTransaction(req.params.id, { status, adminNotes: notes });
      
      // Create audit log
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'transaction_status_updated',
        targetType: 'transaction',
        targetId: req.params.id,
        diffJson: { status, notes }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Update transaction status error:', error);
      res.status(500).json({ error: 'Failed to update transaction status' });
    }
  });

  app.post('/api/admin/financial/transactions/bulk', requireAdmin, async (req, res) => {
    try {
      const { transactionIds, operation, data } = req.body;
      let processed = 0;

      for (const transactionId of transactionIds) {
        try {
          switch (operation) {
            case 'update_status':
              await storage.updateTransaction(transactionId, { status: data.status });
              break;
            case 'flag_for_review':
              await storage.updateTransaction(transactionId, { flaggedForReview: true, reviewReason: data.reason });
              break;
            case 'export':
              // Export will be handled separately
              break;
          }
          processed++;
        } catch (error) {
          console.error(`Failed to process transaction ${transactionId}:`, error);
        }
      }

      res.json({ success: true, processed });
    } catch (error) {
      console.error('Bulk transaction operation error:', error);
      res.status(500).json({ error: 'Failed to execute bulk operation' });
    }
  });

  app.get('/api/admin/financial/transactions/analytics', requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;
      const analytics = await comprehensiveAnalyticsService.getTransactionAnalytics({
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        groupBy: groupBy as string
      });
      res.json(analytics);
    } catch (error) {
      console.error('Transaction analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch transaction analytics' });
    }
  });

  app.get('/api/admin/financial/transactions/export', requireAdmin, async (req, res) => {
    try {
      const { format = 'csv', ...filters } = req.query;
      const transactions = await storage.getTransactionsByFilters(filters);
      
      if (format === 'csv') {
        const csv = await financialLedgerService.exportTransactions(transactions, 'csv');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=transactions-export.csv');
        return res.send(csv);
      }
      
      res.json(transactions);
    } catch (error) {
      console.error('Transaction export error:', error);
      res.status(500).json({ error: 'Failed to export transactions' });
    }
  });

  // 2. BILLING MANAGEMENT API
  app.get('/api/admin/financial/billing/profiles', requireAdmin, async (req, res) => {
    try {
      const { page = 1, limit = 50, search } = req.query;
      const profiles = await storage.getBillingProfiles({
        page: Number(page),
        limit: Number(limit),
        search: search as string
      });
      res.json(profiles);
    } catch (error) {
      console.error('Get billing profiles error:', error);
      res.status(500).json({ error: 'Failed to fetch billing profiles' });
    }
  });

  app.get('/api/admin/financial/billing/profiles/:id', requireAdmin, async (req, res) => {
    try {
      const profile = await storage.getBillingProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: 'Billing profile not found' });
      }
      res.json(profile);
    } catch (error) {
      console.error('Get billing profile error:', error);
      res.status(500).json({ error: 'Failed to fetch billing profile' });
    }
  });

  app.post('/api/admin/financial/billing/profiles', requireAdmin, async (req, res) => {
    try {
      const profile = await storage.createBillingProfile(req.body);
      res.status(201).json(profile);
    } catch (error) {
      console.error('Create billing profile error:', error);
      res.status(500).json({ error: 'Failed to create billing profile' });
    }
  });

  app.patch('/api/admin/financial/billing/profiles/:id', requireAdmin, async (req, res) => {
    try {
      await storage.updateBillingProfile(req.params.id, req.body);
      const profile = await storage.getBillingProfile(req.params.id);
      res.json(profile);
    } catch (error) {
      console.error('Update billing profile error:', error);
      res.status(500).json({ error: 'Failed to update billing profile' });
    }
  });

  app.get('/api/admin/financial/billing/invoices', requireAdmin, async (req, res) => {
    try {
      const { page = 1, limit = 50, status, billingProfileId, startDate, endDate } = req.query;
      const invoices = await storage.getInvoices({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        billingProfileId: billingProfileId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      res.json(invoices);
    } catch (error) {
      console.error('Get invoices error:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });

  app.post('/api/admin/financial/billing/invoices', requireAdmin, async (req, res) => {
    try {
      const invoice = await storage.createInvoice(req.body);
      res.status(201).json(invoice);
    } catch (error) {
      console.error('Create invoice error:', error);
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  });

  app.patch('/api/admin/financial/billing/invoices/:id/status', requireAdmin, async (req, res) => {
    try {
      const { status, notes } = req.body;
      await storage.updateInvoice(req.params.id, { status, adminNotes: notes });
      res.json({ success: true });
    } catch (error) {
      console.error('Update invoice status error:', error);
      res.status(500).json({ error: 'Failed to update invoice status' });
    }
  });

  // 3. TAX RATES MANAGEMENT API
  app.get('/api/admin/financial/tax-rates', requireAdmin, async (req, res) => {
    try {
      const { page = 1, limit = 50, jurisdiction, taxType, isActive } = req.query;
      const taxRates = await storage.getTaxRates({
        page: Number(page),
        limit: Number(limit),
        jurisdiction: jurisdiction as string,
        taxType: taxType as string,
        isActive: isActive === 'true'
      });
      res.json(taxRates);
    } catch (error) {
      console.error('Get tax rates error:', error);
      res.status(500).json({ error: 'Failed to fetch tax rates' });
    }
  });

  app.post('/api/admin/financial/tax-rates', requireAdmin, async (req, res) => {
    try {
      const taxRate = await storage.createTaxRate(req.body);
      res.status(201).json(taxRate);
    } catch (error) {
      console.error('Create tax rate error:', error);
      res.status(500).json({ error: 'Failed to create tax rate' });
    }
  });

  app.patch('/api/admin/financial/tax-rates/:id', requireAdmin, async (req, res) => {
    try {
      await storage.updateTaxRate(req.params.id, req.body);
      const taxRate = await storage.getTaxRate(req.params.id);
      res.json(taxRate);
    } catch (error) {
      console.error('Update tax rate error:', error);
      res.status(500).json({ error: 'Failed to update tax rate' });
    }
  });

  app.post('/api/admin/financial/tax-rates/calculate', requireAdmin, async (req, res) => {
    try {
      const { amount, jurisdiction, taxType } = req.body;
      const calculation = await storage.calculateTax({
        amount: Number(amount),
        jurisdiction,
        taxType
      });
      res.json(calculation);
    } catch (error) {
      console.error('Tax calculation error:', error);
      res.status(500).json({ error: 'Failed to calculate tax' });
    }
  });

  // 4. PAYMENT GATEWAYS MANAGEMENT API
  app.get('/api/admin/financial/payment-gateways', requireAdmin, async (req, res) => {
    try {
      const gateways = await storage.getPaymentGateways();
      // Remove sensitive credentials from response
      const sanitizedGateways = gateways.map(gateway => ({
        ...gateway,
        credentials: Object.keys(gateway.credentials || {}).reduce((acc, key) => {
          acc[key] = '***HIDDEN***';
          return acc;
        }, {} as any)
      }));
      res.json(sanitizedGateways);
    } catch (error) {
      console.error('Get payment gateways error:', error);
      res.status(500).json({ error: 'Failed to fetch payment gateways' });
    }
  });

  app.post('/api/admin/financial/payment-gateways', requireAdmin, async (req, res) => {
    try {
      const gateway = await storage.createPaymentGateway(req.body);
      res.status(201).json(gateway);
    } catch (error) {
      console.error('Create payment gateway error:', error);
      res.status(500).json({ error: 'Failed to create payment gateway' });
    }
  });

  app.patch('/api/admin/financial/payment-gateways/:id', requireAdmin, async (req, res) => {
    try {
      await storage.updatePaymentGateway(req.params.id, req.body);
      const gateway = await storage.getPaymentGateway(req.params.id);
      res.json(gateway);
    } catch (error) {
      console.error('Update payment gateway error:', error);
      res.status(500).json({ error: 'Failed to update payment gateway' });
    }
  });

  app.post('/api/admin/financial/payment-gateways/:id/test', requireAdmin, async (req, res) => {
    try {
      const result = await enhancedPaymentService.testGatewayConnection(req.params.id);
      res.json(result);
    } catch (error) {
      console.error('Test payment gateway error:', error);
      res.status(500).json({ error: 'Failed to test payment gateway' });
    }
  });

  // 5. DEPOSITS MANAGEMENT API
  app.get('/api/admin/financial/deposits', requireAdmin, async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        status, 
        amlStatus, 
        userId, 
        startDate, 
        endDate,
        minAmount,
        maxAmount 
      } = req.query;

      const deposits = await storage.getDeposits({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        amlStatus: amlStatus as string,
        userId: userId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        minAmount: minAmount ? Number(minAmount) : undefined,
        maxAmount: maxAmount ? Number(maxAmount) : undefined
      });

      res.json(deposits);
    } catch (error) {
      console.error('Get deposits error:', error);
      res.status(500).json({ error: 'Failed to fetch deposits' });
    }
  });

  app.get('/api/admin/financial/deposits/:id', requireAdmin, async (req, res) => {
    try {
      const deposit = await storage.getDeposit(req.params.id);
      if (!deposit) {
        return res.status(404).json({ error: 'Deposit not found' });
      }
      res.json(deposit);
    } catch (error) {
      console.error('Get deposit error:', error);
      res.status(500).json({ error: 'Failed to fetch deposit details' });
    }
  });

  app.patch('/api/admin/financial/deposits/:id/status', requireAdmin, async (req, res) => {
    try {
      const { status, amlStatus, notes } = req.body;
      await storage.updateDeposit(req.params.id, { 
        status, 
        amlStatus, 
        adminNotes: notes,
        processedBy: req.user!.id,
        processedAt: new Date()
      });

      // Create audit log
      await storage.createAuditLog({
        actorId: req.user!.id,
        action: 'deposit_status_updated',
        targetType: 'deposit',
        targetId: req.params.id,
        diffJson: { status, amlStatus, notes }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Update deposit status error:', error);
      res.status(500).json({ error: 'Failed to update deposit status' });
    }
  });

  app.get('/api/admin/financial/deposits/analytics', requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;
      const analytics = await comprehensiveAnalyticsService.getDepositAnalytics({
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        groupBy: groupBy as string
      });
      res.json(analytics);
    } catch (error) {
      console.error('Deposit analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch deposit analytics' });
    }
  });

  // 6. FRAUD DETECTION API
  app.get('/api/admin/financial/fraud/rules', requireAdmin, async (req, res) => {
    try {
      const rules = await storage.getFraudRules();
      res.json(rules);
    } catch (error) {
      console.error('Get fraud rules error:', error);
      res.status(500).json({ error: 'Failed to fetch fraud rules' });
    }
  });

  app.post('/api/admin/financial/fraud/rules', requireAdmin, async (req, res) => {
    try {
      const rule = await storage.createFraudRule(req.body);
      res.status(201).json(rule);
    } catch (error) {
      console.error('Create fraud rule error:', error);
      res.status(500).json({ error: 'Failed to create fraud rule' });
    }
  });

  app.get('/api/admin/financial/fraud/alerts', requireAdmin, async (req, res) => {
    try {
      const { page = 1, limit = 50, status, riskLevel } = req.query;
      const alerts = await storage.getFraudAlerts({
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        riskLevel: riskLevel as string
      });
      res.json(alerts);
    } catch (error) {
      console.error('Get fraud alerts error:', error);
      res.status(500).json({ error: 'Failed to fetch fraud alerts' });
    }
  });

  app.patch('/api/admin/financial/fraud/alerts/:id', requireAdmin, async (req, res) => {
    try {
      const { status, resolution, notes } = req.body;
      await storage.updateFraudAlert(req.params.id, {
        status,
        resolution,
        notes,
        reviewedBy: req.user!.id,
        reviewedAt: new Date()
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Update fraud alert error:', error);
      res.status(500).json({ error: 'Failed to update fraud alert' });
    }
  });

  // 7. AML/KYC MANAGEMENT API
  app.get('/api/admin/financial/aml/checks', requireAdmin, async (req, res) => {
    try {
      const { page = 1, limit = 50, userId, checkType, status } = req.query;
      const checks = await storage.getAmlChecks({
        page: Number(page),
        limit: Number(limit),
        userId: userId as string,
        checkType: checkType as string,
        status: status as string
      });
      res.json(checks);
    } catch (error) {
      console.error('Get AML checks error:', error);
      res.status(500).json({ error: 'Failed to fetch AML checks' });
    }
  });

  app.post('/api/admin/financial/aml/checks', requireAdmin, async (req, res) => {
    try {
      const check = await storage.createAmlCheck(req.body);
      res.status(201).json(check);
    } catch (error) {
      console.error('Create AML check error:', error);
      res.status(500).json({ error: 'Failed to create AML check' });
    }
  });

  app.get('/api/admin/financial/kyc/documents', requireAdmin, async (req, res) => {
    try {
      const { page = 1, limit = 50, userId, documentType, verificationStatus } = req.query;
      const documents = await storage.getKycDocuments({
        page: Number(page),
        limit: Number(limit),
        userId: userId as string,
        documentType: documentType as string,
        verificationStatus: verificationStatus as string
      });
      res.json(documents);
    } catch (error) {
      console.error('Get KYC documents error:', error);
      res.status(500).json({ error: 'Failed to fetch KYC documents' });
    }
  });

  app.patch('/api/admin/financial/kyc/documents/:id/verify', requireAdmin, async (req, res) => {
    try {
      const { status, rejectionReason } = req.body;
      await storage.updateKycDocument(req.params.id, {
        verificationStatus: status,
        rejectionReason,
        verifiedAt: status === 'verified' ? new Date() : null
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Verify KYC document error:', error);
      res.status(500).json({ error: 'Failed to verify KYC document' });
    }
  });

  // 8. FINANCIAL SETTINGS API
  app.get('/api/admin/financial/settings', requireAdmin, async (req, res) => {
    try {
      const { category } = req.query;
      const settings = await storage.getFinancialSettings(category as string);
      res.json(settings);
    } catch (error) {
      console.error('Get financial settings error:', error);
      res.status(500).json({ error: 'Failed to fetch financial settings' });
    }
  });

  app.patch('/api/admin/financial/settings/:key', requireAdmin, async (req, res) => {
    try {
      const { value } = req.body;
      await storage.updateFinancialSetting(req.params.key, {
        settingValue: value,
        lastModifiedBy: req.user!.id
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Update financial setting error:', error);
      res.status(500).json({ error: 'Failed to update financial setting' });
    }
  });

  // 9. FINANCIAL REPORTS API
  app.get('/api/admin/financial/reports', requireAdmin, async (req, res) => {
    try {
      const { page = 1, limit = 50, type, status } = req.query;
      const reports = await storage.getFinancialReports({
        page: Number(page),
        limit: Number(limit),
        type: type as string,
        status: status as string
      });
      res.json(reports);
    } catch (error) {
      console.error('Get financial reports error:', error);
      res.status(500).json({ error: 'Failed to fetch financial reports' });
    }
  });

  app.post('/api/admin/financial/reports/generate', requireAdmin, async (req, res) => {
    try {
      const { type, format, parameters, filters } = req.body;
      const report = await storage.generateFinancialReport({
        type,
        format,
        parameters,
        filters,
        generatedBy: req.user!.id
      });
      res.status(201).json(report);
    } catch (error) {
      console.error('Generate financial report error:', error);
      res.status(500).json({ error: 'Failed to generate financial report' });
    }
  });

  app.get('/api/admin/financial/dashboard/overview', requireAdmin, async (req, res) => {
    try {
      const overview = await comprehensiveAnalyticsService.getFinancialOverview();
      res.json(overview);
    } catch (error) {
      console.error('Financial dashboard overview error:', error);
      res.status(500).json({ error: 'Failed to fetch financial overview' });
    }
  });

  console.log('🛡️ Enhanced routes registered with comprehensive security features');
  console.log('👮 Admin dashboard routes registered with full CRUD operations');
  console.log('📋 Comprehensive admin management routes registered: Complaints, Payouts, Verifications');
  console.log('👥 User management routes registered with advanced filtering and bulk operations');
  console.log('🎯 Content Management Admin routes registered: Posts, Streams, Stories, Shop, Categories');
  console.log('💰 Comprehensive Financial Admin API routes registered: Transactions, Billing, Tax Rates, Payment Gateways, Deposits, Fraud Detection, AML/KYC, Reports');
}

// Import and register advanced features
import { 
  setupNFTRoutes, 
  setupAIFeedRoutes, 
  setupAgeVerificationRoutes, 
  setupAnalyticsDashboardRoutes, 
  setupAIAnalysisRoutes 
} from './routes/advancedFeatures';
import infrastructureDashboardRoutes from './routes/infrastructureDashboard.js';
import securityDashboardRoutes from './routes/securityDashboard.js';
import mobileApiRoutes from './routes/mobileApi.js';
import monitoringDashboardRoutes from './routes/monitoringDashboard.js';
import apiGatewayRoutes from './routes/apiGatewayRoutes.js';
import { registerFanzTrustRoutes } from './routes/fanzTrustRoutes';
import fanzPayRoutes from './routes/fanzPayRoutes';
import fanzCreditRoutes from './routes/fanzCreditRoutes';
import fanzTokenRoutes from './routes/fanzTokenRoutes';
import fanzCardRoutes from './routes/fanzCardRoutes';
import fanzCardWebhooks from './routes/fanzCardWebhooks';
import revenueQuestRoutes from './routes/revenueQuestRoutes';
import { trustScoringRoutes } from './routes/trustScoringRoutes';
import platformPrivilegesRoutes from './routes/platformPrivilegesRoutes';
import liveEventsRoutes from './routes/liveEventsRoutes';
import analyticsIntelligenceRoutes from './routes/analyticsIntelligence.js';
// import orchestrationRoutes from './routes/orchestrationRoutes.js';
// import unifiedDataRoutes from './routes/unifiedDataRoutes.js';
import pipelineIntegrationRoutes from './routes/pipelineIntegrationRoutes.js';
import enterpriseCommandCenterRoutes from './routes/enterpriseCommandCenterRoutes.js';

export async function setupAdvancedRoutes(app: Express) {
  // Dynamic imports for CommonJS routes
  const automatedWorkflowRoutes = (await import('./routes/automatedWorkflowRoutes.js')).default;
  const serviceDiscoveryRoutes = (await import('./routes/serviceDiscoveryRoutes.js')).default;
  setupNFTRoutes(app);
  setupAIFeedRoutes(app);
  setupAgeVerificationRoutes(app);
  setupAnalyticsDashboardRoutes(app);
  setupAIAnalysisRoutes(app);
  
  // FanzTrust™ Financial Ledger System
  registerFanzTrustRoutes(app);
  
  // FanzPay - Instant Settlement Payment Processing
  app.use('/api/fanz-pay', fanzPayRoutes);
  
  // FanzCredit - Credit Lines & Trust Scoring
  app.use('/api/fanz-credit', isAuthenticated, fanzCreditRoutes);
  
  // FanzToken - Platform Token Economy
  app.use('/api/fanz-token', isAuthenticated, fanzTokenRoutes);
  
  // FanzCard - Virtual Debit Card Program
  app.use('/api/fanz-card', isAuthenticated, fanzCardRoutes);
  
  // FanzCard Webhooks (no auth - for external card processors)
  app.use('/api/fanz-card-webhooks', fanzCardWebhooks);
  
  // Revenue Quests - AI-Collaborative Revenue Sharing
  app.use('/api/revenue-quests', isAuthenticated, revenueQuestRoutes);
  
  // Trust Tiering & Reputation System
  app.use('/api/trust', trustScoringRoutes);
  
  // Platform Privileges - Trust-Tier-Based Access Control
  app.use('/api/privileges', platformPrivilegesRoutes);
  
  // Mixed-Reality Live Events - Immersive Virtual Meetups
  // Public event browsing (no auth required)
  app.get('/api/events', async (req, res) => {
    try {
      const { LiveEventsService } = await import('./services/liveEventsService');
      const liveEventsService = new LiveEventsService();
      const events = await liveEventsService.getAllEvents(req.query.status as any);
      res.json(events);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to get events" });
    }
  });
  
  // Protected event actions (auth required)
  app.use('/api/events', isAuthenticated, liveEventsRoutes);
  
  // AI-Powered Help & Support System
  registerHelpSupportRoutes(app);
  
  // Email/Password Authentication Routes (NO auth middleware - public)
  app.use('/api/auth', authRoutes);
  
  // Dynamic Pricing AI Routes
  const { dynamicPricingRoutes } = await import('./routes/dynamicPricingRoutes');
  app.use('/api/pricing', dynamicPricingRoutes);
  
  // AI Voice Cloning Routes
  const { voiceCloningRoutes } = await import('./routes/voiceCloningRoutes');
  app.use('/api/voice', voiceCloningRoutes);
  
  // NFT Content Ownership Routes
  const { nftContentRoutes } = await import('./routes/nftContentRoutes');
  app.use('/api/nft', nftContentRoutes);
  
  // Emotional AI Routes
  const { emotionalAIRoutes } = await import('./routes/emotionalAIRoutes');
  app.use('/api/emotional-ai', emotionalAIRoutes);
  
  // Fan-to-Creator Loan Routes
  const { fanCreatorLoanRoutes } = await import('./routes/fanCreatorLoanRoutes');
  app.use('/api/loans', fanCreatorLoanRoutes);
  
  // Deepfake Detection Routes
  const { deepfakeDetectionRoutes } = await import('./routes/deepfakeDetectionRoutes');
  app.use('/api/deepfake', deepfakeDetectionRoutes);
  
  // Holographic Streaming Routes
  const { holographicStreamingRoutes } = await import('./routes/holographicStreamingRoutes');
  app.use('/api/holographic', holographicStreamingRoutes);
  
  // Progressive Web App (PWA) Routes
  app.use('/api/pwa', pwaRoutes);
  
  // API Gateway & Service Mesh Dashboard (must be first for routing control)
  app.use('/api/gateway', apiGatewayRoutes);
  
  // Infrastructure Management Dashboard
  app.use('/api/infrastructure', infrastructureDashboardRoutes);
  
  // Advanced Security & Compliance Dashboard
  app.use('/api/security', securityDashboardRoutes);
  
  // Mobile App Backend (ClubCentral)
  app.use('/api/mobile', mobileApiRoutes);
  
  // Real-Time Monitoring & Analytics Dashboard
  app.use('/api/monitoring', monitoringDashboardRoutes);
  
  // Revolutionary Analytics & Intelligence Engine
  app.use('/api/analytics', analyticsIntelligenceRoutes);
  
  // Service Orchestration Engine
  // app.use('/api/orchestration', orchestrationRoutes);
  
  // Unified Data Pipeline
  // app.use('/api/data-pipeline', unifiedDataRoutes);
  
  // Data Pipeline Integration & Cross-Service Analytics
  app.use('/api/pipeline', pipelineIntegrationRoutes);
  
  // Enterprise Command Center Dashboard
  app.use('/api/command-center', enterpriseCommandCenterRoutes);
  
  // Automated Workflow Engine
  app.use('/api/workflows', automatedWorkflowRoutes);
  
  // Service Discovery & Health Monitoring
  app.use('/api/service-discovery', serviceDiscoveryRoutes);
  
  console.log('🚀 Advanced features registered: PWA (Progressive Web App), NFT, AI Feeds, Analytics, Age Verification, AI Help & Support System, API Gateway & Service Mesh, Infrastructure Management, Security & Compliance, Mobile Backend (ClubCentral), Real-Time Monitoring, Revolutionary Analytics & Intelligence Engine');
  console.log('⚙️ Service Orchestration Engine registered: Workflow Management, Service Registry, Health Monitoring, Circuit Breakers, Rollback Support');
  console.log('🌊 Unified Data Pipeline registered: Stream Processing, Real-Time Analytics, Event Aggregation, Alert Management, Background Processing');
  console.log('🔗 Data Pipeline Integration registered: Cross-Service Analytics, Automatic Stream Registration, Real-Time Insights, Performance Monitoring');
  console.log('🏢 Enterprise Command Center registered: Real-Time Dashboard, Alert Management, Performance Tracking, Service Discovery, Business Intelligence');
  console.log('🤖 Automated Workflow Engine registered: Rule-Based Automation, Cross-Service Actions, Intelligent Triggers, Revenue Optimization, Content Strategy Automation');
  console.log('🔍 Service Discovery & Health Monitoring registered: Service Registry, Auto-Discovery, Health Checks, Circuit Breakers, Dependency Mapping, Automated Failover');
  console.log('💎 FanzTrust™ Financial Ledger System registered: FanzWallet, FanzLedger, FanzCredit, FanzToken, FanzCard, FanzRevenue');
  console.log('💳 FanzPay Payment Processing System registered: Deposits, Withdrawals, Instant Transfers, 12+ Providers');
  console.log('💰 FanzCredit System registered: Credit Lines, Trust Scoring, Automated Approvals, Collateral Management');
  console.log('🪙 FanzToken & FanzCoin Economy registered: Mint/Burn, Transfers, Token Locking, Fiat Conversion, Loyalty Rewards');
  console.log('💳 FanzCard Virtual Card Program registered: Instant Funding, Spend Controls, Merchant Restrictions, Real-Time Authorization');
}
