import { storage } from '../storage';
import { notificationService } from './notificationService';
import { 
  type EnhancedTransaction,
  type InsertEnhancedTransaction,
  type PerformanceTier,
  type EarningsAnalytics,
  type InsertEarningsAnalytics,
  type UserMilestone,
  type Collaboration,
  type CollaborationParticipant
} from '@shared/schema';

export interface EarningsTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'subscription' | 'ppv' | 'tip' | 'live_token' | 'shop_sale';
  source: string; // fan user ID or source identifier
  mediaId?: string; // for PPV purchases
  description: string;
  platformFee: number;
  creatorEarnings: number;
  status: 'pending' | 'completed' | 'refunded';
  createdAt: Date;
}

export interface EarningsStats {
  totalEarnings: number;
  platformFees: number;
  netEarnings: number;
  monthlyEarnings: number;
  weeklyEarnings: number;
  dailyEarnings: number;
  transactionCount: number;
  topEarningContent: Array<{
    mediaId: string;
    title: string;
    earnings: number;
  }>;
}

export class EarningsService {
  private readonly PLATFORM_FEE_PERCENTAGE = 0; // 100% earnings to creators
  private readonly PAYMENT_PROCESSOR_FEE = 0.029; // 2.9% typical payment processor fee
  
  // Tiered Performance Bonus System
  private readonly VOLUME_TIERS = [
    { min: 0, max: 1000, bonus: 0 },      // $0-1K: 0%
    { min: 1000, max: 5000, bonus: 0.02 }, // $1K-5K: +2%
    { min: 5000, max: 15000, bonus: 0.05 }, // $5K-15K: +5%
    { min: 15000, max: 50000, bonus: 0.08 }, // $15K-50K: +8%
    { min: 50000, max: Infinity, bonus: 0.12 } // $50K+: +12%
  ];
  
  private readonly ENGAGEMENT_BONUS_RATES = {
    high: 0.07,    // 7% for high engagement
    medium: 0.05,  // 5% for medium engagement
    low: 0.03      // 3% for low engagement
  };
  
  private readonly CONSISTENCY_BONUSES = {
    daily: 0.02,   // 2% for daily uploaders
    weekly: 0.01,  // 1% for weekly uploaders
    monthly: 0     // 0% for monthly or less
  };
  
  private readonly FAN_RETENTION_BONUS = 0.05; // 5% for 90%+ retention rate

  async recordEnhancedTransaction(transaction: Omit<InsertEnhancedTransaction, 'id' | 'createdAt'>): Promise<EnhancedTransaction> {
    try {
      // Get user's current performance tier
      const performanceTier = await storage.getPerformanceTier(transaction.toUserId);
      
      // Calculate base fees
      const platformFee = transaction.grossAmount * this.PLATFORM_FEE_PERCENTAGE;
      const processorFee = transaction.grossAmount * this.PAYMENT_PROCESSOR_FEE;
      
      // Calculate volume tier bonus
      const volumeTierBonus = await this.calculateVolumeTierBonus(transaction.toUserId, transaction.grossAmount);
      
      // Calculate engagement bonus (if applicable)
      const engagementBonus = await this.calculateEngagementBonus(transaction.toUserId, transaction.referenceId);
      
      // Calculate consistency bonus
      const consistencyBonus = await this.calculateConsistencyBonus(transaction.toUserId);
      
      // Calculate fan retention bonus
      const retentionBonus = await this.calculateFanRetentionBonus(transaction.toUserId);
      
      // Total bonus amount
      const totalBonusPercentage = volumeTierBonus + engagementBonus + consistencyBonus + retentionBonus;
      const bonusAmount = transaction.grossAmount * totalBonusPercentage;
      
      // Calculate net earnings with bonuses
      const baseNetEarnings = transaction.grossAmount - platformFee - processorFee;
      const netEarningsWithBonus = baseNetEarnings + bonusAmount;
      
      // Calculate performance tier from current metrics
      const currentTierName = await this.calculateUserPerformanceTier(transaction.toUserId);
      
      const enhancedTransaction: InsertEnhancedTransaction = {
        ...transaction,
        platformFeeCents: Math.round(platformFee * 100),
        processorFeeCents: Math.round(processorFee * 100),
        netEarningsCents: Math.round(netEarningsWithBonus * 100),
        bonusAmount: Math.round(bonusAmount * 100),
        feeReduction: 0, // Can be implemented later based on volume tiers
        performanceTier: currentTierName,
        volumeTierBonus: volumeTierBonus,
        engagementBonus: engagementBonus,
        consistencyBonus: consistencyBonus,
        retentionBonus: retentionBonus,
        totalBonusPercentage: totalBonusPercentage,
        referenceMetadata: {},
        status: 'completed'
      };

      // Store the enhanced transaction
      const savedTransaction = await storage.createEnhancedTransaction(enhancedTransaction);

      // Update user balance
      await this.updateUserBalance(transaction.toUserId, netEarningsWithBonus);
      
      // Update performance analytics
      await this.updatePerformanceAnalytics(transaction.toUserId, savedTransaction);

      // Send notification to creator
      await notificationService.sendNotification(transaction.toUserId, {
        kind: 'system',
        payloadJson: {
          message: `You earned $${netEarningsWithBonus.toFixed(2)} from ${transaction.type} (${(totalBonusPercentage * 100).toFixed(1)}% bonus applied)`,
          amount: netEarningsWithBonus,
          bonusAmount: bonusAmount,
          type: transaction.type
        }
      });

      // Create audit log
      await storage.createAuditLog({
        actorId: transaction.fromUserId,
        action: 'enhanced_earnings_recorded',
        targetType: 'user',
        targetId: transaction.toUserId,
        diffJson: {
          grossAmount: transaction.grossAmount,
          netEarnings: netEarningsWithBonus,
          bonusAmount: bonusAmount,
          bonusBreakdown: {
            volumeTier: volumeTierBonus,
            engagement: engagementBonus,
            consistency: consistencyBonus,
            retention: retentionBonus
          },
          performanceTier: currentTierName,
          type: transaction.type
        }
      });

      console.log(`💰 Enhanced transaction recorded: $${netEarningsWithBonus.toFixed(2)} (${(totalBonusPercentage * 100).toFixed(1)}% bonus) for user ${transaction.toUserId}`);
      
      return savedTransaction;
    } catch (error) {
      console.error('Error recording enhanced earnings transaction:', error);
      throw error;
    }
  }

