import { db } from "../db";
import { fanzCards, fanzWallets, fanzLedger, users } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

/**
 * FanzCard - Virtual Card Program Service
 * 
 * Provides virtual debit cards for creators with:
 * - Instant funding from FanzWallet
 * - Spend controls and limits
 * - Merchant category restrictions
 * - Real-time transaction authorization
 * - Automated FanzWallet debiting
 */
export class FanzCardService {
  private encryptionKey: string;

  constructor() {
    // Use environment variable or generate a secure key
    this.encryptionKey = process.env.CARD_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash sensitive card data
   */
  private hashCardData(data: string): string {
    return crypto.createHash('sha256').update(data + this.encryptionKey).digest('hex');
  }

  /**
   * Issue a new virtual card
   */
  async issueCard(params: {
    userId: string;
    cardholderName: string;
    dailySpendLimitCents?: number;
    monthlySpendLimitCents?: number;
    perTransactionLimitCents?: number;
    allowedMerchantCategories?: string[];
    blockedMerchantCategories?: string[];
    allowedCountries?: string[];
    tx?: any;
  }) {
    const executor = params.tx || db;

    try {
      // Get or create user's FanzWallet
      let [wallet] = await executor
        .select()
        .from(fanzWallets)
        .where(eq(fanzWallets.userId, params.userId))
        .limit(1);

      if (!wallet) {
        [wallet] = await executor
          .insert(fanzWallets)
          .values({
            userId: params.userId,
            currency: "USD",
            status: "active",
          })
          .returning();
      }

      // Verify user has sufficient balance (minimum $10 for card activation)
      if (wallet.availableBalanceCents < 1000) {
        return {
          success: false,
          error: "Insufficient balance. Minimum $10 required to issue a virtual card.",
        };
      }

      // Generate virtual card details
      const cardNumber = this.generateCardNumber();
      const cvv = this.generateCVV();
      const expiryDate = this.generateExpiryDate();

      // Hash sensitive data
      const cardNumberHash = this.hashCardData(cardNumber);
      const cvvHash = this.hashCardData(cvv);
      const last4 = cardNumber.slice(-4);

      // Create card
      const [card] = await executor
        .insert(fanzCards)
        .values({
          userId: params.userId,
          walletId: wallet.id,
          cardNumberHash,
          last4,
          expiryMonth: expiryDate.month,
          expiryYear: expiryDate.year,
          cvvHash,
          cardholderName: params.cardholderName,
          cardType: "virtual",
          cardBrand: "fanzcard",
          status: "active",
          dailySpendLimitCents: params.dailySpendLimitCents || 50000, // $500 default
          monthlySpendLimitCents: params.monthlySpendLimitCents || 500000, // $5000 default
          perTransactionLimitCents: params.perTransactionLimitCents || 10000, // $100 default
          allowedMerchantCategories: params.allowedMerchantCategories,
          blockedMerchantCategories: params.blockedMerchantCategories,
          allowedCountries: params.allowedCountries || ["US"],
          activatedAt: new Date(),
        })
        .returning();

      // Record ledger entry for card issuance
      await executor.insert(fanzLedger).values({
        userId: params.userId,
        walletId: wallet.id,
        transactionType: "card_issued",
        amountCents: 0,
        currency: "USD",
        status: "completed",
        description: `FanzCard issued: **** ${last4}`,
        metadata: { cardId: card.id, last4 },
      });

      return {
        success: true,
        card: {
          ...card,
          // Include card details for one-time display (user must save these)
          cardNumber,
          cvv,
        },
      };
    } catch (error) {
      console.error("FanzCard issuance error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to issue virtual card",
      };
    }
  }

  /**
   * Authorize a card transaction
   */
  async authorizeTransaction(params: {
    cardId: string;
    amountCents: number;
    merchantName: string;
    merchantCategory?: string;
    merchantCountry?: string;
    tx?: any;
  }) {
    const executor = params.tx || db;

    try {
      // Get card with wallet
      const [card] = await executor
        .select({
          card: fanzCards,
          wallet: fanzWallets,
        })
        .from(fanzCards)
        .innerJoin(fanzWallets, eq(fanzCards.walletId, fanzWallets.id))
        .where(eq(fanzCards.id, params.cardId))
        .limit(1);

      if (!card) {
        return { success: false, error: "Card not found", declineReason: "invalid_card" };
      }

      // Check card status
      if (card.card.status !== "active") {
        return { success: false, error: "Card is not active", declineReason: "card_inactive" };
      }

      // Check wallet status
      if (card.wallet.status !== "active") {
        return { success: false, error: "Wallet is not active", declineReason: "wallet_inactive" };
      }

      // Check available balance
      if (card.wallet.availableBalanceCents < params.amountCents) {
        return { success: false, error: "Insufficient funds", declineReason: "insufficient_funds" };
      }

      // Check per-transaction limit
      if (card.card.perTransactionLimitCents && params.amountCents > card.card.perTransactionLimitCents) {
        return { success: false, error: "Transaction exceeds per-transaction limit", declineReason: "amount_exceeded" };
      }

      // Check daily spend limit
      if (card.card.dailySpendLimitCents) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dailySpend = await executor
          .select({
            totalSpent: sql<number>`COALESCE(SUM(ABS(${fanzLedger.amountCents})), 0)`,
          })
          .from(fanzLedger)
          .where(and(
            sql`${fanzLedger.metadata}->>'cardId' = ${params.cardId}`,
            sql`${fanzLedger.createdAt} >= ${today.toISOString()}`
          ))
          .then((rows: any[]) => rows[0]?.totalSpent || 0);

        if (dailySpend + params.amountCents > card.card.dailySpendLimitCents) {
          return { success: false, error: "Daily spend limit exceeded", declineReason: "daily_limit_exceeded" };
        }
      }

      // Check monthly spend limit
      if (card.card.monthlySpendLimitCents) {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthlySpend = await executor
          .select({
            totalSpent: sql<number>`COALESCE(SUM(ABS(${fanzLedger.amountCents})), 0)`,
          })
          .from(fanzLedger)
          .where(and(
            sql`${fanzLedger.metadata}->>'cardId' = ${params.cardId}`,
            sql`${fanzLedger.createdAt} >= ${monthStart.toISOString()}`
          ))
          .then((rows: any[]) => rows[0]?.totalSpent || 0);

        if (monthlySpend + params.amountCents > card.card.monthlySpendLimitCents) {
          return { success: false, error: "Monthly spend limit exceeded", declineReason: "monthly_limit_exceeded" };
        }
      }

      // Check merchant category
      if (params.merchantCategory) {
        if (card.card.blockedMerchantCategories?.includes(params.merchantCategory)) {
          return { success: false, error: "Merchant category blocked", declineReason: "merchant_blocked" };
        }
        if (card.card.allowedMerchantCategories && !card.card.allowedMerchantCategories.includes(params.merchantCategory)) {
          return { success: false, error: "Merchant category not allowed", declineReason: "merchant_blocked" };
        }
      }

      // Check country
      if (params.merchantCountry && card.card.allowedCountries && !card.card.allowedCountries.includes(params.merchantCountry)) {
        return { success: false, error: "Country not allowed", declineReason: "country_blocked" };
      }

      // Debit wallet (hold funds)
      await executor
        .update(fanzWallets)
        .set({
          availableBalanceCents: sql`${fanzWallets.availableBalanceCents} - ${params.amountCents}`,
          heldBalanceCents: sql`${fanzWallets.heldBalanceCents} + ${params.amountCents}`,
        })
        .where(eq(fanzWallets.id, card.wallet.id));

      // Update card usage
      await executor
        .update(fanzCards)
        .set({
          totalSpentCents: sql`${fanzCards.totalSpentCents} + ${params.amountCents}`,
          totalTransactions: sql`${fanzCards.totalTransactions} + 1`,
          lastUsedAt: new Date(),
        })
        .where(eq(fanzCards.id, params.cardId));

      // Record ledger entry (using metadata for pending status)
      const [ledgerEntry] = await executor
        .insert(fanzLedger)
        .values({
          transactionId: `card_auth_${Date.now()}`,
          userId: card.card.userId,
          walletId: card.wallet.id,
          entryType: "debit",
          transactionType: "payment",
          amountCents: -params.amountCents,
          balanceAfterCents: card.wallet.availableBalanceCents - params.amountCents,
          currency: "USD",
          description: `Card purchase (pending): ${params.merchantName}`,
          metadata: {
            cardId: params.cardId,
            last4: card.card.last4,
            merchantName: params.merchantName,
            merchantCategory: params.merchantCategory,
            merchantCountry: params.merchantCountry,
            status: "pending", // Store status in metadata
          },
        })
        .returning();

      return {
        success: true,
        authorized: true,
        transactionId: ledgerEntry.id,
        message: "Transaction authorized",
      };
    } catch (error) {
      console.error("FanzCard authorization error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authorization failed",
        declineReason: "system_error",
      };
    }
  }

