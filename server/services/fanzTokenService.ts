import { db } from "../db";
import { fanzTokens, FanzToken } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { FanzTrustService } from "./fanzTrustService";

/**
 * FanzToken Service - Platform token economy
 * 
 * Token Types:
 * - FanzCoin: Primary platform currency (1 token = $1 default)
 * - FanzToken: Utility tokens for platform features
 * - Loyalty: Loyalty rewards program tokens
 * - Reward: Achievement and milestone rewards
 * - Utility: Special feature access tokens
 * 
 * Features:
 * - Mint/burn token balances
 * - Token transfers between users
 * - Rewards multipliers for enhanced benefits
 * - Token-to-fiat conversion integration
 * - Expiration handling for time-limited tokens
 */
export class FanzTokenService {
  private fanzTrust: FanzTrustService;

  constructor() {
    this.fanzTrust = new FanzTrustService();
  }

  // ===== TOKEN ACCOUNT MANAGEMENT =====

  /**
   * Get or create token account for user
   */
  async getOrCreateTokenAccount(
    userId: string,
    tokenType: 'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility'
  ): Promise<FanzToken> {
    // Try to get existing account
    const [existing] = await db
      .select()
      .from(fanzTokens)
      .where(
        and(
          eq(fanzTokens.userId, userId),
          eq(fanzTokens.tokenType, tokenType)
        )
      );

    if (existing) {
      return existing;
    }

    // Create new token account
    const [newAccount] = await db.insert(fanzTokens).values({
      userId,
      tokenType,
      balance: 0,
      lockedBalance: 0,
      valueCentsPerToken: tokenType === 'fanzcoin' ? 100 : 50, // FanzCoin = $1, others = $0.50
      rewardsMultiplier: '1.00',
    }).returning();

    console.log(`🪙 FanzToken: Created ${tokenType} account for user ${userId}`);

    return newAccount;
  }

  /**
   * Get all token accounts for a user
   */
  async getUserTokenAccounts(userId: string): Promise<FanzToken[]> {
    return db
      .select()
      .from(fanzTokens)
      .where(eq(fanzTokens.userId, userId));
  }

  /**
   * Get specific token balance
   */
  async getTokenBalance(
    userId: string,
    tokenType: 'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility'
  ): Promise<{ balance: number; lockedBalance: number; availableBalance: number }> {
    const account = await this.getOrCreateTokenAccount(userId, tokenType);
    
    return {
      balance: account.balance,
      lockedBalance: account.lockedBalance,
      availableBalance: account.balance - account.lockedBalance,
    };
  }

  // ===== MINTING & BURNING =====

  /**
   * Mint tokens (create new tokens)
   */
  async mintTokens(params: {
    userId: string;
    tokenType: 'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility';
    amount: number;
    reason: string;
    expiresAt?: Date;
  }): Promise<{
    success: boolean;
    newBalance?: number;
    error?: string;
  }> {
    const { userId, tokenType, amount, reason, expiresAt } = params;

    try {
      if (amount <= 0) {
        return { success: false, error: 'Mint amount must be positive' };
      }

      const account = await this.getOrCreateTokenAccount(userId, tokenType);

      const [updated] = await db
        .update(fanzTokens)
        .set({
          balance: account.balance + amount,
          lastTransactionAt: new Date(),
          expiresAt: expiresAt || account.expiresAt,
          metadata: sql`${fanzTokens.metadata} || ${JSON.stringify({ lastMintReason: reason })}::jsonb`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(fanzTokens.userId, userId),
            eq(fanzTokens.tokenType, tokenType)
          )
        )
        .returning();

      console.log(`✨ FanzToken: Minted ${amount} ${tokenType} for user ${userId} - ${reason}`);

      return {
        success: true,
        newBalance: updated.balance,
      };
    } catch (error) {
      console.error('❌ FanzToken: Mint failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Mint failed',
      };
    }
  }

  /**
   * Burn tokens (destroy tokens)
   */
  async burnTokens(params: {
    userId: string;
    tokenType: 'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility';
    amount: number;
    reason: string;
  }): Promise<{
    success: boolean;
    newBalance?: number;
    error?: string;
  }> {
    const { userId, tokenType, amount, reason } = params;

    try {
      if (amount <= 0) {
        return { success: false, error: 'Burn amount must be positive' };
      }

      const account = await this.getOrCreateTokenAccount(userId, tokenType);
      const availableBalance = account.balance - account.lockedBalance;

      if (availableBalance < amount) {
        return {
          success: false,
          error: `Insufficient token balance. Available: ${availableBalance}, Requested: ${amount}`,
        };
      }

      const [updated] = await db
        .update(fanzTokens)
        .set({
          balance: account.balance - amount,
          lastTransactionAt: new Date(),
          metadata: sql`${fanzTokens.metadata} || ${JSON.stringify({ lastBurnReason: reason })}::jsonb`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(fanzTokens.userId, userId),
            eq(fanzTokens.tokenType, tokenType)
          )
        )
        .returning();

      console.log(`🔥 FanzToken: Burned ${amount} ${tokenType} for user ${userId} - ${reason}`);

      return {
        success: true,
        newBalance: updated.balance,
      };
    } catch (error) {
      console.error('❌ FanzToken: Burn failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Burn failed',
      };
    }
  }

