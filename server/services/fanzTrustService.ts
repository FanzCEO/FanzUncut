import { db } from '../db';
import { 
  fanzWallets, 
  fanzLedger,
  fanzCreditLines,
  fanzTokens,
  fanzCards,
  fanzRevenueShares,
  type FanzWallet,
  type InsertFanzWallet,
  type FanzLedger as FanzLedgerType,
  type InsertFanzLedger,
  type FanzCreditLine,
  type InsertFanzCreditLine,
  type FanzToken,
  type InsertFanzToken,
  type FanzCard,
  type InsertFanzCard,
  type FanzRevenueShare,
  type InsertFanzRevenueShare,
} from '@shared/schema';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * FanzTrust™ Financial Ledger Service
 * Core financial ecosystem for BoyFanz platform
 */

export class FanzTrustService {
  
  // ===== WALLET MANAGEMENT =====
  
  /**
   * Create or get user's primary wallet
   */
  async getOrCreateWallet(userId: string, type: 'standard' | 'business' | 'creator' | 'escrow' | 'rewards' = 'standard', tx?: any): Promise<FanzWallet> {
    const dbClient = tx || db;
    
    // Check if wallet exists
    const existing = await dbClient.query.fanzWallets.findFirst({
      where: and(
        eq(fanzWallets.userId, userId),
        eq(fanzWallets.type, type)
      ),
    });

    if (existing) {
      return existing;
    }

    // Create new wallet
    const [wallet] = await dbClient.insert(fanzWallets).values({
      userId,
      type,
      status: 'active',
      availableBalanceCents: 0,
      pendingBalanceCents: 0,
      heldBalanceCents: 0,
      totalBalanceCents: 0,
      currency: 'USD',
    }).returning();

    return wallet;
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletId: string): Promise<{
    available: number;
    pending: number;
    held: number;
    total: number;
  }> {
    const wallet = await db.query.fanzWallets.findFirst({
      where: eq(fanzWallets.id, walletId),
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return {
      available: Number(wallet.availableBalanceCents),
      pending: Number(wallet.pendingBalanceCents),
      held: Number(wallet.heldBalanceCents),
      total: Number(wallet.totalBalanceCents),
    };
  }

  // ===== LEDGER OPERATIONS =====

  /**
   * Record a ledger transaction (double-entry bookkeeping)
   */
  async recordTransaction(params: {
    userId: string;
    walletId: string;
    type: 'debit' | 'credit';
    transactionType: string;
    amountCents: number;
    referenceType?: string;
    referenceId?: string;
    description?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    tx?: any; // Optional transaction context
  }): Promise<FanzLedgerType> {
    const transactionId = `txn_${nanoid(24)}`;
    const dbClient = params.tx || db;

    // Get current wallet balance
    const wallet = await dbClient.query.fanzWallets.findFirst({
      where: eq(fanzWallets.id, params.walletId),
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const currentBalance = Number(wallet.availableBalanceCents);
    const balanceAfter = params.type === 'credit' 
      ? currentBalance + params.amountCents 
      : currentBalance - params.amountCents;

    // Prevent negative balance
    if (balanceAfter < 0) {
      throw new Error('Insufficient funds');
    }

    // Record ledger entry
    const [ledgerEntry] = await dbClient.insert(fanzLedger).values({
      transactionId,
      walletId: params.walletId,
      userId: params.userId,
      entryType: params.type,
      transactionType: params.transactionType as any,
      amountCents: params.amountCents,
      balanceAfterCents: balanceAfter,
      currency: 'USD',
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      description: params.description,
      metadata: params.metadata || {},
      ipAddress: params.ipAddress as any,
      userAgent: params.userAgent,
    }).returning();

    // Update wallet balance
    await dbClient.update(fanzWallets)
      .set({
        availableBalanceCents: balanceAfter,
        totalBalanceCents: balanceAfter,
        updatedAt: new Date(),
      })
      .where(eq(fanzWallets.id, params.walletId));

    return ledgerEntry;
  }

  /**
   * Transfer funds between wallets
   */
  async transferFunds(params: {
    fromUserId: string;
    fromWalletId: string;
    toUserId: string;
    toWalletId: string;
    amountCents: number;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<{ debit: FanzLedgerType; credit: FanzLedgerType }> {
    // Wrap in transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      const transferId = `transfer_${nanoid(20)}`;

      // Debit from sender
      const debit = await this.recordTransaction({
        userId: params.fromUserId,
        walletId: params.fromWalletId,
        type: 'debit',
        transactionType: 'transfer',
        amountCents: params.amountCents,
        referenceType: 'transfer',
        referenceId: transferId,
        description: params.description || `Transfer to user ${params.toUserId}`,
        metadata: { ...params.metadata, transferId, direction: 'outgoing' },
        tx,
      });

      // Credit to receiver
      const credit = await this.recordTransaction({
        userId: params.toUserId,
        walletId: params.toWalletId,
        type: 'credit',
        transactionType: 'transfer',
        amountCents: params.amountCents,
        referenceType: 'transfer',
        referenceId: transferId,
        description: params.description || `Transfer from user ${params.fromUserId}`,
        metadata: { ...params.metadata, transferId, direction: 'incoming' },
        tx,
      });

      return { debit, credit };
    });
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(params: {
    walletId?: string;
    userId?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<FanzLedgerType[]> {
    let query = db.select().from(fanzLedger);

    const conditions = [];
    if (params.walletId) {
      conditions.push(eq(fanzLedger.walletId, params.walletId));
    }
    if (params.userId) {
      conditions.push(eq(fanzLedger.userId, params.userId));
    }
    if (params.startDate) {
      conditions.push(gte(fanzLedger.createdAt, params.startDate));
    }
    if (params.endDate) {
      conditions.push(lte(fanzLedger.createdAt, params.endDate));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(fanzLedger.createdAt)) as any;

    if (params.limit) {
      query = query.limit(params.limit) as any;
    }
    if (params.offset) {
      query = query.offset(params.offset) as any;
    }

    return await query;
  }

  // ===== CREDIT LINES =====

  /**
   * Create a credit line for a user
   */
  async createCreditLine(params: {
    userId: string;
    creditLimitCents: number;
    interestRateBps?: number;
    trustScore?: number;
    riskTier?: string;
    collateralType?: string;
    collateralValueCents?: number;
  }): Promise<FanzCreditLine> {
    const [creditLine] = await db.insert(fanzCreditLines).values({
      userId: params.userId,
      status: 'pending',
      creditLimitCents: params.creditLimitCents,
      availableCreditCents: params.creditLimitCents,
      usedCreditCents: 0,
      interestRateBps: params.interestRateBps || 0,
      trustScore: params.trustScore || 0,
      riskTier: params.riskTier || 'standard',
      collateralType: params.collateralType,
      collateralValueCents: params.collateralValueCents,
    }).returning();

    return creditLine;
  }

  /**
   * Get user's credit lines
   */
  async getUserCreditLines(userId: string): Promise<FanzCreditLine[]> {
    return await db.query.fanzCreditLines.findMany({
      where: eq(fanzCreditLines.userId, userId),
      orderBy: [desc(fanzCreditLines.createdAt)],
    });
  }

  /**
   * Approve a credit line
   */
  async approveCreditLine(creditLineId: string, approvedBy: string): Promise<FanzCreditLine> {
    const [approved] = await db.update(fanzCreditLines)
      .set({
        status: 'active',
        approvedAt: new Date(),
        approvedBy,
      })
      .where(eq(fanzCreditLines.id, creditLineId))
      .returning();

    return approved;
  }

  /**
   * Draw from credit line
   */
  async drawCredit(params: {
    creditLineId: string;
    userId: string;
    amountCents: number;
    description?: string;
  }): Promise<{ creditLine: FanzCreditLine; ledgerEntry: FanzLedgerType }> {
    // Wrap in transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Get credit line
      const creditLine = await tx.query.fanzCreditLines.findFirst({
        where: and(
          eq(fanzCreditLines.id, params.creditLineId),
          eq(fanzCreditLines.userId, params.userId)
        ),
      });

      if (!creditLine) {
        throw new Error('Credit line not found');
      }

      if (creditLine.status !== 'active') {
        throw new Error('Credit line is not active');
      }

      const availableCredit = Number(creditLine.availableCreditCents);
      if (params.amountCents > availableCredit) {
        throw new Error('Insufficient credit available');
      }

      // Update credit line
      const [updatedCreditLine] = await tx.update(fanzCreditLines)
        .set({
          availableCreditCents: availableCredit - params.amountCents,
          usedCreditCents: Number(creditLine.usedCreditCents) + params.amountCents,
          updatedAt: new Date(),
        })
        .where(eq(fanzCreditLines.id, params.creditLineId))
        .returning();

      // Get user's wallet
      const wallet = await this.getOrCreateWallet(params.userId, 'standard', tx);

      // Record ledger entry
      const ledgerEntry = await this.recordTransaction({
        userId: params.userId,
        walletId: wallet.id,
        type: 'credit',
        transactionType: 'credit_issued',
        amountCents: params.amountCents,
        referenceType: 'credit_line',
        referenceId: params.creditLineId,
        description: params.description || 'Credit line draw',
        metadata: { creditLineId: params.creditLineId },
        tx,
      });

      return { creditLine: updatedCreditLine, ledgerEntry };
    });
  }

  // ===== TOKEN OPERATIONS =====

  /**
   * Get or create user's token balance
   */
  async getOrCreateTokenBalance(userId: string, tokenType: 'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility', tx?: any): Promise<FanzToken> {
    const dbClient = tx || db;
    
    const existing = await dbClient.query.fanzTokens.findFirst({
      where: and(
        eq(fanzTokens.userId, userId),
        eq(fanzTokens.tokenType, tokenType)
      ),
    });

    if (existing) {
      return existing;
    }

    const [token] = await dbClient.insert(fanzTokens).values({
      userId,
      tokenType,
      balance: 0,
      lockedBalance: 0,
      valueCentsPerToken: 100, // 1 token = $1 default
    }).returning();

    return token;
  }

  /**
   * Mint tokens (increase balance)
   */
  async mintTokens(params: {
    userId: string;
    tokenType: 'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility';
    amount: number;
    reason?: string;
    tx?: any;
  }): Promise<FanzToken> {
    const dbClient = params.tx || db;
    const tokenBalance = await this.getOrCreateTokenBalance(params.userId, params.tokenType, params.tx);

    const [updated] = await dbClient.update(fanzTokens)
      .set({
        balance: Number(tokenBalance.balance) + params.amount,
        lastTransactionAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fanzTokens.id, tokenBalance.id))
      .returning();

    return updated;
  }

  /**
   * Burn tokens (decrease balance)
   */
  async burnTokens(params: {
    userId: string;
    tokenType: 'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility';
    amount: number;
    reason?: string;
  }): Promise<FanzToken> {
    const tokenBalance = await this.getOrCreateTokenBalance(params.userId, params.tokenType);

    if (Number(tokenBalance.balance) < params.amount) {
      throw new Error('Insufficient token balance');
    }

    const [updated] = await db.update(fanzTokens)
      .set({
        balance: Number(tokenBalance.balance) - params.amount,
        lastTransactionAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(fanzTokens.id, tokenBalance.id))
      .returning();

    return updated;
  }

  /**
   * Purchase tokens with wallet balance
   */
  async purchaseTokens(params: {
    userId: string;
    tokenType: 'fanzcoin' | 'fanztoken' | 'loyalty' | 'reward' | 'utility';
    tokenAmount: number;
  }): Promise<{ tokens: FanzToken; ledgerEntry: FanzLedgerType }> {
    // Wrap in transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      const tokenBalance = await this.getOrCreateTokenBalance(params.userId, params.tokenType, tx);
      const costCents = params.tokenAmount * Number(tokenBalance.valueCentsPerToken);

      // Get user's wallet
      const wallet = await this.getOrCreateWallet(params.userId, 'standard', tx);

      // Debit wallet
      const ledgerEntry = await this.recordTransaction({
        userId: params.userId,
        walletId: wallet.id,
        type: 'debit',
        transactionType: 'token_purchase',
        amountCents: costCents,
        referenceType: 'token',
        referenceId: tokenBalance.id,
        description: `Purchased ${params.tokenAmount} ${params.tokenType} tokens`,
        metadata: { tokenType: params.tokenType, tokenAmount: params.tokenAmount },
        tx,
      });

      // Mint tokens
      const tokens = await this.mintTokens({
        userId: params.userId,
        tokenType: params.tokenType,
        amount: params.tokenAmount,
        reason: 'purchase',
        tx,
      });

      return { tokens, ledgerEntry };
    });
  }

  // ===== REVENUE SHARING =====

  /**
   * Process revenue split
   */
  async processRevenueShare(params: {
    referenceType: string;
    referenceId: string;
    splitType: 'collaborative' | 'affiliate' | 'referral' | 'platform_fee' | 'royalty';
    totalRevenueCents: number;
    splits: Array<{ userId: string; percentage: number }>;
  }): Promise<FanzRevenueShare> {
    // Validate splits total 100%
    const totalPercentage = params.splits.reduce((sum, split) => sum + split.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Revenue splits must total 100%');
    }

    // Wrap in transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // Calculate split amounts
      const splitsWithAmounts = params.splits.map(split => ({
        ...split,
        amountCents: Math.floor(params.totalRevenueCents * (split.percentage / 100)),
      }));

      // Create revenue share record
      const [revenueShare] = await tx.insert(fanzRevenueShares).values({
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        splitType: params.splitType,
        totalRevenueCents: params.totalRevenueCents,
        splits: splitsWithAmounts,
        status: 'pending',
      }).returning();

      // Process each split
      for (const split of splitsWithAmounts) {
        const wallet = await this.getOrCreateWallet(split.userId, 'standard', tx);

        await this.recordTransaction({
          userId: split.userId,
          walletId: wallet.id,
          type: 'credit',
          transactionType: 'payment',
          amountCents: split.amountCents,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          description: `Revenue share: ${split.percentage}% of ${params.referenceType}`,
          metadata: { 
            revenueShareId: revenueShare.id,
            splitType: params.splitType,
            percentage: split.percentage,
          },
          tx,
        });
      }

      // Mark as processed
      const [processed] = await tx.update(fanzRevenueShares)
        .set({ status: 'completed', processedAt: new Date() })
        .where(eq(fanzRevenueShares.id, revenueShare.id))
        .returning();

      return processed;
    });
  }

  // ===== ANALYTICS & REPORTING =====

  /**
   * Get wallet statistics
   */
  async getWalletStats(userId: string): Promise<{
    totalBalance: number;
    totalTransactions: number;
    totalRevenue: number;
    totalSpent: number;
  }> {
    const wallets = await db.query.fanzWallets.findMany({
      where: eq(fanzWallets.userId, userId),
    });

    const totalBalance = wallets.reduce((sum, w) => sum + Number(w.totalBalanceCents), 0);

    const transactions = await db.select()
      .from(fanzLedger)
      .where(eq(fanzLedger.userId, userId));

    const totalRevenue = transactions
      .filter(t => t.entryType === 'credit')
      .reduce((sum, t) => sum + Number(t.amountCents), 0);

    const totalSpent = transactions
      .filter(t => t.entryType === 'debit')
      .reduce((sum, t) => sum + Number(t.amountCents), 0);

    return {
      totalBalance,
      totalTransactions: transactions.length,
      totalRevenue,
      totalSpent,
    };
  }
}

export const fanzTrustService = new FanzTrustService();