  /**
   * Settle a pending transaction
   */
  async settleTransaction(params: {
    transactionId: string;
    finalAmountCents?: number;
    tx?: any;
  }) {
    const executor = params.tx || db;

    try {
      // Get pending transaction (check metadata for pending status)
      const [transaction] = await executor
        .select()
        .from(fanzLedger)
        .where(eq(fanzLedger.id, params.transactionId))
        .limit(1);

      if (!transaction || transaction.metadata?.status !== "pending") {
        return { success: false, error: "Pending transaction not found" };
      }

      const originalAmount = Math.abs(transaction.amountCents);
      const finalAmount = params.finalAmountCents || originalAmount;
      const amountDifference = originalAmount - finalAmount;

      // Update wallet balances
      await executor
        .update(fanzWallets)
        .set({
          heldBalanceCents: sql`${fanzWallets.heldBalanceCents} - ${originalAmount}`,
          // If final amount is less, return difference to available
          ...(amountDifference > 0 && {
            availableBalanceCents: sql`${fanzWallets.availableBalanceCents} + ${amountDifference}`,
          }),
        })
        .where(eq(fanzWallets.id, transaction.walletId));

      // Update transaction metadata to mark as settled
      await executor
        .update(fanzLedger)
        .set({
          metadata: {
            ...transaction.metadata,
            status: "completed",
            originalAmountCents: originalAmount,
            finalAmountCents: finalAmount,
            settledAt: new Date().toISOString(),
          },
          description: `Card purchase (settled): ${transaction.metadata?.merchantName || 'Unknown'}`,
        })
        .where(eq(fanzLedger.id, params.transactionId));

      return {
        success: true,
        settled: true,
        finalAmountCents: finalAmount,
      };
    } catch (error) {
      console.error("FanzCard settlement error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Settlement failed",
      };
    }
  }