  // ===== TOKEN TRANSFERS =====

  /**
   * Transfer tokens between users
   */
  async transferTokens(params: {
    fromUserId: string;
    toUserId: string;
    tokenType: 'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility';
    amount: number;
    memo?: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    const { fromUserId, toUserId, tokenType, amount, memo } = params;

    try {
      if (amount <= 0) {
        return { success: false, error: 'Transfer amount must be positive' };
      }

      if (fromUserId === toUserId) {
        return { success: false, error: 'Cannot transfer to yourself' };
      }

      // Get both accounts
      const fromAccount = await this.getOrCreateTokenAccount(fromUserId, tokenType);
      const toAccount = await this.getOrCreateTokenAccount(toUserId, tokenType);

      const availableBalance = fromAccount.balance - fromAccount.lockedBalance;

      if (availableBalance < amount) {
        return {
          success: false,
          error: `Insufficient token balance. Available: ${availableBalance}, Requested: ${amount}`,
        };
      }

      // Debit sender
      await db
        .update(fanzTokens)
        .set({
          balance: fromAccount.balance - amount,
          lastTransactionAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(fanzTokens.userId, fromUserId),
            eq(fanzTokens.tokenType, tokenType)
          )
        );

      // Credit receiver
      await db
        .update(fanzTokens)
        .set({
          balance: toAccount.balance + amount,
          lastTransactionAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(fanzTokens.userId, toUserId),
            eq(fanzTokens.tokenType, tokenType)
          )
        );

      console.log(`💸 FanzToken: Transferred ${amount} ${tokenType} from ${fromUserId} to ${toUserId}${memo ? ` - ${memo}` : ''}`);

      return { success: true };
    } catch (error) {
      console.error('❌ FanzToken: Transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed',
      };
    }
  }

  // ===== TOKEN LOCKING (FOR STAKING, ESCROW, ETC.) =====

  /**
   * Lock tokens (make them temporarily unavailable for spending)
   */
  async lockTokens(params: {
    userId: string;
    tokenType: 'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility';
    amount: number;
    reason: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    const { userId, tokenType, amount, reason } = params;

    try {
      if (amount <= 0) {
        return { success: false, error: 'Lock amount must be positive' };
      }

      const account = await this.getOrCreateTokenAccount(userId, tokenType);
      const availableBalance = account.balance - account.lockedBalance;

      if (availableBalance < amount) {
        return {
          success: false,
          error: `Insufficient available balance. Available: ${availableBalance}, Requested: ${amount}`,
        };
      }

      await db
        .update(fanzTokens)
        .set({
          lockedBalance: account.lockedBalance + amount,
          metadata: sql`${fanzTokens.metadata} || ${JSON.stringify({ lastLockReason: reason })}::jsonb`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(fanzTokens.userId, userId),
            eq(fanzTokens.tokenType, tokenType)
          )
        );

      console.log(`🔒 FanzToken: Locked ${amount} ${tokenType} for user ${userId} - ${reason}`);

      return { success: true };
    } catch (error) {
      console.error('❌ FanzToken: Lock failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lock failed',
      };
    }
  }

  /**
   * Unlock tokens
   */
  async unlockTokens(params: {
    userId: string;
    tokenType: 'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility';
    amount: number;
    reason: string;
  }): Promise<{
    success: boolean;
    error?: string;
  }> {
    const { userId, tokenType, amount, reason } = params;

    try {
      if (amount <= 0) {
        return { success: false, error: 'Unlock amount must be positive' };
      }

      const account = await this.getOrCreateTokenAccount(userId, tokenType);

      if (account.lockedBalance < amount) {
        return {
          success: false,
          error: `Insufficient locked balance. Locked: ${account.lockedBalance}, Requested: ${amount}`,
        };
      }

      await db
        .update(fanzTokens)
        .set({
          lockedBalance: account.lockedBalance - amount,
          metadata: sql`${fanzTokens.metadata} || ${JSON.stringify({ lastUnlockReason: reason })}::jsonb`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(fanzTokens.userId, userId),
            eq(fanzTokens.tokenType, tokenType)
          )
        );

      console.log(`🔓 FanzToken: Unlocked ${amount} ${tokenType} for user ${userId} - ${reason}`);

      return { success: true };
    } catch (error) {
      console.error('❌ FanzToken: Unlock failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unlock failed',
      };
    }
  }

  // ===== TOKEN-TO-FIAT CONVERSION =====

  /**
   * Convert tokens to fiat (credit FanzWallet)
   */
  async convertTokensToFiat(params: {
    userId: string;
    tokenType: 'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility';
    tokenAmount: number;
  }): Promise<{
    success: boolean;
    fiatAmountCents?: number;
    transactionId?: string;
    error?: string;
  }> {
    const { userId, tokenType, tokenAmount } = params;

    try {
      if (tokenAmount <= 0) {
        return { success: false, error: 'Token amount must be positive' };
      }

      const account = await this.getOrCreateTokenAccount(userId, tokenType);
      const availableBalance = account.balance - account.lockedBalance;

      if (availableBalance < tokenAmount) {
        return {
          success: false,
          error: `Insufficient token balance. Available: ${availableBalance}, Requested: ${tokenAmount}`,
        };
      }

      // Calculate fiat value
      const fiatAmountCents = tokenAmount * account.valueCentsPerToken;

      // Burn tokens
      const burnResult = await this.burnTokens({
        userId,
        tokenType,
        amount: tokenAmount,
        reason: `Converted to fiat: ${fiatAmountCents / 100} USD`,
      });

      if (!burnResult.success) {
        return { success: false, error: burnResult.error };
      }

      // Credit FanzWallet
      const wallet = await this.fanzTrust.getOrCreateWallet(userId);
      const ledgerEntry = await this.fanzTrust.recordTransaction({
        userId,
        walletId: wallet.id,
        type: 'credit',
        transactionType: 'token_conversion',
        amountCents: fiatAmountCents,
        referenceType: 'token_conversion',
        referenceId: `${tokenType}_${tokenAmount}`,
        description: `Converted ${tokenAmount} ${tokenType} to ${fiatAmountCents / 100} USD`,
        metadata: {
          tokenType,
          tokenAmount,
          valueCentsPerToken: account.valueCentsPerToken,
        },
      });

      console.log(`💱 FanzToken: Converted ${tokenAmount} ${tokenType} to ${fiatAmountCents / 100} USD for user ${userId}`);

      return {
        success: true,
        fiatAmountCents,
        transactionId: ledgerEntry.transactionId,
      };
    } catch (error) {
      console.error('❌ FanzToken: Token conversion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token conversion failed',
      };
    }
  }

  /**
   * Convert fiat to tokens (debit FanzWallet, mint tokens)
   */
  async convertFiatToTokens(params: {
    userId: string;
    tokenType: 'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility';
    fiatAmountCents: number;
  }): Promise<{
    success: boolean;
    tokenAmount?: number;
    transactionId?: string;
    error?: string;
  }> {
    const { userId, tokenType, fiatAmountCents } = params;

    try {
      if (fiatAmountCents <= 0) {
        return { success: false, error: 'Fiat amount must be positive' };
      }

      const account = await this.getOrCreateTokenAccount(userId, tokenType);
      
      // Calculate token amount
      const tokenAmount = Math.floor(fiatAmountCents / account.valueCentsPerToken);

      if (tokenAmount === 0) {
        return { success: false, error: 'Amount too small to convert to tokens' };
      }

      // Debit FanzWallet
      const wallet = await this.fanzTrust.getOrCreateWallet(userId);
      const ledgerEntry = await this.fanzTrust.recordTransaction({
        userId,
        walletId: wallet.id,
        type: 'debit',
        transactionType: 'token_purchase',
        amountCents: fiatAmountCents,
        referenceType: 'token_purchase',
        referenceId: `${tokenType}_${tokenAmount}`,
        description: `Purchased ${tokenAmount} ${tokenType} for ${fiatAmountCents / 100} USD`,
        metadata: {
          tokenType,
          tokenAmount,
          valueCentsPerToken: account.valueCentsPerToken,
        },
      });

      // Mint tokens
      const mintResult = await this.mintTokens({
        userId,
        tokenType,
        amount: tokenAmount,
        reason: `Purchased with ${fiatAmountCents / 100} USD`,
      });

      if (!mintResult.success) {
        // TODO: Rollback wallet debit if mint fails
        return { success: false, error: mintResult.error };
      }

      console.log(`💰 FanzToken: Purchased ${tokenAmount} ${tokenType} for ${fiatAmountCents / 100} USD for user ${userId}`);

      return {
        success: true,
        tokenAmount,
        transactionId: ledgerEntry.transactionId,
      };
    } catch (error) {
      console.error('❌ FanzToken: Fiat conversion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fiat conversion failed',
      };
    }
  }

  // ===== REWARDS & LOYALTY =====

  /**
   * Award loyalty tokens for activity
   */
  async awardLoyaltyTokens(params: {
    userId: string;
    amount: number;
    reason: string;
    activityType: string;
  }): Promise<{
    success: boolean;
    newBalance?: number;
    error?: string;
  }> {
    const { userId, amount, reason, activityType } = params;

    return this.mintTokens({
      userId,
      tokenType: 'loyalty',
      amount,
      reason: `${activityType}: ${reason}`,
    });
  }

  /**
   * Award reward tokens for achievements
   */
  async awardRewardTokens(params: {
    userId: string;
    amount: number;
    achievementId: string;
    achievementName: string;
  }): Promise<{
    success: boolean;
    newBalance?: number;
    error?: string;
  }> {
    const { userId, amount, achievementId, achievementName } = params;

    return this.mintTokens({
      userId,
      tokenType: 'reward',
      amount,
      reason: `Achievement unlocked: ${achievementName} (${achievementId})`,
    });
  }
}
