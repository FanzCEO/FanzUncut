import { TrustScoringService } from "./trustScoringService";

/**
 * Platform Privileges Service - Maps trust tiers to platform features and limits
 * 
 * Trust tiers unlock progressive platform privileges:
 * - Unverified: Basic access with strict limits
 * - Bronze: Increased limits and standard features
 * - Silver: Higher limits and premium features
 * - Gold: VIP features and priority support
 * - Platinum: Elite features and custom limits
 * - Diamond: Maximum privileges and exclusive features
 */

export interface PlatformPrivileges {
  // Content Upload Limits
  maxFileUploadSizeMB: number;
  maxFilesPerPost: number;
  maxVideoLengthMinutes: number;
  
  // Financial Limits
  maxCreditLimitCents: number;
  maxInterestRateBps: number; // Maximum (cap) interest rate for this tier
  withdrawalProcessingHours: number;
  maxDailyWithdrawalCents: number;
  transactionFeeBps: number; // basis points (100 = 1%)
  
  // Platform Features
  canCreateRevenueQuests: boolean;
  canIssueVirtualCards: boolean;
  canAccessPrioritySupport: boolean;
  canUseAdvancedAnalytics: boolean;
  canHostPremiumStreams: boolean;
  canCreateTokens: boolean;
  
  // Trust Features
  proofVerificationPriority: 'low' | 'standard' | 'high' | 'instant';
  disputeResolutionPriority: 'low' | 'standard' | 'high' | 'instant';
  
  // Visibility & Reach
  profileBoostMultiplier: number;
  featuredContentEligible: boolean;
  verifiedBadge: boolean;
}

// Trust tier privilege mapping
const TIER_PRIVILEGES: Record<string, PlatformPrivileges> = {
  unverified: {
    maxFileUploadSizeMB: 50,
    maxFilesPerPost: 5,
    maxVideoLengthMinutes: 5,
    maxCreditLimitCents: 10000, // $100
    maxInterestRateBps: 2400, // 24% APR
    withdrawalProcessingHours: 72,
    maxDailyWithdrawalCents: 50000, // $500
    transactionFeeBps: 300, // 3%
    canCreateRevenueQuests: false,
    canIssueVirtualCards: false,
    canAccessPrioritySupport: false,
    canUseAdvancedAnalytics: false,
    canHostPremiumStreams: false,
    canCreateTokens: false,
    proofVerificationPriority: 'low',
    disputeResolutionPriority: 'low',
    profileBoostMultiplier: 1.0,
    featuredContentEligible: false,
    verifiedBadge: false,
  },
  bronze: {
    maxFileUploadSizeMB: 100,
    maxFilesPerPost: 10,
    maxVideoLengthMinutes: 15,
    maxCreditLimitCents: 50000, // $500
    maxInterestRateBps: 1800, // 18% APR
    withdrawalProcessingHours: 48,
    maxDailyWithdrawalCents: 100000, // $1,000
    transactionFeeBps: 250, // 2.5%
    canCreateRevenueQuests: true,
    canIssueVirtualCards: false,
    canAccessPrioritySupport: false,
    canUseAdvancedAnalytics: false,
    canHostPremiumStreams: false,
    canCreateTokens: false,
    proofVerificationPriority: 'standard',
    disputeResolutionPriority: 'standard',
    profileBoostMultiplier: 1.2,
    featuredContentEligible: false,
    verifiedBadge: true,
  },
  silver: {
    maxFileUploadSizeMB: 250,
    maxFilesPerPost: 20,
    maxVideoLengthMinutes: 30,
    maxCreditLimitCents: 150000, // $1,500
    maxInterestRateBps: 1200, // 12% APR
    withdrawalProcessingHours: 24,
    maxDailyWithdrawalCents: 250000, // $2,500
    transactionFeeBps: 200, // 2%
    canCreateRevenueQuests: true,
    canIssueVirtualCards: true,
    canAccessPrioritySupport: false,
    canUseAdvancedAnalytics: true,
    canHostPremiumStreams: true,
    canCreateTokens: false,
    proofVerificationPriority: 'standard',
    disputeResolutionPriority: 'high',
    profileBoostMultiplier: 1.5,
    featuredContentEligible: true,
    verifiedBadge: true,
  },
  gold: {
    maxFileUploadSizeMB: 500,
    maxFilesPerPost: 30,
    maxVideoLengthMinutes: 60,
    maxCreditLimitCents: 500000, // $5,000
    maxInterestRateBps: 800, // 8% APR
    withdrawalProcessingHours: 12,
    maxDailyWithdrawalCents: 500000, // $5,000
    transactionFeeBps: 150, // 1.5%
    canCreateRevenueQuests: true,
    canIssueVirtualCards: true,
    canAccessPrioritySupport: true,
    canUseAdvancedAnalytics: true,
    canHostPremiumStreams: true,
    canCreateTokens: true,
    proofVerificationPriority: 'high',
    disputeResolutionPriority: 'high',
    profileBoostMultiplier: 2.0,
    featuredContentEligible: true,
    verifiedBadge: true,
  },
  platinum: {
    maxFileUploadSizeMB: 1000,
    maxFilesPerPost: 50,
    maxVideoLengthMinutes: 120,
    maxCreditLimitCents: 1500000, // $15,000
    maxInterestRateBps: 500, // 5% APR
    withdrawalProcessingHours: 6,
    maxDailyWithdrawalCents: 1000000, // $10,000
    transactionFeeBps: 100, // 1%
    canCreateRevenueQuests: true,
    canIssueVirtualCards: true,
    canAccessPrioritySupport: true,
    canUseAdvancedAnalytics: true,
    canHostPremiumStreams: true,
    canCreateTokens: true,
    proofVerificationPriority: 'high',
    disputeResolutionPriority: 'instant',
    profileBoostMultiplier: 3.0,
    featuredContentEligible: true,
    verifiedBadge: true,
  },
  diamond: {
    maxFileUploadSizeMB: 5000,
    maxFilesPerPost: 100,
    maxVideoLengthMinutes: 240,
    maxCreditLimitCents: 5000000, // $50,000
    maxInterestRateBps: 300, // 3% APR
    withdrawalProcessingHours: 1,
    maxDailyWithdrawalCents: 5000000, // $50,000
    transactionFeeBps: 50, // 0.5%
    canCreateRevenueQuests: true,
    canIssueVirtualCards: true,
    canAccessPrioritySupport: true,
    canUseAdvancedAnalytics: true,
    canHostPremiumStreams: true,
    canCreateTokens: true,
    proofVerificationPriority: 'instant',
    disputeResolutionPriority: 'instant',
    profileBoostMultiplier: 5.0,
    featuredContentEligible: true,
    verifiedBadge: true,
  },
};