  /**
   * Freeze a card
   */
  async freezeCard(params: { cardId: string; userId: string; reason: string; tx?: any }) {
    const executor = params.tx || db;

    try {
      // Verify ownership
      const [card] = await executor
        .select()
        .from(fanzCards)
        .where(and(
          eq(fanzCards.id, params.cardId),
          eq(fanzCards.userId, params.userId)
        ))
        .limit(1);

      if (!card) {
        return { success: false, error: "Card not found or access denied" };
      }

      await executor
        .update(fanzCards)
        .set({ status: "frozen", metadata: { freezeReason: params.reason } })
        .where(eq(fanzCards.id, params.cardId));

      return { success: true, message: "Card frozen successfully" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to freeze card",
      };
    }
  }

  /**
   * Unfreeze a card
   */
  async unfreezeCard(params: { cardId: string; userId: string; tx?: any }) {
    const executor = params.tx || db;

    try {
      // Verify ownership
      const [card] = await executor
        .select()
        .from(fanzCards)
        .where(and(
          eq(fanzCards.id, params.cardId),
          eq(fanzCards.userId, params.userId)
        ))
        .limit(1);

      if (!card) {
        return { success: false, error: "Card not found or access denied" };
      }

      await executor
        .update(fanzCards)
        .set({ status: "active", metadata: {} })
        .where(eq(fanzCards.id, params.cardId));

      return { success: true, message: "Card unfrozen successfully" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to unfreeze card",
      };
    }
  }

  /**
   * Cancel a card
   */
  async cancelCard(params: { cardId: string; userId: string; reason: string; tx?: any }) {
    const executor = params.tx || db;

    try {
      // Verify ownership
      const [card] = await executor
        .select()
        .from(fanzCards)
        .where(and(
          eq(fanzCards.id, params.cardId),
          eq(fanzCards.userId, params.userId)
        ))
        .limit(1);

      if (!card) {
        return { success: false, error: "Card not found or access denied" };
      }

      await executor
        .update(fanzCards)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          metadata: { cancellationReason: params.reason },
        })
        .where(eq(fanzCards.id, params.cardId));

