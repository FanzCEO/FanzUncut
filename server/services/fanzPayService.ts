import { db } from '../db';
import { fanzWallets, fanzLedger } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { FanzTrustService } from './fanzTrustService';
import { PaymentProcessingService } from './paymentProcessingService';
import { nanoid } from 'nanoid';

/**
 * FanzPay - Instant Settlement Payment Processing System
 * 
 * Integrates adult-friendly payment processors with FanzTrust™ ledger
 * for instant deposits, withdrawals, and real-time settlements
 */

export interface DepositRequest {
  userId: string;
  amountCents: number;
  currency: string;
  paymentProvider: string;
  paymentMethod: {
    type: 'card' | 'crypto' | 'bank';
    data: any;
  };
  metadata?: Record<string, any>;
}

export interface WithdrawalRequest {
  userId: string;
  amountCents: number;
  currency: string;
  payoutProvider: string;
  destination: {
    type: 'bank' | 'ewallet' | 'crypto' | 'check';
    email?: string;
    accountNumber?: string;
    routingNumber?: string;
    cryptoAddress?: string;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
}

export interface InstantTransferRequest {
  fromUserId: string;
  toUserId: string;
  amountCents: number;
  currency: string;
  description?: string;
  metadata?: Record<string, any>;
}

export class FanzPayService {
  private fanzTrust: FanzTrustService;
  private paymentProcessor: PaymentProcessingService;

  constructor() {
    this.fanzTrust = new FanzTrustService();
    this.paymentProcessor = new PaymentProcessingService();
  }

  // ===== DEPOSITS (External → FanzWallet) =====

  /**
   * Process instant deposit - External payment → FanzWallet credit
   */
  async processDeposit(request: DepositRequest): Promise<{
    success: boolean;
    transactionId?: string;
    walletId?: string;
    error?: string;
  }> {
    try {
      console.log(`💰 FanzPay: Processing deposit of ${request.amountCents / 100} ${request.currency} for user ${request.userId}`);

      // Step 1: Process external payment
      const paymentResult = await this.paymentProcessor.processPayment({
        userId: request.userId,
        amountCents: request.amountCents,
        currency: request.currency,
        description: `BoyFanz wallet deposit`,
        metadata: request.metadata,
        paymentMethod: request.paymentMethod,
      }, request.paymentProvider);

      if (!paymentResult.success) {
        console.error(`❌ FanzPay: Payment failed - ${paymentResult.error}`);
        return {
          success: false,
          error: paymentResult.error || 'Payment processing failed',
        };
      }

      // Step 2: Credit FanzWallet via FanzTrust ledger (instant settlement)
      const wallet = await this.fanzTrust.getOrCreateWallet(request.userId);

      const ledgerEntry = await this.fanzTrust.recordTransaction({
        userId: request.userId,
        walletId: wallet.id,
        type: 'credit',
        transactionType: 'deposit',
        amountCents: request.amountCents,
        referenceType: 'external_payment',
        referenceId: paymentResult.providerTransactionId,
        description: `Deposit via ${request.paymentProvider}`,
        metadata: {
          ...request.metadata,
          paymentProvider: request.paymentProvider,
          externalTransactionId: paymentResult.transactionId,
        },
      });

      console.log(`✅ FanzPay: Deposit completed - ${ledgerEntry.transactionId}`);

      return {
        success: true,
        transactionId: ledgerEntry.transactionId,
        walletId: wallet.id,
      };
    } catch (error) {
      console.error('❌ FanzPay: Deposit failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deposit failed',
      };
    }
  }

  // ===== WITHDRAWALS (FanzWallet → External) =====

