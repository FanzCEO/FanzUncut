import { storage } from '../storage';
import { notificationService } from './notificationService';

interface MassMessageRequest {
  senderId: string;
  content: string;
  type: 'text' | 'photo' | 'video' | 'tip';
  mediaUrl?: string;
  priceCents?: number;
  targetSegment: 'all_fans' | 'paying_fans' | 'high_spenders' | 'recent_activity' | 'custom';
  customRecipientIds?: string[];
  scheduledAt?: Date;
}

interface FanSegment {
  id: string;
  type: 'all_fans' | 'paying_fans' | 'high_spenders' | 'recent_activity' | 'custom';
  criteria: {
    minSpentCents?: number;
    daysActive?: number;
    subscriptionActive?: boolean;
    lastActivityDays?: number;
  };
}

interface MassMessageJob {
  id: string;
  senderId: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  messageContent: string;
  priceCents: number;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export class MassMessagingService {
  private activeJobs = new Map<string, MassMessageJob>();

  // Send mass message to fans
  async sendMassMessage(request: MassMessageRequest): Promise<{ jobId: string; estimatedRecipients: number }> {
    console.log(`📢 Starting mass message send for creator ${request.senderId}`);
    
    try {
      // Get recipient list based on segment
      const recipients = await this.getRecipientsForSegment(request.senderId, request.targetSegment, request.customRecipientIds);
      
      if (recipients.length === 0) {
        throw new Error('No recipients found for the selected segment');
      }

      // Create mass message job
      const jobId = `mass_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const job: MassMessageJob = {
        id: jobId,
        senderId: request.senderId,
        totalRecipients: recipients.length,
        sentCount: 0,
        failedCount: 0,
        status: 'pending',
        messageContent: request.content,
        priceCents: request.priceCents || 0,
        scheduledAt: request.scheduledAt
      };

      this.activeJobs.set(jobId, job);

      // Start processing (async)
      if (!request.scheduledAt || request.scheduledAt <= new Date()) {
        this.processMassMessageJob(job, request, recipients);
      } else {
        console.log(`📅 Mass message scheduled for ${request.scheduledAt}`);
        // In production: Use a job queue like Bull/BullMQ for scheduled messages
      }

      return { 
        jobId, 
        estimatedRecipients: recipients.length 
      };

    } catch (error) {
      console.error('❌ Mass message send failed:', error);
      throw error;
    }
  }

  // Get recipients based on fan segment
  private async getRecipientsForSegment(
    creatorId: string, 
    segment: string, 
    customIds?: string[]
  ): Promise<string[]> {
    console.log(`🎯 Getting recipients for segment: ${segment}`);

    switch (segment) {
      case 'all_fans':
        return await this.getAllFans(creatorId);
      
      case 'paying_fans':
        return await this.getPayingFans(creatorId);
      
      case 'high_spenders':
        return await this.getHighSpenders(creatorId);
      
      case 'recent_activity':
        return await this.getRecentlyActiveFans(creatorId);
      
      case 'custom':
        return customIds || [];
      
      default:
        throw new Error(`Unknown segment type: ${segment}`);
    }
  }

  // Get all fans (subscribers)
  private async getAllFans(creatorId: string): Promise<string[]> {
    try {
      // In production: query subscriptions table for active subscribers
      // For now, simulate with users who have messaged this creator
      const conversations = await storage.getUserConversations(creatorId);
      return conversations.map(conv => conv.userId);
    } catch (error) {
      console.error('❌ Error getting all fans:', error);
      return [];
    }
  }

  // Get fans who have made purchases
  private async getPayingFans(creatorId: string): Promise<string[]> {
    try {
      // Query users who have purchased paid messages or subscriptions
      const conversations = await storage.getUserConversations(creatorId);
      // Filter for users who have paid messages (simplified)
      return conversations.filter(conv => 
        conv.lastMessage && conv.lastMessage.priceCents > 0 && conv.lastMessage.isPaid
      ).map(conv => conv.userId);
    } catch (error) {
      console.error('❌ Error getting paying fans:', error);
      return [];
    }
  }

  // Get high-spending fans (top 20% by spending)
  private async getHighSpenders(creatorId: string): Promise<string[]> {
    try {
      // Query top spenders by total amount spent
      // For now, simulate based on message activity
      const conversations = await storage.getUserConversations(creatorId);
      return conversations
        .filter(conv => conv.lastMessage)
        .slice(0, Math.ceil(conversations.length * 0.2)) // Top 20%
        .map(conv => conv.userId);
    } catch (error) {
      console.error('❌ Error getting high spenders:', error);
      return [];
    }
  }

  // Get recently active fans (last 7 days)
  private async getRecentlyActiveFans(creatorId: string): Promise<string[]> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const conversations = await storage.getUserConversations(creatorId);
      return conversations
        .filter(conv => 
          conv.lastMessage && 
          new Date(conv.lastMessage.createdAt) > sevenDaysAgo
        )
        .map(conv => conv.userId);
    } catch (error) {
      console.error('❌ Error getting recently active fans:', error);
      return [];
    }
  }

  // Process mass message job
  private async processMassMessageJob(
    job: MassMessageJob, 
    request: MassMessageRequest, 
    recipients: string[]
  ): Promise<void> {
    console.log(`⚡ Processing mass message job ${job.id} for ${recipients.length} recipients`);
    
    job.status = 'processing';
    job.startedAt = new Date();
    
    const batchSize = 50; // Process in batches to avoid overwhelming the system
    
    try {
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        await this.processBatch(job, request, batch);
        
        // Small delay between batches to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      job.status = 'completed';
      job.completedAt = new Date();
      
      console.log(`✅ Mass message job ${job.id} completed: ${job.sentCount} sent, ${job.failedCount} failed`);
      
      // Notify creator of completion
      await notificationService.sendNotification(job.senderId, {
        kind: 'system',
        payloadJson: {
          message: `Mass message sent to ${job.sentCount} fans successfully`,
          jobId: job.id,
          sentCount: job.sentCount,
          failedCount: job.failedCount,
          notificationType: 'mass_message_complete'
        }
      });
      
    } catch (error) {
      console.error(`❌ Mass message job ${job.id} failed:`, error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
    }
  }

  // Process a batch of recipients
  private async processBatch(
    job: MassMessageJob, 
    request: MassMessageRequest, 
    recipients: string[]
  ): Promise<void> {
    const promises = recipients.map(recipientId => 
      this.sendIndividualMessage(job, request, recipientId)
    );
    
    const results = await Promise.allSettled(promises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        job.sentCount++;
      } else {
        job.failedCount++;
        console.error(`❌ Failed to send message: ${result.reason}`);
      }
    });
  }

  // Send individual message to recipient
  private async sendIndividualMessage(
    job: MassMessageJob, 
    request: MassMessageRequest, 
    recipientId: string
  ): Promise<void> {
    try {
      // Create message record
      const messageData = {
        senderId: request.senderId,
        receiverId: recipientId,
        type: request.type,
        content: request.content,
        mediaUrl: request.mediaUrl,
        priceCents: request.priceCents || 0,
        isPaid: (request.priceCents || 0) > 0,
        isMassMessage: true
      };

      const message = await storage.createMessage(messageData);
      
      // Send real-time notification
      await notificationService.sendNotification(recipientId, {
        kind: 'fan_activity',
        payloadJson: {
          message: `New message from ${request.senderId}`,
          messageId: message.id,
          senderId: request.senderId,
          type: request.type,
          isPaid: messageData.isPaid,
          priceCents: messageData.priceCents,
          notificationType: 'new_message'
        }
      });
      
    } catch (error) {
      console.error(`❌ Failed to send message to ${recipientId}:`, error);
      throw error;
    }
  }

  // Get job status
  async getJobStatus(jobId: string): Promise<MassMessageJob | null> {
    return this.activeJobs.get(jobId) || null;
  }

  // Get all jobs for a creator
  getCreatorJobs(creatorId: string): MassMessageJob[] {
    return Array.from(this.activeJobs.values())
      .filter(job => job.senderId === creatorId)
      .sort((a, b) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0));
  }

  // Cancel scheduled job
  async cancelJob(jobId: string, creatorId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    
    if (!job || job.senderId !== creatorId) {
      return false;
    }
    
    if (job.status === 'processing') {
      throw new Error('Cannot cancel job that is currently processing');
    }
    
    if (job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      job.completedAt = new Date();
      return true;
    }
    
    return false;
  }

  // Get analytics for mass messaging
  async getMassMessageAnalytics(creatorId: string, days: number = 30): Promise<{
    totalSent: number;
    totalRevenue: number;
    openRate: number;
    responseRate: number;
    averageRecipientsPerMessage: number;
  }> {
    // In production: Query analytics from database
    // For now, simulate analytics
    const jobs = this.getCreatorJobs(creatorId);
    const recentJobs = jobs.filter(job => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return (job.startedAt && job.startedAt > cutoff) || false;
    });

    const totalSent = recentJobs.reduce((sum: number, job: MassMessageJob) => sum + job.sentCount, 0);
    const totalRevenue = recentJobs.reduce((sum: number, job: MassMessageJob) => sum + (job.sentCount * job.priceCents), 0);
    const averageRecipients = recentJobs.length > 0 
      ? totalSent / recentJobs.length 
      : 0;

    return {
      totalSent,
      totalRevenue: totalRevenue / 100, // Convert cents to dollars
      openRate: 0.65, // Simulated
      responseRate: 0.15, // Simulated
      averageRecipientsPerMessage: Math.round(averageRecipients)
    };
  }

  // Method aliases for API routes compatibility
  async createMassMessageJob(request: MassMessageRequest): Promise<{ jobId: string; estimatedRecipients: number }> {
    return this.sendMassMessage(request);
  }

  async getJobsByCreator(creatorId: string): Promise<MassMessageJob[]> {
    return this.getCreatorJobs(creatorId);
  }

  async getAnalytics(creatorId: string, days?: number): Promise<{
    totalSent: number;
    totalRevenue: number;
    openRate: number;
    responseRate: number;
    averageRecipientsPerMessage: number;
  }> {
    return this.getMassMessageAnalytics(creatorId, days);
  }
}

export const massMessagingService = new MassMessagingService();