export class PlatformPrivilegesService {
  private trustScoring: TrustScoringService;

  constructor() {
    this.trustScoring = new TrustScoringService();
  }

  /**
   * Get platform privileges for a user based on their trust tier
   */
  async getUserPrivileges(userId: string): Promise<PlatformPrivileges> {
    // Use fresh trust score calculation to ensure privileges match current tier
    const trustScore = await this.trustScoring.calculateTrustScore(userId);
    const tier = trustScore.currentTier;
    
    return TIER_PRIVILEGES[tier] || TIER_PRIVILEGES.unverified;
  }

  /**
   * Check if user has access to a specific feature
   */
  async hasFeatureAccess(userId: string, feature: keyof PlatformPrivileges): Promise<boolean> {
    const privileges = await this.getUserPrivileges(userId);
    const value = privileges[feature];
    
    // For boolean features, return the value directly
    if (typeof value === 'boolean') {
      return value;
    }
    
    // For other types, consider them as "has access" if they exist
    return value !== null && value !== undefined;
  }

  /**
   * Check if user can perform an action based on limits
   */
  async canPerformAction(userId: string, action: {
    type: 'upload' | 'withdraw' | 'credit' | 'transaction';
    value: number;
    unit?: 'bytes' | 'cents' | 'minutes';
  }): Promise<{ allowed: boolean; limit?: number; current?: number; message?: string }> {
    const privileges = await this.getUserPrivileges(userId);
    
    switch (action.type) {
      case 'upload':
        const maxUploadBytes = privileges.maxFileUploadSizeMB * 1024 * 1024;
        return {
          allowed: action.value <= maxUploadBytes,
          limit: maxUploadBytes,
          current: action.value,
          message: action.value > maxUploadBytes 
            ? `File size exceeds limit of ${privileges.maxFileUploadSizeMB}MB` 
            : undefined,
        };
        
      case 'withdraw':
        return {
          allowed: action.value <= privileges.maxDailyWithdrawalCents,
          limit: privileges.maxDailyWithdrawalCents,
          current: action.value,
          message: action.value > privileges.maxDailyWithdrawalCents
            ? `Withdrawal exceeds daily limit of $${privileges.maxDailyWithdrawalCents / 100}`
            : undefined,
        };
        
      case 'credit':
        return {
          allowed: action.value <= privileges.maxCreditLimitCents,
          limit: privileges.maxCreditLimitCents,
          current: action.value,
          message: action.value > privileges.maxCreditLimitCents
            ? `Credit request exceeds limit of $${privileges.maxCreditLimitCents / 100}`
            : undefined,
        };
        
      default:
        return { allowed: true };
    }
  }

  /**
   * Get transaction fee for user based on trust tier
   */
  async getTransactionFee(userId: string, amountCents: number): Promise<number> {
    const privileges = await this.getUserPrivileges(userId);
    return Math.floor(amountCents * privileges.transactionFeeBps / 10000);
  }

  /**
   * Get credit interest rate for user based on trust tier
   */
  async getCreditInterestRate(userId: string): Promise<number> {
    const privileges = await this.getUserPrivileges(userId);
    return privileges.maxInterestRateBps;
  }
}

export const platformPrivilegesService = new PlatformPrivilegesService();
