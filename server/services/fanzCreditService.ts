import { db } from "../db";
import { fanzCreditLines, users, FanzCreditLine } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { FanzTrustService } from "./fanzTrustService";
import { TrustScoringService } from "./trustScoringService";
import { PlatformPrivilegesService } from "./platformPrivilegesService";
import { nanoid } from "nanoid";

/**
 * FanzCredit Service - Credit lines, trust scoring, and lending
 * 
 * Features:
 * - Automated trust scoring based on platform activity
 * - Credit line applications with collateral options
 * - Credit draws with ledger integration
 * - Interest accrual and late fee calculations
 * - Risk-based pricing tiers
 */
export class FanzCreditService {
  private fanzTrust: FanzTrustService;
  private trustScoring: TrustScoringService;
  private platformPrivileges: PlatformPrivilegesService;

  constructor() {
    this.fanzTrust = new FanzTrustService();
    this.trustScoring = new TrustScoringService();
    this.platformPrivileges = new PlatformPrivilegesService();
  }

  // ===== CREDIT LINE MANAGEMENT =====

  /**
   * Apply for a credit line with automated trust scoring
   */
  async applyForCreditLine(params: {
    userId: string;
    requestedCreditCents: number;
    collateralType?: 'fan_stake' | 'creator_revenue' | 'token_pledge' | null;
    collateralValueCents?: number;
    collateralMetadata?: any;
  }): Promise<FanzCreditLine> {
    const { userId, requestedCreditCents, collateralType, collateralValueCents, collateralMetadata } = params;

    console.log(`💳 FanzCredit: Processing credit application for user ${userId} - ${requestedCreditCents / 100} USD`);

    // Get platform privileges based on trust tier
    const privileges = await this.platformPrivileges.getUserPrivileges(userId);

    // Calculate trust score (using fresh calculation)
    const trustScore = await this.calculateTrustScore(userId);
    const riskTier = this.getRiskTier(trustScore);
    
    // Calculate base interest rate
    let interestRateBps = this.getInterestRate(riskTier, collateralType);
    
    // Enforce maximum interest rate from platform privileges (trust tier)
    // This ensures diamond-tier users get 3% APR as promised (capped, not floored)
    interestRateBps = Math.min(interestRateBps, privileges.maxInterestRateBps);

    // Calculate approved credit based on trust score
    let approvedCreditCents = this.calculateApprovedCredit(
      requestedCreditCents,
      trustScore,
      collateralValueCents
    );
    
    // Enforce maximum credit limit from platform privileges (trust tier)
    // This caps credit at tier-specific limits ($100 → $50,000)
    approvedCreditCents = Math.min(approvedCreditCents, privileges.maxCreditLimitCents);

    // Create credit line
    const [creditLine] = await db.insert(fanzCreditLines).values({
      userId,
      status: 'active', // Auto-approve for now (can add manual review later)
      creditLimitCents: approvedCreditCents,
      availableCreditCents: approvedCreditCents,
      usedCreditCents: 0,
      interestRateBps,
      trustScore,
      riskTier,
      collateralType: collateralType || null,
      collateralValueCents: collateralValueCents || null,
      collateralMetadata: collateralMetadata || {},
      approvedAt: new Date(),
      metadata: {
        requestedCreditCents,
        approvalReason: `Trust score: ${trustScore}, Risk tier: ${riskTier}, Trust tier: ${(await this.trustScoring.getOrCreateTrustScore(userId)).currentTier}`,
      },
    }).returning();

    console.log(`✅ FanzCredit: Credit line approved - ${creditLine.id} (${approvedCreditCents / 100} USD @ ${interestRateBps / 100}% APR, Tier: ${(await this.trustScoring.getOrCreateTrustScore(userId)).currentTier})`);

    return creditLine;
  }

  /**
   * Draw from credit line (borrow funds)
   */
  async drawCredit(params: {
    creditLineId: string;
    userId: string;
    amountCents: number;
    purpose?: string;
  }): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    const { creditLineId, userId, amountCents, purpose } = params;