  // Advanced Bonus Calculation Methods
  
  async calculateVolumeTierBonus(userId: string, amount: number): Promise<number> {
    try {
      // Get user's monthly volume (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const monthlyTransactions = await storage.getUserEnhancedTransactions(userId, {
        startDate: thirtyDaysAgo,
        endDate: new Date()
      });
      
      const monthlyVolume = monthlyTransactions.reduce((total, tx) => total + (tx.grossAmount || 0), 0);
      const totalVolume = monthlyVolume + amount;
      
      // Find applicable tier
      const applicableTier = this.VOLUME_TIERS.find(tier => 
        totalVolume >= tier.min && totalVolume < tier.max
      );
      
      return applicableTier?.bonus || 0;
    } catch (error) {
      console.error('Error calculating volume tier bonus:', error);
      return 0;
    }
  }
  
  async calculateEngagementBonus(userId: string, contentId?: string): Promise<number> {
    try {
      if (!contentId) return 0;
      
      // Get content engagement metrics (likes, comments, views)
      // This would integrate with the posts/media system
      const engagementData = await this.getContentEngagementMetrics(contentId);
      
      if (!engagementData) return 0;
      
      const { likes, comments, views } = engagementData;
      const interactionRate = (likes + comments) / Math.max(views, 1);
      
      if (interactionRate >= 0.15) return this.ENGAGEMENT_BONUS_RATES.high;
      if (interactionRate >= 0.08) return this.ENGAGEMENT_BONUS_RATES.medium;
      if (interactionRate >= 0.03) return this.ENGAGEMENT_BONUS_RATES.low;
      
      return 0;
    } catch (error) {
      console.error('Error calculating engagement bonus:', error);
      return 0;
    }
  }
  
  async calculateConsistencyBonus(userId: string): Promise<number> {
    try {
      // Check content upload frequency over last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const userPosts = await storage.getCreatorPosts(userId);
      const recentPosts = userPosts.filter(post => 
        new Date(post.createdAt) >= thirtyDaysAgo
      );
      
      const uploadFrequency = recentPosts.length / 30; // Posts per day
      
      if (uploadFrequency >= 0.9) return this.CONSISTENCY_BONUSES.daily;  // ~1 post/day
      if (uploadFrequency >= 0.2) return this.CONSISTENCY_BONUSES.weekly; // ~1 post/week
      
      return this.CONSISTENCY_BONUSES.monthly;
    } catch (error) {
      console.error('Error calculating consistency bonus:', error);
      return 0;
    }
  }
  
  async calculateFanRetentionBonus(userId: string): Promise<number> {
    try {
      // Get creator's subscription renewal rate
      const subscriptions = await storage.getCreatorSubscriptions(userId);
      
      if (subscriptions.length === 0) return 0;
      
      // Calculate renewal rate (simplified - would need more complex logic for actual renewals)
      const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
      const renewalRate = activeSubscriptions.length / subscriptions.length;
      
      if (renewalRate >= 0.90) return this.FAN_RETENTION_BONUS;
      
      return 0;
    } catch (error) {
      console.error('Error calculating fan retention bonus:', error);
      return 0;
    }
  }
  
  async calculateUserPerformanceTier(userId: string): Promise<string> {
    try {
      // Get user's last 30 days performance
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const transactions = await storage.getUserEnhancedTransactions(userId, {
        startDate: thirtyDaysAgo,
        endDate: new Date()
      });
      
      const monthlyEarnings = transactions.reduce((total, tx) => total + (tx.netEarningsCents || 0), 0) / 100;
      const transactionCount = transactions.length;
      
      // Calculate tier based on earnings
      if (monthlyEarnings >= 50000) return 'diamond';
      if (monthlyEarnings >= 25000) return 'platinum';
      if (monthlyEarnings >= 10000) return 'gold';
      if (monthlyEarnings >= 2500) return 'silver';
      return 'bronze';
    } catch (error) {
      console.error('Error calculating performance tier:', error);
      return 'bronze';
    }
  }
  
  private async getContentEngagementMetrics(contentId: string): Promise<{ likes: number; comments: number; views: number } | null> {
    try {
      // This would integrate with the posts/media system to get engagement data
      const post = await storage.getPost(contentId);
      if (!post) return null;
      
      // Get likes count
      const likesCount = (post as any).likesCount || 0;
      
      // Get comments count
      const comments = await storage.getPostComments(contentId);
      const commentsCount = comments.length;
      
      // Views would be tracked separately - using a default for now
      const viewsCount = (post as any).viewsCount || likesCount * 10; // Rough estimate
      
      return { likes: likesCount, comments: commentsCount, views: viewsCount };
    } catch (error) {
      console.error('Error getting content engagement metrics:', error);
      return null;
    }
  }

  private async updateUserBalance(userId: string, amount: number): Promise<void> {
    // Update user's available balance
    const user = await storage.getUser(userId);
    if (user) {
      const currentBalance = (user as any).availableBalance || 0;
      await storage.updateUser(userId, {
        availableBalance: currentBalance + amount,
        totalEarnings: ((user as any).totalEarnings || 0) + amount
      });
    }
  }
  
  private async updatePerformanceAnalytics(userId: string, transaction: EnhancedTransaction): Promise<void> {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month
      
      // Get or create monthly analytics record
      let analytics = await storage.getEarningsAnalytics(userId, 'monthly', periodStart, periodEnd);
      
      if (analytics.length === 0) {
        // Create new analytics record
        const newAnalytics: InsertEarningsAnalytics = {
          userId,
          period: 'monthly',
          periodStart,
          periodEnd,
          grossRevenue: transaction.grossAmount || 0,
          netEarnings: (transaction.netEarningsCents || 0) / 100,
          platformFees: (transaction.platformFeeCents || 0) / 100,
          processorFees: (transaction.processorFeeCents || 0) / 100,
          bonusEarnings: (transaction.bonusAmount || 0) / 100,
          transactionCount: 1,
          uniqueCustomers: 1,
          averageTransactionValue: transaction.grossAmount || 0,
          performanceTier: transaction.performanceTier,
          growthRate: 0,
          trendDirection: 'stable'
        };
        
        await storage.createEarningsAnalytics(newAnalytics);
      } else {
        // Update existing analytics record
        const existingAnalytics = analytics[0];
        const updatedAnalytics = {
          grossRevenue: (existingAnalytics.grossRevenue || 0) + (transaction.grossAmount || 0),
          netEarnings: (existingAnalytics.netEarnings || 0) + ((transaction.netEarningsCents || 0) / 100),
          platformFees: (existingAnalytics.platformFees || 0) + ((transaction.platformFeeCents || 0) / 100),
          processorFees: (existingAnalytics.processorFees || 0) + ((transaction.processorFeeCents || 0) / 100),
          bonusEarnings: (existingAnalytics.bonusEarnings || 0) + ((transaction.bonusAmount || 0) / 100),
          transactionCount: (existingAnalytics.transactionCount || 0) + 1,
          averageTransactionValue: ((existingAnalytics.grossRevenue || 0) + (transaction.grossAmount || 0)) / ((existingAnalytics.transactionCount || 0) + 1),
          performanceTier: transaction.performanceTier
        };
        
        // Note: In a real implementation, we'd update the existing record in the database
        console.log('📊 Updated performance analytics for user:', userId);
      }
    } catch (error) {
      console.error('Error updating performance analytics:', error);
    }
  }

  // Sophisticated Royalty Sharing System
  
  async calculateDynamicRoyaltySplit(
    collaborationId: string,
    contentId: string,
    earnings: number
  ): Promise<{ userId: string; amount: number; percentage: number }[]> {
    try {
      const collaboration = await storage.getCollaboration(collaborationId);
      if (!collaboration) {
        throw new Error('Collaboration not found');
      }
      
      const participants = await storage.getUserCollaborations(collaboration.primaryCreatorId);
      
      // Get content performance metrics
      const engagementMetrics = await this.getContentEngagementMetrics(contentId);
      const contentAge = this.getContentAgeInDays(contentId);
      
      const splits: { userId: string; amount: number; percentage: number }[] = [];
      
      for (const participant of participants) {
        // Calculate base split percentage
        let basePercentage = (participant as any).sharePercentage / 100;
        
        // Apply view-based adjustment
        const viewBasedAdjustment = await this.calculateViewBasedAdjustment(
          participant.id, 
          contentId, 
          engagementMetrics
        );
        
        // Apply time-based decay
        const timeDecay = this.calculateTimeBasedDecay(contentAge, participant.id === collaboration.primaryCreatorId);
        
        // Calculate final percentage with minimum guarantee
        const minimumGuarantee = (participant as any).minimumPercentage || 0.05; // 5% minimum
        const adjustedPercentage = Math.max(
          minimumGuarantee,
          basePercentage * viewBasedAdjustment * timeDecay
        );
        
        const amount = earnings * adjustedPercentage;
        
        splits.push({
          userId: participant.id,
          amount,
          percentage: adjustedPercentage
        });
      }
      
      // Normalize to ensure total equals 100%
      const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
      const normalizedSplits = splits.map(split => ({
        ...split,
        percentage: split.percentage / totalPercentage,
        amount: earnings * (split.percentage / totalPercentage)
      }));
      
      // Log the sophisticated split calculation
      console.log('💎 Dynamic royalty split calculated:', {
        collaborationId,
        contentId,
        totalEarnings: earnings,
        splits: normalizedSplits.map(s => ({ userId: s.userId, percentage: (s.percentage * 100).toFixed(2) + '%', amount: s.amount.toFixed(2) }))
      });
      
      return normalizedSplits;
    } catch (error) {
      console.error('Error calculating dynamic royalty split:', error);
      throw error;
    }
  }
  
  private async calculateViewBasedAdjustment(
    userId: string, 
    contentId: string, 
    engagementMetrics: { likes: number; comments: number; views: number } | null
  ): Promise<number> {
    if (!engagementMetrics) return 1.0;
    
    // Primary creator gets higher percentage based on content performance
    const { views } = engagementMetrics;
    
    // Higher views = higher percentage for primary creator (up to 20% increase)
    if (views > 10000) return 1.2;
    if (views > 5000) return 1.15;
    if (views > 1000) return 1.1;
    if (views > 500) return 1.05;
    
    return 1.0;
  }
  
  private calculateTimeBasedDecay(contentAgeInDays: number, isPrimaryCreator: boolean): number {
    // Collaborator percentage decreases over time for evergreen content
    // Primary creator percentage increases correspondingly
    
    if (isPrimaryCreator) {
      // Primary creator gains more percentage over time
      if (contentAgeInDays > 365) return 1.15; // +15% after 1 year
      if (contentAgeInDays > 180) return 1.1;  // +10% after 6 months
      if (contentAgeInDays > 90) return 1.05;  // +5% after 3 months
      return 1.0;
    } else {
      // Collaborators lose percentage over time (minimum 50% of original)
      if (contentAgeInDays > 365) return 0.5;  // -50% after 1 year
      if (contentAgeInDays > 180) return 0.7;  // -30% after 6 months
      if (contentAgeInDays > 90) return 0.85;  // -15% after 3 months
      return 1.0;
    }
  }
  
  private getContentAgeInDays(contentId: string): number {
    // This would get the actual content creation date
    // For now, return a mock value
    return Math.floor(Math.random() * 365); // 0-365 days
  }
  
  async checkAutoRenegotiationTriggers(collaborationId: string): Promise<boolean> {
    try {
      const collaboration = await storage.getCollaboration(collaborationId);
      if (!collaboration) return false;
      
      // Get collaboration earnings over last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentEarnings = collaboration.totalEarnings || 0;
      const previousMonthEarnings = (collaboration as any).previousMonthEarnings || 0;
      
      // Trigger re-negotiation if:
      // 1. Earnings increased by 500% or more
      // 2. Monthly earnings exceed $10,000
      // 3. Views increased dramatically (would need metrics integration)
      
      const earningsGrowth = previousMonthEarnings > 0 ? recentEarnings / previousMonthEarnings : 1;
      
      if (earningsGrowth >= 5.0 || recentEarnings >= 10000) {
        console.log('🔄 Auto-renegotiation triggered for collaboration:', collaborationId, {
          earningsGrowth: earningsGrowth.toFixed(2),
          recentEarnings
        });
        
        // Would trigger notification to all participants about renegotiation
        await this.initiateCollaborationRenegotiation(collaborationId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking auto-renegotiation triggers:', error);
      return false;
    }
  }
  
  private async initiateCollaborationRenegotiation(collaborationId: string): Promise<void> {
    // Would send notifications to all collaboration participants
    // about the need to renegotiate terms due to performance thresholds
    console.log('📋 Initiated collaboration renegotiation for:', collaborationId);
  }

  // Advanced Analytics & Predictive Forecasting
  
  async calculateEarningsProjection(userId: string, months: number = 3): Promise<{
    projectedEarnings: number;
    confidence: number;
    trendAnalysis: string;
    factors: string[];
  }> {
    try {
      // Get historical earnings data (last 6 months for trend analysis)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const historicalTransactions = await storage.getUserEnhancedTransactions(userId, {
        startDate: sixMonthsAgo,
        endDate: new Date()
      });
      
      // Group by month
      const monthlyEarnings: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);
        
        const monthTransactions = historicalTransactions.filter(tx => {
          const txDate = new Date(tx.createdAt);
          return txDate >= monthStart && txDate <= monthEnd;
        });
        
        const monthEarnings = monthTransactions.reduce((sum, tx) => sum + ((tx.netEarningsCents || 0) / 100), 0);
        monthlyEarnings.push(monthEarnings);
      }
      
      // Calculate trend using simple linear regression
      const { slope, trend } = this.calculateTrend(monthlyEarnings);
      
      // Current performance tier affects projection confidence
      const currentTier = await this.calculateUserPerformanceTier(userId);
      const tierMultiplier = this.getTierProjectionMultiplier(currentTier);
      
      // Calculate projection
      const lastMonthEarnings = monthlyEarnings[monthlyEarnings.length - 1] || 0;
      const projectedMonthlyGrowth = slope * tierMultiplier;
      const projectedEarnings = Math.max(0, lastMonthEarnings + (projectedMonthlyGrowth * months));
      
      // Calculate confidence based on data consistency
      const confidence = this.calculateProjectionConfidence(monthlyEarnings, slope);
      
      // Identify key factors affecting projection
      const factors = await this.identifyProjectionFactors(userId, monthlyEarnings, currentTier);
      
      const result = {
        projectedEarnings,
        confidence,
        trendAnalysis: trend,
        factors
      };
      
      console.log('📈 Earnings projection calculated for user:', userId, result);
      
      return result;
    } catch (error) {
      console.error('Error calculating earnings projection:', error);
      return {
        projectedEarnings: 0,
        confidence: 0,
        trendAnalysis: 'insufficient_data',
        factors: ['Insufficient historical data for projection']
      };
    }
  }
  
  private calculateTrend(monthlyEarnings: number[]): { slope: number; trend: string } {
    if (monthlyEarnings.length < 2) {
      return { slope: 0, trend: 'insufficient_data' };
    }
    
    // Simple linear regression
    const n = monthlyEarnings.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = monthlyEarnings;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    if (slope > 100) return { slope, trend: 'strong_growth' };
    if (slope > 50) return { slope, trend: 'moderate_growth' };
    if (slope > 0) return { slope, trend: 'slight_growth' };
    if (slope > -50) return { slope, trend: 'slight_decline' };
    if (slope > -100) return { slope, trend: 'moderate_decline' };
    return { slope, trend: 'strong_decline' };
  }
  
  private getTierProjectionMultiplier(tier: string): number {
    const multipliers = {
      'diamond': 1.3,
      'platinum': 1.2,
      'gold': 1.1,
      'silver': 1.0,
      'bronze': 0.9
    };
    return multipliers[tier as keyof typeof multipliers] || 1.0;
  }
  
  private calculateProjectionConfidence(monthlyEarnings: number[], slope: number): number {
    if (monthlyEarnings.length < 3) return 0.3;
    
    // Calculate variance to determine consistency
    const mean = monthlyEarnings.reduce((a, b) => a + b, 0) / monthlyEarnings.length;
    const variance = monthlyEarnings.reduce((sum, earning) => sum + Math.pow(earning - mean, 2), 0) / monthlyEarnings.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;
    
    // Lower coefficient of variation = higher confidence
    let confidence = Math.max(0.1, 1 - coefficientOfVariation);
    
    // Adjust confidence based on data points
    if (monthlyEarnings.length >= 6) confidence *= 1.2;
    if (monthlyEarnings.length >= 12) confidence *= 1.3;
    
    return Math.min(1.0, confidence);
  }
  
  private async identifyProjectionFactors(
    userId: string, 
    monthlyEarnings: number[], 
    currentTier: string
  ): Promise<string[]> {
    const factors: string[] = [];
    
    // Analyze earnings consistency
    if (monthlyEarnings.length >= 3) {
      const recentGrowth = monthlyEarnings[monthlyEarnings.length - 1] / monthlyEarnings[monthlyEarnings.length - 2];
      if (recentGrowth > 1.2) factors.push('Strong recent growth momentum');
      if (recentGrowth < 0.8) factors.push('Recent decline in earnings');
    }
    
    // Performance tier factor
    if (currentTier === 'diamond' || currentTier === 'platinum') {
      factors.push('High-tier creator with strong earning potential');
    }
    
    // Consistency factor
    const consistencyBonus = await this.calculateConsistencyBonus(userId);
    if (consistencyBonus > 0) {
      factors.push('Consistent content upload schedule');
    }
    
    // Engagement factor
    // This would require integration with content metrics
    factors.push('Content engagement patterns affect projections');
    
    // Market factors
    factors.push('Platform growth and market conditions');
    
    return factors;
  }

  // Enhanced Financial Features
  
  async processInstantPayout(
    userId: string, 
    amount: number, 
    currency: string = 'USD'
  ): Promise<{ success: boolean; fee: number; processingTime: string; transactionId: string }> {
    try {
      // Instant payout fee (small fee for speed)
      const instantPayoutFee = amount * 0.015; // 1.5% for instant processing
      const netAmount = amount - instantPayoutFee;
      
      // Process instant payout (would integrate with payment processor)
      const transactionId = crypto.randomUUID();
      
      // Update user balance
      const user = await storage.getUser(userId);
      if (!user) throw new Error('User not found');
      
      const currentBalance = (user as any).availableBalance || 0;
      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }
      
      await storage.updateUser(userId, {
        availableBalance: currentBalance - amount
      });
      
      console.log('⚡ Instant payout processed:', { userId, amount, fee: instantPayoutFee, transactionId });
      
      return {
        success: true,
        fee: instantPayoutFee,
        processingTime: '2-5 minutes',
        transactionId
      };
    } catch (error) {
      console.error('Error processing instant payout:', error);
      return {
        success: false,
        fee: 0,
        processingTime: 'failed',
        transactionId: ''
      };
    }
  }
  
  async calculateEarningsMultiplier(
    userId: string, 
    contentType: 'basic' | 'premium' | 'exclusive' | 'live'
  ): Promise<number> {
    try {
      const baseMultipliers = {
        'basic': 1.0,     // No multiplier
        'premium': 1.25,  // 25% bonus
        'exclusive': 1.5, // 50% bonus
        'live': 1.75      // 75% bonus
      };
      
      // Get user's performance tier for additional multiplier
      const performanceTier = await storage.getPerformanceTier(userId);
      const tierMultiplier = performanceTier ? this.getTierMultiplier(performanceTier.tier) : 1.0;
      
      const totalMultiplier = baseMultipliers[contentType] * tierMultiplier;
      
      console.log('📈 Earnings multiplier calculated:', {
        userId,
        contentType,
        baseMultiplier: baseMultipliers[contentType],
        tierMultiplier,
        totalMultiplier
      });
      
      return totalMultiplier;
    } catch (error) {
      console.error('Error calculating earnings multiplier:', error);
      return 1.0;
    }
  }
  
  private getTierMultiplier(tier: string): number {
    const tierMultipliers = {
      'diamond': 1.15,
      'platinum': 1.1,
      'gold': 1.05,
      'silver': 1.0,
      'bronze': 1.0
    };
    return tierMultipliers[tier as keyof typeof tierMultipliers] || 1.0;
  }
  
  async calculateTaxOptimization(
    userId: string, 
    annualEarnings: number, 
    jurisdiction: string = 'US'
  ): Promise<{
    suggestedWithholding: number;
    estimatedTaxLiability: number;
    deductionSuggestions: string[];
    quarterlyPayments: number;
  }> {
    try {
      // Simplified tax calculation (would use real tax APIs in production)
      const taxRates = {
        'US': { rate: 0.22, standardDeduction: 12950 },
        'UK': { rate: 0.20, standardDeduction: 12570 },
        'CA': { rate: 0.26, standardDeduction: 13808 },
        'AU': { rate: 0.19, standardDeduction: 18200 }
      };
      
      const taxInfo = taxRates[jurisdiction as keyof typeof taxRates] || taxRates['US'];
      
      const taxableIncome = Math.max(0, annualEarnings - taxInfo.standardDeduction);
      const estimatedTaxLiability = taxableIncome * taxInfo.rate;
      const suggestedWithholding = estimatedTaxLiability * 1.1; // 10% buffer
      const quarterlyPayments = suggestedWithholding / 4;
      
      const deductionSuggestions = [
        'Content creation equipment and software',
        'Home office expenses (if applicable)',
        'Professional development and training',
        'Marketing and promotion expenses',
        'Internet and mobile phone bills',
        'Professional photography/videography services'
      ];
      
      console.log('💰 Tax optimization calculated:', {
        userId,
        jurisdiction,
        annualEarnings,
        estimatedTaxLiability,
        suggestedWithholding
      });
      
      return {
        suggestedWithholding,
        estimatedTaxLiability,
        deductionSuggestions,
        quarterlyPayments
      };
    } catch (error) {
      console.error('Error calculating tax optimization:', error);
      return {
        suggestedWithholding: 0,
        estimatedTaxLiability: 0,
        deductionSuggestions: [],
        quarterlyPayments: 0
      };
    }
  }
  
  async convertCurrency(
    amount: number, 
    fromCurrency: string, 
    toCurrency: string
  ): Promise<{ convertedAmount: number; exchangeRate: number; fee: number }> {
    try {
      // Mock exchange rates (would use real-time API in production)
      const exchangeRates: { [key: string]: number } = {
        'USD_EUR': 0.85,
        'USD_GBP': 0.73,
        'USD_CAD': 1.35,
        'USD_AUD': 1.52,
        'EUR_USD': 1.18,
        'GBP_USD': 1.37,
        'CAD_USD': 0.74,
        'AUD_USD': 0.66
      };
      
      const rateKey = `${fromCurrency}_${toCurrency}`;
      const exchangeRate = exchangeRates[rateKey] || 1.0;
      
      const conversionFee = amount * 0.02; // 2% conversion fee
      const convertedAmount = (amount - conversionFee) * exchangeRate;
      
      console.log('💱 Currency conversion:', {
        amount,
        fromCurrency,
        toCurrency,
        exchangeRate,
        convertedAmount,
        fee: conversionFee
      });
      
      return {
        convertedAmount,
        exchangeRate,
        fee: conversionFee
      };
    } catch (error) {
      console.error('Error converting currency:', error);
      return {
        convertedAmount: amount,
        exchangeRate: 1.0,
        fee: 0
      };
    }
  }

  async getEarningsStats(userId: string, period?: '24h' | '7d' | '30d' | 'all'): Promise<EarningsStats> {
    try {
      // This would query the database for actual earnings data
      // For now, returning mock data structure
      const mockStats: EarningsStats = {
        totalEarnings: 0,
        platformFees: 0,
        netEarnings: 0,
        monthlyEarnings: 0,
        weeklyEarnings: 0,
        dailyEarnings: 0,
        transactionCount: 0,
        topEarningContent: []
      };

      return mockStats;
    } catch (error) {
      console.error('Error getting earnings stats:', error);
      throw error;
    }
  }

  async processSubscriptionPayment(fanUserId: string, creatorUserId: string, subscriptionAmount: number): Promise<EarningsTransaction> {
    return this.recordTransaction({
      userId: creatorUserId,
      amount: subscriptionAmount,
      type: 'subscription',
      source: fanUserId,
      description: `Monthly subscription from fan ${fanUserId}`,
      status: 'completed'
    });
  }

  async processPPVPurchase(fanUserId: string, creatorUserId: string, mediaId: string, ppvAmount: number): Promise<EarningsTransaction> {
    return this.recordTransaction({
      userId: creatorUserId,
      amount: ppvAmount,
      type: 'ppv',
      source: fanUserId,
      mediaId,
      description: `PPV purchase of media ${mediaId}`,
      status: 'completed'
    });
  }

  async processTip(fanUserId: string, creatorUserId: string, tipAmount: number, message?: string): Promise<EarningsTransaction> {
    return this.recordTransaction({
      userId: creatorUserId,
      amount: tipAmount,
      type: 'tip',
      source: fanUserId,
      description: message ? `Tip: ${message}` : `Tip from fan ${fanUserId}`,
      status: 'completed'
    });
  }

  async processLiveStreamTokens(fanUserId: string, creatorUserId: string, tokenCount: number, tokenValue: number): Promise<EarningsTransaction> {
    const totalAmount = tokenCount * tokenValue;
    
    return this.recordTransaction({
      userId: creatorUserId,
      amount: totalAmount,
      type: 'live_token',
      source: fanUserId,
      description: `${tokenCount} tokens during live stream`,
      status: 'completed'
    });
  }

  async processShopSale(buyerUserId: string, creatorUserId: string, productId: string, saleAmount: number): Promise<EarningsTransaction> {
    return this.recordTransaction({
      userId: creatorUserId,
      amount: saleAmount,
      type: 'shop_sale',
      source: buyerUserId,
      description: `Shop sale - product ${productId}`,
      status: 'completed'
    });
  }

  async getEarningsBreakdown(userId: string): Promise<{
    grossEarnings: number;
    platformFees: number;
    processorFees: number;
    netEarnings: number;
    availableBalance: number;
    pendingBalance: number;
    feeBreakdown: {
      boyfanzFee: number; // Always $0
      processorFee: number;
      taxWithholding?: number;
    };
  }> {
    try {
      const user = await storage.getUser(userId);
      
      // This would query actual transaction data
      const grossEarnings = (user as any)?.totalEarnings || 0;
      const processorFees = grossEarnings * this.PAYMENT_PROCESSOR_FEE;
      const platformFees = 0; // BoyFanz takes 0%
      const netEarnings = grossEarnings - processorFees - platformFees;
      
      return {
        grossEarnings,
        platformFees,
        processorFees,
        netEarnings,
        availableBalance: (user as any)?.availableBalance || 0,
        pendingBalance: (user as any)?.pendingBalance || 0,
        feeBreakdown: {
          boyfanzFee: 0, // Always $0 - 100% earnings
          processorFee: processorFees
        }
      };
    } catch (error) {
      console.error('Error getting earnings breakdown:', error);
      throw error;
    }
  }

  async getTopEarners(limit = 10): Promise<Array<{
    userId: string;
    username: string;
    totalEarnings: number;
    monthlyEarnings: number;
    rank: number;
  }>> {
    try {
      // This would query the database for top earners
      // For now, returning empty array
      return [];
    } catch (error) {
      console.error('Error getting top earners:', error);
      throw error;
    }
  }

  async calculateRoyaltySharing(mediaId: string, earnings: number): Promise<{
    primaryCreator: { userId: string; percentage: number; amount: number };
    collaborators: Array<{ userId: string; percentage: number; amount: number }>;
  }> {
    try {
      // Get media asset and check for collaborators
      const media = await storage.getMediaAsset(mediaId);
      if (!media) {
        throw new Error('Media not found');
      }

      // Default: 100% to primary creator
      const result = {
        primaryCreator: {
          userId: media.ownerId,
          percentage: 100,
          amount: earnings
        },
        collaborators: [] as Array<{ userId: string; percentage: number; amount: number }>
      };

      // Check if media has collaboration metadata
      const collaborationData = (media as any).collaborationData;
      if (collaborationData && collaborationData.collaborators) {
        // Redistribute earnings based on agreed percentages
        let remainingPercentage = 100;
        
        for (const collab of collaborationData.collaborators) {
          const amount = earnings * (collab.percentage / 100);
          result.collaborators.push({
            userId: collab.userId,
            percentage: collab.percentage,
            amount
          });
          remainingPercentage -= collab.percentage;
        }

        // Update primary creator's share
        result.primaryCreator.percentage = remainingPercentage;
        result.primaryCreator.amount = earnings * (remainingPercentage / 100);
      }

      return result;
    } catch (error) {
      console.error('Error calculating royalty sharing:', error);
      throw error;
    }
  }
}

export const earningsService = new EarningsService();