      return { success: true, message: "Card cancelled successfully" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to cancel card",
      };
    }
  }

  /**
   * Get user's cards
   */
  async getUserCards(userId: string) {
    try {
      const cards = await db
        .select({
          id: fanzCards.id,
          last4: fanzCards.last4,
          cardholderName: fanzCards.cardholderName,
          cardType: fanzCards.cardType,
          cardBrand: fanzCards.cardBrand,
          status: fanzCards.status,
          expiryMonth: fanzCards.expiryMonth,
          expiryYear: fanzCards.expiryYear,
          dailySpendLimitCents: fanzCards.dailySpendLimitCents,
          monthlySpendLimitCents: fanzCards.monthlySpendLimitCents,
          perTransactionLimitCents: fanzCards.perTransactionLimitCents,
          totalSpentCents: fanzCards.totalSpentCents,
          totalTransactions: fanzCards.totalTransactions,
          lastUsedAt: fanzCards.lastUsedAt,
          activatedAt: fanzCards.activatedAt,
          createdAt: fanzCards.createdAt,
        })
        .from(fanzCards)
        .where(eq(fanzCards.userId, userId))
        .orderBy(desc(fanzCards.createdAt));

      return { success: true, cards };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch cards",
      };
    }
  }

  /**
   * Get card transactions
   */
  async getCardTransactions(params: { cardId: string; userId: string; limit?: number }) {
    try {
      // Verify ownership
      const [card] = await db
        .select()
        .from(fanzCards)
        .where(and(
          eq(fanzCards.id, params.cardId),
          eq(fanzCards.userId, params.userId)
        ))
        .limit(1);

      if (!card) {
        return { success: false, error: "Card not found or access denied" };
      }

      const transactions = await db
        .select()
        .from(fanzLedger)
        .where(
          sql`${fanzLedger.metadata}->>'cardId' = ${params.cardId}`
        )
        .orderBy(desc(fanzLedger.createdAt))
        .limit(params.limit || 50);

      return { success: true, transactions };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch transactions",
      };
    }
  }

  /**
   * Update card limits
   */
  async updateCardLimits(params: {
    cardId: string;
    userId: string;
    dailySpendLimitCents?: number;
    monthlySpendLimitCents?: number;
    perTransactionLimitCents?: number;
    tx?: any;
  }) {
    const executor = params.tx || db;

    try {
      // Verify ownership
      const [card] = await executor
        .select()
        .from(fanzCards)
        .where(and(
          eq(fanzCards.id, params.cardId),
          eq(fanzCards.userId, params.userId)
        ))
        .limit(1);

      if (!card) {
        return { success: false, error: "Card not found or access denied" };
      }

      const updates: any = {};
      if (params.dailySpendLimitCents !== undefined) {
        updates.dailySpendLimitCents = params.dailySpendLimitCents;
      }
      if (params.monthlySpendLimitCents !== undefined) {
        updates.monthlySpendLimitCents = params.monthlySpendLimitCents;
      }
      if (params.perTransactionLimitCents !== undefined) {
        updates.perTransactionLimitCents = params.perTransactionLimitCents;
      }

      await executor
        .update(fanzCards)
        .set(updates)
        .where(eq(fanzCards.id, params.cardId));

      return { success: true, message: "Card limits updated successfully" };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update limits",
      };
    }
  }

  // === Helper Methods ===

  /**
   * Generate a valid test card number (Luhn algorithm)
   */
  private generateCardNumber(): string {
    // FanzCard BIN: 5555 55 (Mastercard test BIN)
    const bin = "555555";
    const accountNumber = Math.floor(Math.random() * 1000000000).toString().padStart(9, "0");
    const partial = bin + accountNumber;
    
    // Calculate Luhn checksum
    let sum = 0;
    let isEven = true;
    
    for (let i = partial.length - 1; i >= 0; i--) {
      let digit = parseInt(partial[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    const checksum = (10 - (sum % 10)) % 10;
    return partial + checksum;
  }

  /**
   * Generate a CVV
   */
  private generateCVV(): string {
    return Math.floor(100 + Math.random() * 900).toString();
  }

  /**
   * Generate expiry date (3 years from now)
   */
  private generateExpiryDate() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 3);
    
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
    };
  }
}

// Export singleton instance
export const fanzCard = new FanzCardService();