    try {
      // Get credit line
      const [creditLine] = await db
        .select()
        .from(fanzCreditLines)
        .where(
          and(
            eq(fanzCreditLines.id, creditLineId),
            eq(fanzCreditLines.userId, userId),
            eq(fanzCreditLines.status, 'active')
          )
        );

      if (!creditLine) {
        return { success: false, error: 'Credit line not found or inactive' };
      }

      // Check available credit
      if (creditLine.availableCreditCents < amountCents) {
        return { 
          success: false, 
          error: `Insufficient credit. Available: ${creditLine.availableCreditCents / 100} USD, Requested: ${amountCents / 100} USD` 
        };
      }

      // Credit the wallet via FanzTrust ledger
      const ledgerEntry = await this.fanzTrust.recordTransaction({
        userId,
        walletId: (await this.fanzTrust.getOrCreateWallet(userId)).id,
        type: 'credit',
        transactionType: 'credit_draw',
        amountCents,
        referenceType: 'credit_line',
        referenceId: creditLineId,
        description: purpose || `Credit draw from line ${creditLineId}`,
        metadata: {
          creditLineId,
          interestRateBps: creditLine.interestRateBps,
        },
      });

      // Update credit line balances
      await db
        .update(fanzCreditLines)
        .set({
          availableCreditCents: creditLine.availableCreditCents - amountCents,
          usedCreditCents: (creditLine.usedCreditCents || 0) + amountCents,
          updatedAt: new Date(),
        })
        .where(eq(fanzCreditLines.id, creditLineId));

      console.log(`✅ FanzCredit: Credit drawn - ${ledgerEntry.transactionId} (${amountCents / 100} USD)`);

      return {
        success: true,
        transactionId: ledgerEntry.transactionId,
      };
    } catch (error) {
      console.error('❌ FanzCredit: Credit draw failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Credit draw failed',
      };
    }
  }

  /**
   * Repay credit line
   */
  async repayCredit(params: {
    creditLineId: string;
    userId: string;
    amountCents: number;
  }): Promise<{
    success: boolean;
    transactionId?: string;
    repaidAmount?: number;
    remainingBalance?: number;
    error?: string;
  }> {
    const { creditLineId, userId, amountCents } = params;

    try {
      // Get credit line
      const [creditLine] = await db
        .select()
        .from(fanzCreditLines)
        .where(
          and(
            eq(fanzCreditLines.id, creditLineId),
            eq(fanzCreditLines.userId, userId)
          )
        );

      if (!creditLine) {
        return { success: false, error: 'Credit line not found' };
      }

      // Validate repayment amount - cannot exceed outstanding balance
      const usedCredit = creditLine.usedCreditCents || 0;
      
      if (usedCredit === 0) {
        return { 
          success: false, 
          error: 'No outstanding balance to repay',
          remainingBalance: 0
        };
      }

      if (amountCents > usedCredit) {
        return { 
          success: false, 
          error: `Payment amount (${amountCents / 100} USD) exceeds outstanding balance (${usedCredit / 100} USD)`,
          remainingBalance: usedCredit
        };
      }

      // Debit the wallet via FanzTrust ledger (only the actual repayment amount)
      const ledgerEntry = await this.fanzTrust.recordTransaction({
        userId,
        walletId: (await this.fanzTrust.getOrCreateWallet(userId)).id,
        type: 'debit',
        transactionType: 'credit_repayment',
        amountCents,
        referenceType: 'credit_line',
        referenceId: creditLineId,
        description: `Credit line repayment - ${creditLineId}`,
        metadata: {
          creditLineId,
          previousBalance: creditLine.usedCreditCents,
        },
      });

      // Update credit line balances
      const newUsedCredit = (creditLine.usedCreditCents || 0) - amountCents;

      await db
        .update(fanzCreditLines)
        .set({
          availableCreditCents: creditLine.availableCreditCents + amountCents,
          usedCreditCents: newUsedCredit,
          updatedAt: new Date(),
        })
        .where(eq(fanzCreditLines.id, creditLineId));

      console.log(`✅ FanzCredit: Credit repaid - ${ledgerEntry.transactionId} (${amountCents / 100} USD, remaining: ${newUsedCredit / 100} USD)`);

      return {
        success: true,
        transactionId: ledgerEntry.transactionId,
        repaidAmount: amountCents,
        remainingBalance: newUsedCredit,
      };
    } catch (error) {
      console.error('❌ FanzCredit: Credit repayment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Credit repayment failed',
      };
    }
  }

  /**
   * Get user's credit lines
   */
  async getCreditLines(userId: string): Promise<FanzCreditLine[]> {
    return db
      .select()
      .from(fanzCreditLines)
      .where(eq(fanzCreditLines.userId, userId))
      .orderBy(desc(fanzCreditLines.createdAt));
  }

  /**
   * Get specific credit line
   */
  async getCreditLine(creditLineId: string, userId: string): Promise<FanzCreditLine | null> {
    const [creditLine] = await db
      .select()
      .from(fanzCreditLines)
      .where(
        and(
          eq(fanzCreditLines.id, creditLineId),
          eq(fanzCreditLines.userId, userId)
        )
      );

    return creditLine || null;
  }

  // ===== TRUST SCORING =====

  /**
   * Calculate trust score using the FanzTrust tier system
   * Score range: 0-1000 (mapped from trust tier points)
   */
  async calculateTrustScore(userId: string): Promise<number> {
    // Get FRESH trust score from TrustScoringService (recalculated based on current activity)
    const trustScore = await this.trustScoring.calculateTrustScore(userId);
    
    // Map trust tier points (0-10000+) to credit score (0-1000)
    // This gives higher credit scores to users with verified trust proofs
    const creditScore = Math.min(1000, Math.floor(trustScore.scorePoints / 10));

    console.log(`📊 FanzCredit: Trust score calculated for user ${userId} - ${creditScore}/1000 (Tier: ${trustScore.currentTier}, Points: ${trustScore.scorePoints})`);

    return creditScore;
  }

  /**
   * Get risk tier based on trust score
   */
  private getRiskTier(trustScore: number): 'low' | 'standard' | 'high' {
    if (trustScore >= 750) return 'low';
    if (trustScore >= 500) return 'standard';
    return 'high';
  }

  /**
   * Get interest rate based on risk tier and collateral
   */
  private getInterestRate(
    riskTier: 'low' | 'standard' | 'high',
    collateralType?: string | null
  ): number {
    // Base rates (in basis points: 100 bps = 1%)
    const baseRates = {
      low: 500,      // 5% APR
      standard: 1200, // 12% APR
      high: 2400,    // 24% APR
    };

    let rate = baseRates[riskTier];

    // Reduce rate if collateral provided
    if (collateralType) {
      rate = Math.floor(rate * 0.7); // 30% discount for collateralized credit
    }

    return rate;
  }

  /**
   * Calculate approved credit limit
   */
  private calculateApprovedCredit(
    requestedCents: number,
    trustScore: number,
    collateralValueCents?: number
  ): number {
    // Base approval ratio based on trust score
    let approvalRatio = 0.5; // Default 50% of requested

    if (trustScore >= 800) approvalRatio = 1.0;
    else if (trustScore >= 700) approvalRatio = 0.9;
    else if (trustScore >= 600) approvalRatio = 0.75;
    else if (trustScore >= 500) approvalRatio = 0.6;

    let approvedCredit = Math.floor(requestedCents * approvalRatio);

    // If collateral provided, can approve up to collateral value
    if (collateralValueCents && collateralValueCents > 0) {
      approvedCredit = Math.min(
        Math.max(approvedCredit, collateralValueCents),
        requestedCents
      );
    }

    return approvedCredit;
  }

  /**
   * Freeze credit line
   */
  async freezeCreditLine(creditLineId: string, userId: string, reason?: string): Promise<void> {
    await db
      .update(fanzCreditLines)
      .set({
        status: 'frozen',
        metadata: sql`${fanzCreditLines.metadata} || ${JSON.stringify({ freezeReason: reason })}::jsonb`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(fanzCreditLines.id, creditLineId),
          eq(fanzCreditLines.userId, userId)
        )
      );

    console.log(`🔒 FanzCredit: Credit line frozen - ${creditLineId}`);
  }

  /**
   * Close credit line
   */
  async closeCreditLine(creditLineId: string, userId: string, reason?: string): Promise<void> {
    const [creditLine] = await db
      .select()
      .from(fanzCreditLines)
      .where(
        and(
          eq(fanzCreditLines.id, creditLineId),
          eq(fanzCreditLines.userId, userId)
        )
      );

    if (!creditLine) {
      throw new Error('Credit line not found');
    }

    if ((creditLine.usedCreditCents || 0) > 0) {
      throw new Error('Cannot close credit line with outstanding balance');
    }

    await db
      .update(fanzCreditLines)
      .set({
        status: 'closed',
        closedAt: new Date(),
        closedReason: reason || 'User requested closure',
        updatedAt: new Date(),
      })
      .where(eq(fanzCreditLines.id, creditLineId));

    console.log(`✅ FanzCredit: Credit line closed - ${creditLineId}`);
  }
}
