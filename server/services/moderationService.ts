import { storage } from "../storage";
import { notificationService } from "./notificationService";
import { aiModerationService } from "./aiModerationService";

class ModerationService {
  async addToQueue(mediaId: string, reason?: string) {
    try {
      // Get media asset for AI analysis
      const mediaAsset = await storage.getMediaAsset(mediaId);
      if (!mediaAsset) {
        throw new Error('Media asset not found');
      }

      // Perform AI analysis
      const aiResult = await aiModerationService.processAutoModeration(mediaAsset);
      
      // Update media asset with AI analysis
      await storage.updateMediaAsset(mediaId, {
        aiAnalysisJson: aiResult.analysis,
        riskScore: aiResult.analysis.riskScore,
        contentTags: aiResult.analysis.contentTags
      });

      if (aiResult.action === 'auto_approve') {
        await this.autoApprove(mediaId, aiResult.analysis);
        return;
      }
      
      if (aiResult.action === 'auto_reject') {
        await this.autoReject(mediaId, aiResult.analysis);
        return;
      }

      // Add to human review queue
      const priority = aiResult.analysis.riskScore > 70 ? 3 : 
                      aiResult.analysis.riskScore > 40 ? 2 : 1;
      
      const queueEntry = {
        mediaId,
        reason: reason || 'AI-flagged for human review',
        status: 'pending' as const,
        aiRecommendation: aiResult.analysis.recommendation,
        aiConfidence: aiResult.analysis.confidence,
        priority
      };

      console.log('Adding to moderation queue:', queueEntry);
      await storage.updateMediaAssetStatus(mediaId, 'pending');

      // Notify admins about new item in queue
      await notificationService.sendSystemNotification({
        kind: 'system',
        payloadJson: {
          message: `New content awaiting moderation (Risk: ${aiResult.analysis.riskScore})`,
          mediaId,
          priority,
          aiRecommendation: aiResult.analysis.recommendation
        }
      });

    } catch (error) {
      console.error('Error adding to moderation queue:', error);
      throw error;
    }
  }

  async autoApprove(mediaId: string, analysis: any) {
    await storage.updateMediaAssetStatus(mediaId, 'approved');
    
    const mediaAsset = await storage.getMediaAsset(mediaId);
    if (mediaAsset) {
      await notificationService.sendNotification(mediaAsset.ownerId, {
        kind: 'moderation',
        payloadJson: {
          message: 'Your content has been automatically approved',
          mediaTitle: mediaAsset.title,
          status: 'approved'
        }
      });
    }

    await storage.createAuditLog({
      actorId: 'system',
      action: 'content_auto_approved',
      targetType: 'media_asset',
      targetId: mediaId,
      diffJson: { analysis, confidence: analysis.confidence }
    });
  }

  async autoReject(mediaId: string, analysis: any) {
    await storage.updateMediaAssetStatus(mediaId, 'rejected');
    
    const mediaAsset = await storage.getMediaAsset(mediaId);
    if (mediaAsset) {
      await notificationService.sendNotification(mediaAsset.ownerId, {
        kind: 'moderation',
        payloadJson: {
          message: 'Your content was automatically rejected',
          mediaTitle: mediaAsset.title,
          status: 'rejected',
          reasons: analysis.flaggedReasons
        }
      });
    }

    await storage.createAuditLog({
      actorId: 'system',
      action: 'content_auto_rejected',
      targetType: 'media_asset',
      targetId: mediaId,
      diffJson: { analysis, reasons: analysis.flaggedReasons }
    });
  }

  async approve(queueId: string, reviewerId: string, notes?: string) {
    try {
      const queueItem = await storage.getModerationItem(queueId);
      if (!queueItem) {
        throw new Error('Moderation item not found');
      }

      // Update moderation queue item
      await storage.updateModerationItem(queueId, {
        status: 'approved',
        reviewerId,
        notes,
        decidedAt: new Date(),
      });

      // Update media asset status
      await storage.updateMediaAssetStatus(queueItem.mediaId, 'approved');

      // Get media asset to notify owner
      const mediaAsset = await storage.getMediaAsset(queueItem.mediaId);
      if (mediaAsset) {
        await notificationService.sendNotification(mediaAsset.ownerId, {
          kind: 'moderation',
          payloadJson: {
            message: 'Your content has been approved',
            mediaTitle: mediaAsset.title,
            status: 'approved'
          }
        });
      }

      // Create audit log
      await storage.createAuditLog({
        actorId: reviewerId,
        action: 'content_approved',
        targetType: 'media_asset',
        targetId: queueItem.mediaId,
        diffJson: { notes, queueId }
      });

    } catch (error) {
      console.error('Error approving content:', error);
      throw error;
    }
  }

  async reject(queueId: string, reviewerId: string, notes?: string) {
    try {
      const queueItem = await storage.getModerationItem(queueId);
      if (!queueItem) {
        throw new Error('Moderation item not found');
      }

      // Update moderation queue item
      await storage.updateModerationItem(queueId, {
        status: 'rejected',
        reviewerId,
        notes,
        decidedAt: new Date(),
      });

      // Update media asset status
      await storage.updateMediaAssetStatus(queueItem.mediaId, 'rejected');

      // Get media asset to notify owner
      const mediaAsset = await storage.getMediaAsset(queueItem.mediaId);
      if (mediaAsset) {
        await notificationService.sendNotification(mediaAsset.ownerId, {
          kind: 'moderation',
          payloadJson: {
            message: 'Your content has been rejected',
            mediaTitle: mediaAsset.title,
            status: 'rejected',
            reason: notes
          }
        });
      }

      // Create audit log
      await storage.createAuditLog({
        actorId: reviewerId,
        action: 'content_rejected',
        targetType: 'media_asset',
        targetId: queueItem.mediaId,
        diffJson: { notes, queueId }
      });

    } catch (error) {
      console.error('Error rejecting content:', error);
      throw error;
    }
  }
}

export const moderationService = new ModerationService();
