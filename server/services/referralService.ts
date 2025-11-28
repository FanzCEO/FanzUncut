import { nanoid } from 'nanoid';
import { storage } from '../storage';
import type {
  ReferralCode,
  InsertReferralCode,
  ReferralTracking,
  InsertReferralTracking,
  ReferralRelationship,
  InsertReferralRelationship,
  ReferralEarnings,
  InsertReferralEarnings,
  ReferralFraudEvent,
  InsertReferralFraudEvent,
  AffiliateProfile,
  InsertAffiliateProfile,
} from '@shared/schema';

export interface ReferralLinkData {
  code: string;
  userId: string;
  campaignId?: string;
  sourceUrl?: string;
  medium?: string;
  content?: string;
}

export interface ConversionData {
  convertedUserId: string;
  conversionType: 'signup' | 'purchase' | 'subscription' | 'deposit' | 'content_purchase';
  conversionValue?: number;
  sourceTransactionId?: string;
  metadata?: any;
}

export interface FraudCheckResult {
  flagged: boolean;
  riskScore: number;
  patterns: string[];
  autoBlock: boolean;
  reasons: string[];
}

export class ReferralService {
  
  // ===== REFERRAL CODE MANAGEMENT =====
  
  /**
   * Generate a unique referral code for a user
   */
  async generateReferralCode(
    userId: string, 
    options: {
      prefix?: string;
      campaignId?: string;
      customCode?: string;
      rewardType?: string;
      rewardValue?: number;
      description?: string;
      maxUses?: number;
      expiresAt?: Date;
    } = {}
  ): Promise<ReferralCode> {
    const {
      prefix = 'BF',
      campaignId,
      customCode,
      rewardType = 'percentage',
      rewardValue = 10,
      description,
      maxUses,
      expiresAt
    } = options;

    // Generate unique code
    let code: string;
    if (customCode) {
      // Validate custom code doesn't exist
      const existing = await storage.getReferralCodeByCode(customCode);
      if (existing) {
        throw new Error('Custom referral code already exists');
      }
      code = customCode.toUpperCase();
    } else {
      code = await this.generateUniqueCode(prefix);
    }

    const referralCodeData: InsertReferralCode = {
      userId,
      code,
      type: campaignId ? 'campaign' : 'standard',
      description,
      maxUses,
      expiresAt,
      rewardType,
      rewardValue: rewardValue.toString(),
      refereeRewardType: 'credits',
      refereeRewardValue: rewardType === 'percentage' ? '5.00' : '10.00',
      campaignId,
    };

    const referralCode = await storage.createReferralCode(referralCodeData);
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      action: 'referral_code_created',
      resourceType: 'referral_code',
      resourceId: referralCode.id,
      details: { code: referralCode.code, rewardType, rewardValue },
      ipAddress: '',
      userAgent: ''
    });

    return referralCode;
  }

  /**
   * Generate a tracking URL with embedded referral data
   */
  generateReferralLink(data: ReferralLinkData): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://boyfanz.com';
    const params = new URLSearchParams();
    
    params.set('ref', data.code);
    if (data.campaignId) params.set('campaign', data.campaignId);
    if (data.sourceUrl) params.set('source', data.sourceUrl);
    if (data.medium) params.set('medium', data.medium);
    if (data.content) params.set('content', data.content);
    
    // Add unique tracking ID for this specific link generation
    const trackingId = nanoid(12);
    params.set('tid', trackingId);

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate QR code data for referral sharing
   */
  generateQRCodeData(referralLink: string): string {
    // Return the referral link - QR code generation would be handled client-side
    return referralLink;
  }

  /**
   * Validate a referral code and return validity status
   */
  async validateReferralCode(code: string): Promise<{
    valid: boolean;
    code?: ReferralCode;
    reason?: string;
  }> {
    const referralCode = await storage.getReferralCodeByCode(code);
    
    if (!referralCode) {
      return { valid: false, reason: 'Code not found' };
    }

    if (referralCode.status !== 'active') {
      return { valid: false, reason: `Code is ${referralCode.status}` };
    }

    if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
      return { valid: false, reason: 'Code has expired' };
    }

    if (referralCode.maxUses && referralCode.currentUses >= referralCode.maxUses) {
      return { valid: false, reason: 'Code has reached maximum uses' };
    }

    return { valid: true, code: referralCode };
  }

  // ===== TRACKING & ATTRIBUTION =====

  /**
   * Track a referral click and create attribution record
   */
  async trackReferralClick(
    referralCode: string,
    trackingData: {
      userAgent?: string;
      ipAddress?: string;
      sourceUrl?: string;
      landingUrl?: string;
      country?: string;
      region?: string;
      city?: string;
      sessionId?: string;
      deviceFingerprint?: string;
    }
  ): Promise<ReferralTracking> {
    const codeValidation = await this.validateReferralCode(referralCode);
    
    if (!codeValidation.valid || !codeValidation.code) {
      throw new Error(`Invalid referral code: ${codeValidation.reason}`);
    }

    const code = codeValidation.code;
    
    // Generate unique click ID
    const clickId = nanoid(16);

    const trackingRecord: InsertReferralTracking = {
      referralCodeId: code.id,
      referrerId: code.userId,
      clickId,
      sourceUrl: trackingData.sourceUrl,
      landingUrl: trackingData.landingUrl,
      userAgent: trackingData.userAgent,
      ipAddress: trackingData.ipAddress,
      deviceFingerprint: trackingData.deviceFingerprint,
      country: trackingData.country,
      region: trackingData.region,
      city: trackingData.city,
      sessionId: trackingData.sessionId,
      attributionType: 'last_click' // Default attribution model
    };

    const tracking = await storage.createReferralTracking(trackingRecord);
    
    // Update click count on referral code
    await storage.incrementReferralCodeUsage(code.id);

    return tracking;
  }

  /**
   * Process a conversion and award referral earnings
   */
  async processConversion(
    trackingId: string,
    conversionData: ConversionData
  ): Promise<{ relationship?: ReferralRelationship; earnings: ReferralEarnings[] }> {
    const tracking = await storage.getReferralTracking(trackingId);
    
    if (!tracking) {
      throw new Error('Tracking record not found');
    }

    if (tracking.convertedUserId) {
      throw new Error('Conversion already processed for this tracking record');
    }

    // Get referral code details
    const referralCode = await storage.getReferralCode(tracking.referralCodeId);
    if (!referralCode) {
      throw new Error('Referral code not found');
    }

    // Fraud check
    const fraudCheck = await this.performFraudCheck({
      referrerId: tracking.referrerId,
      convertedUserId: conversionData.convertedUserId,
      ipAddress: tracking.ipAddress,
      deviceFingerprint: tracking.deviceFingerprint,
      conversionType: conversionData.conversionType,
      conversionValue: conversionData.conversionValue
    });

    if (fraudCheck.flagged && fraudCheck.autoBlock) {
      await this.flagFraudEvent({
        eventType: 'suspicious_signup',
        referrerId: tracking.referrerId,
        refereeId: conversionData.convertedUserId,
        trackingId: tracking.id,
        detectionReason: fraudCheck.reasons.join(', '),
        evidenceData: { patterns: fraudCheck.patterns, riskScore: fraudCheck.riskScore },
        riskScore: fraudCheck.riskScore,
        severity: fraudCheck.riskScore > 80 ? 'high' : 'medium'
      });
      throw new Error('Conversion blocked due to fraud detection');
    }

    // Update tracking record with conversion data
    await storage.updateReferralTracking(trackingId, {
      convertedUserId: conversionData.convertedUserId,
      conversionType: conversionData.conversionType,
      conversionValue: conversionData.conversionValue?.toString(),
      conversionMetadata: conversionData.metadata,
      convertedAt: new Date()
    });

    // Create referral relationship
    const relationshipData: InsertReferralRelationship = {
      referrerId: tracking.referrerId,
      refereeId: conversionData.convertedUserId,
      type: 'direct',
      level: 1,
      referralCodeId: referralCode.id,
      campaignId: referralCode.campaignId,
      trackingId: tracking.id
    };

    const relationship = await storage.createReferralRelationship(relationshipData);

    // Calculate and create earnings
    const earnings = await this.calculateAndCreateEarnings(
      referralCode,
      relationship,
      conversionData,
      tracking
    );

    // Update affiliate stats if referrer is an affiliate
    await this.updateAffiliateStats(tracking.referrerId, {
      conversionType: conversionData.conversionType,
      conversionValue: conversionData.conversionValue || 0
    });

    // Check for achievement unlocks
    await this.checkAchievements(tracking.referrerId);

    return { relationship, earnings };
  }

  // ===== FRAUD DETECTION =====

  /**
   * Perform comprehensive fraud detection
   */
  private async performFraudCheck(data: {
    referrerId: string;
    convertedUserId: string;
    ipAddress?: string;
    deviceFingerprint?: string;
    conversionType: string;
    conversionValue?: number;
  }): Promise<FraudCheckResult> {
    let riskScore = 0;
    const patterns: string[] = [];
    const reasons: string[] = [];

    // Check 1: Self-referral
    if (data.referrerId === data.convertedUserId) {
      riskScore += 95;
      patterns.push('self_referral');
      reasons.push('User attempting to refer themselves');
    }

    // Check 2: IP Address patterns
    if (data.ipAddress) {
      const recentReferrals = await storage.getTrackingByReferrer(data.referrerId, 10);
      const sameIpCount = recentReferrals.filter(r => r.ipAddress === data.ipAddress).length;
      
      if (sameIpCount > 3) {
        riskScore += 60;
        patterns.push('ip_abuse');
        reasons.push(`Multiple referrals from same IP (${sameIpCount} instances)`);
      }
    }

    // Check 3: Device fingerprint patterns
    if (data.deviceFingerprint) {
      const recentReferrals = await storage.getTrackingByReferrer(data.referrerId, 20);
      const sameDeviceCount = recentReferrals.filter(r => r.deviceFingerprint === data.deviceFingerprint).length;
      
      if (sameDeviceCount > 2) {
        riskScore += 50;
        patterns.push('duplicate_device');
        reasons.push(`Multiple referrals from same device (${sameDeviceCount} instances)`);
      }
    }

    // Check 4: Rapid referral pattern
    const referrerRelationships = await storage.getReferrerRelationships(data.referrerId);
    const last24h = referrerRelationships.filter(
      r => r.createdAt && r.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    if (last24h.length > 10) {
      riskScore += 40;
      patterns.push('rapid_referrals');
      reasons.push(`Unusually high referral rate (${last24h.length} in 24h)`);
    }

    // Check 5: Conversion value anomalies
    if (data.conversionValue && data.conversionValue > 10000) {
      riskScore += 30;
      patterns.push('high_value_conversion');
      reasons.push(`Unusually high conversion value: $${data.conversionValue}`);
    }

    const flagged = riskScore > 50;
    const autoBlock = riskScore > 80;

    return {
      flagged,
      riskScore,
      patterns,
      autoBlock,
      reasons
    };
  }

  /**
   * Flag a fraud event for manual review
   */
  private async flagFraudEvent(eventData: {
    eventType: string;
    referrerId?: string;
    refereeId?: string;
    referralCodeId?: string;
    trackingId?: string;
    detectionReason: string;
    evidenceData: any;
    riskScore: number;
    severity: string;
  }): Promise<ReferralFraudEvent> {
    const fraudEventData: InsertReferralFraudEvent = {
      eventType: eventData.eventType as any,
      referrerId: eventData.referrerId,
      refereeId: eventData.refereeId,
      referralCodeId: eventData.referralCodeId,
      trackingId: eventData.trackingId,
      detectionReason: eventData.detectionReason,
      evidenceData: eventData.evidenceData,
      riskScore: eventData.riskScore.toString(),
      severity: eventData.severity,
      automaticAction: eventData.riskScore > 80 ? 'suspend' : 'flag'
    };

    return await storage.createFraudEvent(fraudEventData);
  }

  // ===== EARNINGS CALCULATION =====

  /**
   * Calculate and create earnings for a successful referral
   */
  private async calculateAndCreateEarnings(
    referralCode: ReferralCode,
    relationship: ReferralRelationship,
    conversionData: ConversionData,
    tracking: ReferralTracking
  ): Promise<ReferralEarnings[]> {
    const earnings: ReferralEarnings[] = [];

    // Primary referrer earnings
    const primaryEarning = await this.calculateEarningAmount(referralCode, conversionData);
    
    const primaryEarningData: InsertReferralEarnings = {
      referrerId: relationship.referrerId,
      refereeId: relationship.refereeId,
      type: this.getEarningType(referralCode.rewardType, conversionData.conversionType),
      amount: primaryEarning.toString(),
      currency: 'USD',
      referralCodeId: referralCode.id,
      campaignId: referralCode.campaignId,
      relationshipId: relationship.id,
      trackingId: tracking.id,
      sourceTransactionId: conversionData.sourceTransactionId,
      commissionRate: referralCode.rewardType === 'percentage' ? referralCode.rewardValue : undefined,
      sourceAmount: conversionData.conversionValue?.toString(),
      status: 'pending'
    };

    const primaryEarnings = await storage.createReferralEarnings(primaryEarningData);
    earnings.push(primaryEarnings);

    // Multi-level earnings (if applicable)
    const parentRelationship = await storage.getRefereeRelationship(relationship.referrerId);
    if (parentRelationship && primaryEarning > 0) {
      const secondLevelEarning = primaryEarning * 0.3; // 30% of primary earning
      
      if (secondLevelEarning >= 1) { // Minimum threshold
        const secondLevelData: InsertReferralEarnings = {
          referrerId: parentRelationship.referrerId,
          refereeId: relationship.refereeId,
          type: 'tier_bonus',
          amount: secondLevelEarning.toString(),
          currency: 'USD',
          referralCodeId: referralCode.id,
          campaignId: referralCode.campaignId,
          relationshipId: parentRelationship.id,
          trackingId: tracking.id,
          sourceTransactionId: conversionData.sourceTransactionId,
          commissionRate: '30.0000', // 30% of primary
          sourceAmount: primaryEarning.toString(),
          status: 'pending'
        };

        const secondLevelEarnings = await storage.createReferralEarnings(secondLevelData);
        earnings.push(secondLevelEarnings);
      }
    }

    return earnings;
  }

  /**
   * Calculate the earning amount based on referral code and conversion
   */
  private async calculateEarningAmount(
    referralCode: ReferralCode,
    conversionData: ConversionData
  ): Promise<number> {
    const rewardValue = parseFloat(referralCode.rewardValue);
    
    switch (referralCode.rewardType) {
      case 'percentage':
        if (conversionData.conversionValue) {
          return (conversionData.conversionValue * rewardValue) / 100;
        }
        // Default signup bonus for percentage type
        return conversionData.conversionType === 'signup' ? 5 : 0;
        
      case 'fixed':
        return rewardValue;
        
      case 'credits':
        return rewardValue; // Credits are 1:1 with USD for calculation
        
      default:
        return 0;
    }
  }

  /**
   * Determine the earning type based on reward and conversion types
   */
  private getEarningType(rewardType: string, conversionType: string): any {
    if (conversionType === 'signup') {
      return 'signup_bonus';
    }
    
    if (rewardType === 'percentage') {
      return 'percentage_commission';
    }
    
    if (rewardType === 'fixed') {
      return 'fixed_commission';
    }
    
    return 'signup_bonus';
  }

  // ===== AFFILIATE MANAGEMENT =====

  /**
   * Create or upgrade user to affiliate status
   */
  async createAffiliateProfile(
    userId: string,
    profileData: Partial<InsertAffiliateProfile> = {}
  ): Promise<AffiliateProfile> {
    // Generate unique affiliate ID
    const affiliateId = await this.generateUniqueAffiliateId();
    
    const affiliateData: InsertAffiliateProfile = {
      userId,
      affiliateId,
      status: 'pending_approval',
      tier: 'bronze',
      payoutThreshold: '50.00',
      preferredPayoutMethod: 'paypal',
      payoutSchedule: 'monthly',
      notificationPreferences: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true
      },
      ...profileData
    };

    const profile = await storage.createAffiliateProfile(affiliateData);
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      action: 'affiliate_profile_created',
      resourceType: 'affiliate_profile',
      resourceId: profile.id,
      details: { affiliateId, tier: profile.tier },
      ipAddress: '',
      userAgent: ''
    });

    return profile;
  }

  /**
   * Update affiliate performance statistics
   */
  private async updateAffiliateStats(
    userId: string,
    data: {
      conversionType: string;
      conversionValue: number;
    }
  ): Promise<void> {
    const affiliate = await storage.getAffiliateProfile(userId);
    if (!affiliate) return;

    // Update conversion stats
    await storage.updateAffiliateStats(userId, {
      totalConversions: affiliate.totalConversions + 1,
      totalEarnings: affiliate.totalEarnings + data.conversionValue
    });

    // Update period stats
    await storage.updateAffiliatePeriodStats(userId, {
      periodConversions: affiliate.periodConversions + 1,
      periodEarnings: affiliate.periodEarnings + data.conversionValue
    });

    // Check for tier upgrades
    await this.checkTierUpgrade(userId);
  }

  /**
   * Check if affiliate qualifies for tier upgrade
   */
  private async checkTierUpgrade(userId: string): Promise<void> {
    const affiliate = await storage.getAffiliateProfile(userId);
    if (!affiliate) return;

    const tierThresholds = {
      bronze: { earnings: 0, conversions: 0 },
      silver: { earnings: 1000, conversions: 50 },
      gold: { earnings: 5000, conversions: 200 },
      platinum: { earnings: 20000, conversions: 500 },
      diamond: { earnings: 50000, conversions: 1000 }
    };

    const currentTierIndex = Object.keys(tierThresholds).indexOf(affiliate.tier);
    const nextTiers = Object.entries(tierThresholds).slice(currentTierIndex + 1);

    for (const [tier, requirements] of nextTiers) {
      if (
        affiliate.lifetimeEarnings >= requirements.earnings &&
        affiliate.lifetimeConversions >= requirements.conversions
      ) {
        await storage.upgradeAffiliateTier(userId, tier, 'system');
        
        // Create audit log
        await storage.createAuditLog({
          userId,
          action: 'affiliate_tier_upgraded',
          resourceType: 'affiliate_profile',
          resourceId: affiliate.id,
          details: { oldTier: affiliate.tier, newTier: tier },
          ipAddress: '',
          userAgent: ''
        });
        
        break;
      }
    }
  }

  // ===== ACHIEVEMENT SYSTEM =====

  /**
   * Check and unlock achievements for a user
   */
  private async checkAchievements(userId: string): Promise<void> {
    const achievements = await storage.getUserAchievements(userId, 'locked');
    const referrerStats = await storage.getReferrerEarningsSummary(userId);

    for (const achievement of achievements) {
      const requirement = achievement.requirement as any;
      let currentProgress = 0;

      switch (achievement.achievementType) {
        case 'referral_count':
          const relationships = await storage.getReferrerRelationships(userId);
          currentProgress = relationships.length;
          break;
          
        case 'earnings_milestone':
          currentProgress = referrerStats.totalEarnings;
          break;
          
        case 'conversion_rate':
          const analytics = await storage.getTrackingAnalytics(userId);
          currentProgress = analytics.conversionRate;
          break;
      }

      // Update progress
      await storage.updateAchievementProgress(userId, achievement.achievementId, currentProgress);

      // Check if unlocked
      if (currentProgress >= achievement.targetProgress) {
        await storage.unlockAchievement(userId, achievement.achievementId);
        
        // Award achievement rewards
        if (achievement.rewardType === 'credits' && achievement.rewardValue) {
          // Add credits to user account
          // This would integrate with the existing credits system
        }
      }
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Generate a unique referral code
   */
  private async generateUniqueCode(prefix: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const randomPart = nanoid(6).toUpperCase();
      const code = `${prefix}${randomPart}`;
      
      const existing = await storage.getReferralCodeByCode(code);
      if (!existing) {
        return code;
      }
      
      attempts++;
    }
    
    throw new Error('Failed to generate unique referral code');
  }

  /**
   * Generate a unique affiliate ID
   */
  private async generateUniqueAffiliateId(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const affiliateId = `AFF${nanoid(8).toUpperCase()}`;
      
      const existing = await storage.getAffiliateProfileByAffiliateId(affiliateId);
      if (!existing) {
        return affiliateId;
      }
      
      attempts++;
    }
    
    throw new Error('Failed to generate unique affiliate ID');
  }

  /**
   * Get comprehensive referral analytics for a user
   */
  async getReferralAnalytics(
    userId: string,
    timeframe: { start: Date; end: Date }
  ): Promise<{
    overview: {
      totalClicks: number;
      totalConversions: number;
      conversionRate: number;
      totalEarnings: number;
    };
    performance: {
      byDay: Array<{ date: string; clicks: number; conversions: number; earnings: number }>;
      bySource: Array<{ source: string; clicks: number; conversions: number }>;
      byDevice: Array<{ device: string; percentage: number }>;
    };
    earnings: {
      breakdown: Array<{ type: string; amount: number; count: number }>;
      pending: number;
      paid: number;
    };
  }> {
    const analytics = await storage.getAnalyticsSummary({
      referrerId: userId,
      timeframe
    });

    const earningsSummary = await storage.getReferrerEarningsSummary(userId, timeframe);

    return {
      overview: {
        totalClicks: analytics.totalClicks,
        totalConversions: analytics.totalConversions,
        conversionRate: analytics.conversionRate,
        totalEarnings: analytics.totalEarnings
      },
      performance: {
        byDay: analytics.performanceByDay,
        bySource: analytics.topGeolocations.map(g => ({
          source: g.country,
          clicks: g.clicks,
          conversions: g.conversions
        })),
        byDevice: analytics.deviceBreakdown
      },
      earnings: {
        breakdown: earningsSummary.earningsByType,
        pending: earningsSummary.pendingEarnings,
        paid: earningsSummary.paidEarnings
      }
    };
  }
}

export const referralService = new ReferralService();