  /**
   * Process instant withdrawal - FanzWallet debit → External payout
   */
  async processWithdrawal(request: WithdrawalRequest): Promise<{
    success: boolean;
    transactionId?: string;
    payoutId?: string;
    estimatedArrival?: Date;
    error?: string;
  }> {
    let ledgerEntry: any = null;
    let wallet: any = null;

    try {
      console.log(`💸 FanzPay: Processing withdrawal of ${request.amountCents / 100} ${request.currency} for user ${request.userId}`);

      // Step 1: Debit FanzWallet via FanzTrust ledger
      wallet = await this.fanzTrust.getOrCreateWallet(request.userId);

      ledgerEntry = await this.fanzTrust.recordTransaction({
        userId: request.userId,
        walletId: wallet.id,
        type: 'debit',
        transactionType: 'withdrawal',
        amountCents: request.amountCents,
        referenceType: 'external_payout',
        referenceId: `pending_${nanoid(16)}`,
        description: `Withdrawal via ${request.payoutProvider}`,
        metadata: {
          ...request.metadata,
          payoutProvider: request.payoutProvider,
          destination: request.destination,
        },
      });

      // Step 2: Process external payout (wrapped in try/catch for rollback guarantee)
      let payoutResult;
      try {
        payoutResult = await this.paymentProcessor.processPayout({
          creatorId: request.userId,
          amountCents: request.amountCents,
          currency: request.currency,
          method: request.destination.type,
          destination: request.destination,
        }, request.payoutProvider);
      } catch (payoutError) {
        // Payout threw exception - rollback the withdrawal
        await this.fanzTrust.recordTransaction({
          userId: request.userId,
          walletId: wallet.id,
          type: 'credit',
          transactionType: 'refund',
          amountCents: request.amountCents,
          referenceType: 'failed_withdrawal',
          referenceId: ledgerEntry.transactionId,
          description: `Withdrawal refund - payout exception`,
          metadata: { 
            reason: payoutError instanceof Error ? payoutError.message : 'Payout exception',
            originalTransaction: ledgerEntry.transactionId 
          },
        });

        console.error(`❌ FanzPay: Withdrawal failed (exception) - ${payoutError instanceof Error ? payoutError.message : 'Unknown error'}`);
        return {
          success: false,
          error: payoutError instanceof Error ? payoutError.message : 'Payout processing failed',
        };
      }

      if (!payoutResult.success) {
        // Rollback: Credit wallet back if payout failed
        await this.fanzTrust.recordTransaction({
          userId: request.userId,
          walletId: wallet.id,
          type: 'credit',
          transactionType: 'refund',
          amountCents: request.amountCents,
          referenceType: 'failed_withdrawal',
          referenceId: ledgerEntry.transactionId,
          description: `Withdrawal refund - payout failed`,
          metadata: { 
            reason: payoutResult.error,
            originalTransaction: ledgerEntry.transactionId 
          },
        });

        console.error(`❌ FanzPay: Withdrawal failed - ${payoutResult.error}`);
        return {
          success: false,
          error: payoutResult.error || 'Payout processing failed',
        };
      }

      console.log(`✅ FanzPay: Withdrawal completed - ${ledgerEntry.transactionId}`);

      return {
        success: true,
        transactionId: ledgerEntry.transactionId,
        payoutId: payoutResult.payoutId,
        estimatedArrival: payoutResult.estimatedArrival,
      };
    } catch (error) {
      // Catch any unexpected errors and rollback if ledger entry was created
      if (ledgerEntry && wallet) {
        try {
          await this.fanzTrust.recordTransaction({
            userId: request.userId,
            walletId: wallet.id,
            type: 'credit',
            transactionType: 'refund',
            amountCents: request.amountCents,
            referenceType: 'failed_withdrawal',
            referenceId: ledgerEntry.transactionId,
            description: `Withdrawal refund - unexpected error`,
            metadata: { 
              reason: error instanceof Error ? error.message : 'Unexpected error',
              originalTransaction: ledgerEntry.transactionId 
            },
          });
        } catch (rollbackError) {
          console.error('❌ CRITICAL: Withdrawal rollback failed:', rollbackError);
          // Log critical error for manual intervention
        }
      }

      console.error('❌ FanzPay: Withdrawal failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Withdrawal failed',
      };
    }
  }

  // ===== INSTANT TRANSFERS (FanzWallet → FanzWallet) =====

  /**
   * Instant transfer between FanzWallets (P2P, fan-to-creator, etc.)
   */
  async instantTransfer(request: InstantTransferRequest): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
  }> {
    try {
      console.log(`⚡ FanzPay: Instant transfer of ${request.amountCents / 100} from ${request.fromUserId} to ${request.toUserId}`);

      const fromWallet = await this.fanzTrust.getOrCreateWallet(request.fromUserId);
      const toWallet = await this.fanzTrust.getOrCreateWallet(request.toUserId);

      const { debit, credit } = await this.fanzTrust.transferFunds({
        fromUserId: request.fromUserId,
        fromWalletId: fromWallet.id,
        toUserId: request.toUserId,
        toWalletId: toWallet.id,
        amountCents: request.amountCents,
        description: request.description || `Instant transfer`,
        metadata: request.metadata,
      });

      console.log(`✅ FanzPay: Instant transfer completed - ${debit.transactionId}`);

      return {
        success: true,
        transactionId: debit.transactionId,
      };
    } catch (error) {
      console.error('❌ FanzPay: Instant transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transfer failed',
      };
    }
  }

  // ===== PAYMENT METHODS MANAGEMENT =====

  /**
   * Get available payment providers for deposits
   */
  async getDepositProviders(): Promise<Array<{
    id: string;
    name: string;
    type: string;
    currencies: string[];
    feeBps: number;
  }>> {
    return this.paymentProcessor.getAvailablePaymentProviders();
  }

  /**
   * Get available payout providers for withdrawals
   */
  async getWithdrawalProviders(): Promise<Array<{
    id: string;
    name: string;
    type: string;
    currencies: string[];
    countries: string[];
    minimumCents: number;
    feeBps: number;
  }>> {
    return this.paymentProcessor.getAvailablePayoutProviders();
  }

  // ===== ANALYTICS & REPORTING =====

  /**
   * Get payment processing statistics
   */
  async getPaymentStats(userId: string): Promise<{
    totalDeposits: number;
    totalWithdrawals: number;
    totalTransfers: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
  }> {
    const stats = await db
      .select({
        transactionType: fanzLedger.transactionType,
        totalAmount: sql<number>`SUM(${fanzLedger.amountCents})::int`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(fanzLedger)
      .where(eq(fanzLedger.userId, userId))
      .groupBy(fanzLedger.transactionType);

    return {
      totalDeposits: stats.find(s => s.transactionType === 'deposit')?.totalAmount || 0,
      totalWithdrawals: stats.find(s => s.transactionType === 'withdrawal')?.totalAmount || 0,
      totalTransfers: stats.find(s => s.transactionType === 'transfer')?.totalAmount || 0,
      pendingDeposits: 0, // Implement pending tracking
      pendingWithdrawals: 0, // Implement pending tracking
    };
  }
}

export const fanzPayService = new FanzPayService();
