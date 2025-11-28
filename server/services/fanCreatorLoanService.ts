import { db } from '../db';
import { fanCreatorLoans, loanRepayments, fanzWallets, fanzLedger, users } from '@shared/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// FAN-TO-CREATOR LOAN SERVICE
// Peer-to-peer microlending system using FanzCredit infrastructure

export interface LoanRequest {
  borrowerId: string;
  lenderId: string;
  principalCents: number;
  termDays: number;
  purpose?: string;
  collateralType?: string;
  collateralValueCents?: number;
  installmentCount?: number;
  installmentFrequency?: 'weekly' | 'monthly' | 'one-time';
}

export interface LoanApproval {
  loanId: string;
  approvedBy: string;
}

export interface RepaymentRequest {
  loanId: string;
  amountCents: number;
}

export class FanCreatorLoanService {
  /**
   * Calculate interest rate based on borrower's trust score
   */
  calculateInterestRate(trustScore: number): number {
    // Higher trust = lower interest
    // Trust score range: 0-10000
    // Interest range: 3% (Diamond) to 24% (Unverified)
    
    if (trustScore >= 10000) return 300; // 3% (Diamond)
    if (trustScore >= 5000) return 500; // 5% (Platinum)
    if (trustScore >= 2500) return 800; // 8% (Gold)
    if (trustScore >= 1000) return 1200; // 12% (Silver)
    if (trustScore >= 500) return 1600; // 16% (Bronze)
    return 2400; // 24% (Unverified)
  }

  /**
   * Determine risk tier based on trust score
   */
  getRiskTier(trustScore: number): 'low' | 'standard' | 'high' {
    if (trustScore >= 2500) return 'low';
    if (trustScore >= 500) return 'standard';
    return 'high';
  }

  /**
   * Calculate total amount due (principal + interest)
   */
  calculateTotalDue(principalCents: number, interestRateBps: number): number {
    const interest = Math.round((principalCents * interestRateBps) / 10000);
    return principalCents + interest;
  }

  /**
   * Create a loan request
   */
  async createLoanRequest(request: LoanRequest): Promise<any> {
    // Get borrower's trust score (default to 0 if not available)
    // TODO: Integrate with FanzTrust trust scoring system
    const [borrower] = await db
      .select()
      .from(users)
      .where(eq(users.id, request.borrowerId));

    if (!borrower) {
      throw new Error('Borrower not found');
    }

    const trustScore = 0; // Default trust score until FanzTrust integration
    const interestRateBps = this.calculateInterestRate(trustScore);
    const riskTier = this.getRiskTier(trustScore);
    const totalDueCents = this.calculateTotalDue(request.principalCents, interestRateBps);

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + request.termDays);

    // Get or create wallets
    const [lenderWallet] = await db
      .select()
      .from(fanzWallets)
      .where(eq(fanzWallets.userId, request.lenderId));

    const [borrowerWallet] = await db
      .select()
      .from(fanzWallets)
      .where(eq(fanzWallets.userId, request.borrowerId));

    if (!lenderWallet || !borrowerWallet) {
      throw new Error('Wallets not found for lender or borrower');
    }

    // Check lender has sufficient funds
    if ((lenderWallet.availableBalanceCents || 0) < request.principalCents) {
      throw new Error('Insufficient funds in lender wallet');
    }

    // Create loan record
    const [loan] = await db
      .insert(fanCreatorLoans)
      .values({
        lenderId: request.lenderId,
        borrowerId: request.borrowerId,
        principalCents: request.principalCents,
        interestRateBps,
        termDays: request.termDays,
        totalDueCents,
        trustScore,
        riskTier,
        dueDate,
        amountOutstandingCents: totalDueCents,
        lenderWalletId: lenderWallet.id,
        borrowerWalletId: borrowerWallet.id,
        purpose: request.purpose,
        collateralType: request.collateralType,
        collateralValueCents: request.collateralValueCents,
        installmentCount: request.installmentCount || 1,
        installmentFrequency: request.installmentFrequency || 'one-time',
        status: 'pending',
      })
      .returning();

    return loan;
  }

  /**
   * Approve and disburse loan
   */
  async approveLoan(approval: LoanApproval): Promise<any> {
    const [loan] = await db
      .select()
      .from(fanCreatorLoans)
      .where(eq(fanCreatorLoans.id, approval.loanId));

    if (!loan) {
      throw new Error('Loan not found');
    }

    if (loan.status !== 'pending') {
      throw new Error(`Loan is ${loan.status}, cannot approve`);
    }

    // Begin transaction for atomic disbursement
    return await db.transaction(async (tx) => {
      // Lock lender wallet
      const [lenderWallet] = await tx
        .select()
        .from(fanzWallets)
        .where(eq(fanzWallets.id, loan.lenderWalletId!))
        .for('update');

      if (!lenderWallet) {
        throw new Error('Lender wallet not found');
      }

      // Verify lender still has funds
      if ((lenderWallet.availableBalanceCents || 0) < (loan.principalCents || 0)) {
        throw new Error('Lender has insufficient funds');
      }

      // Debit lender wallet
      const lenderNewBalance = (lenderWallet.availableBalanceCents || 0) - (loan.principalCents || 0);
      await tx
        .update(fanzWallets)
        .set({
          availableBalanceCents: lenderNewBalance,
        })
        .where(eq(fanzWallets.id, lenderWallet.id));

      // Credit borrower wallet
      const [borrowerWallet] = await tx
        .select()
        .from(fanzWallets)
        .where(eq(fanzWallets.id, loan.borrowerWalletId!))
        .for('update');

      if (!borrowerWallet) {
        throw new Error('Borrower wallet not found');
      }

      const borrowerNewBalance = (borrowerWallet.availableBalanceCents || 0) + (loan.principalCents || 0);
      await tx
        .update(fanzWallets)
        .set({
          availableBalanceCents: borrowerNewBalance,
        })
        .where(eq(fanzWallets.id, borrowerWallet.id));

      // Create ledger entries
      const disbursementTime = new Date();
      
      // Note: fanzLedger requires transactionId, entryType (not transactionType)
      // Skipping ledger entries for now - will integrate with FanzLedger properly
      // TODO: Create proper ledger entries with correct schema

      // Update loan status
      const [updatedLoan] = await tx
        .update(fanCreatorLoans)
        .set({
          status: 'active',
          approvedAt: disbursementTime,
          approvedBy: approval.approvedBy,
          disbursedAt: disbursementTime,
        })
        .where(eq(fanCreatorLoans.id, loan.id))
        .returning();

      // Create repayment schedule using updated loan with disbursedAt set
      await this.createRepaymentSchedule(tx, updatedLoan);

      return updatedLoan;
    });
  }

  /**
   * Create repayment schedule
   */
  private async createRepaymentSchedule(tx: any, loan: any): Promise<void> {
    const installmentCount = loan.installmentCount || 1;
    const installmentAmount = Math.floor((loan.totalDueCents || 0) / installmentCount);
    const remainder = (loan.totalDueCents || 0) - (installmentAmount * installmentCount);

    for (let i = 1; i <= installmentCount; i++) {
      const dueDate = new Date(loan.disbursedAt);
      
      if (loan.installmentFrequency === 'weekly') {
        dueDate.setDate(dueDate.getDate() + (i * 7));
      } else if (loan.installmentFrequency === 'monthly') {
        dueDate.setMonth(dueDate.getMonth() + i);
      } else {
        // one-time payment
        dueDate.setDate(dueDate.getDate() + loan.termDays);
      }

      // Add remainder to last installment
      const amountDue = i === installmentCount ? installmentAmount + remainder : installmentAmount;

      await tx.insert(loanRepayments).values({
        loanId: loan.id,
        installmentNumber: i,
        amountDueCents: amountDue,
        dueDate,
        status: 'pending',
      });
    }
  }

  /**
   * Make a loan repayment
   */
  async makeRepayment(repayment: RepaymentRequest): Promise<any> {
    return await db.transaction(async (tx) => {
      // Lock loan row inside transaction to prevent race conditions
      const [loan] = await tx
        .select()
        .from(fanCreatorLoans)
        .where(eq(fanCreatorLoans.id, repayment.loanId))
        .for('update');

      if (!loan) {
        throw new Error('Loan not found');
      }

      if (loan.status !== 'active') {
        throw new Error('Loan is not active');
      }
      // Lock borrower wallet
      const [borrowerWallet] = await tx
        .select()
        .from(fanzWallets)
        .where(eq(fanzWallets.id, loan.borrowerWalletId!))
        .for('update');

      if (!borrowerWallet) {
        throw new Error('Borrower wallet not found');
      }

      // Verify borrower has funds
      if ((borrowerWallet.availableBalanceCents || 0) < repayment.amountCents) {
        throw new Error('Insufficient funds for repayment');
      }

      // Debit borrower
      const borrowerNewBalance = (borrowerWallet.availableBalanceCents || 0) - repayment.amountCents;
      await tx
        .update(fanzWallets)
        .set({
          availableBalanceCents: borrowerNewBalance,
        })
        .where(eq(fanzWallets.id, borrowerWallet.id));

      // Credit lender
      const [lenderWallet] = await tx
        .select()
        .from(fanzWallets)
        .where(eq(fanzWallets.id, loan.lenderWalletId!))
        .for('update');

      if (!lenderWallet) {
        throw new Error('Lender wallet not found');
      }

      const lenderNewBalance = (lenderWallet.availableBalanceCents || 0) + repayment.amountCents;
      await tx
        .update(fanzWallets)
        .set({
          availableBalanceCents: lenderNewBalance,
        })
        .where(eq(fanzWallets.id, lenderWallet.id));

      // Note: Ledger entries require proper transactionId and entryType
      // TODO: Integrate with FanzLedger service for proper double-entry bookkeeping
      const repaymentTime = new Date();

      // Update loan
      const newAmountPaid = (loan.amountPaidCents || 0) + repayment.amountCents;
      const newAmountOutstanding = (loan.amountOutstandingCents || 0) - repayment.amountCents;
      const isFullyPaid = newAmountOutstanding <= 0;

      const [updatedLoan] = await tx
        .update(fanCreatorLoans)
        .set({
          amountPaidCents: newAmountPaid,
          amountOutstandingCents: Math.max(0, newAmountOutstanding),
          lastPaymentAt: repaymentTime,
          status: isFullyPaid ? 'completed' : 'active',
          completedAt: isFullyPaid ? repaymentTime : null,
        })
        .where(eq(fanCreatorLoans.id, loan.id))
        .returning();

      // Update pending repayments
      const pendingRepayments = await tx
        .select()
        .from(loanRepayments)
        .where(
          and(
            eq(loanRepayments.loanId, loan.id),
            eq(loanRepayments.status, 'pending')
          )
        )
        .orderBy(loanRepayments.dueDate);

      let remainingAmount = repayment.amountCents;
      
      for (const installment of pendingRepayments) {
        if (remainingAmount <= 0) break;

        const amountToPay = Math.min(remainingAmount, (installment.amountDueCents || 0) - (installment.amountPaidCents || 0));
        const newPaidAmount = (installment.amountPaidCents || 0) + amountToPay;
        const isFullyPaid = newPaidAmount >= (installment.amountDueCents || 0);

        await tx
          .update(loanRepayments)
          .set({
            amountPaidCents: newPaidAmount,
            status: isFullyPaid ? 'paid' : 'pending',
            paidAt: isFullyPaid ? repaymentTime : null,
          })
          .where(eq(loanRepayments.id, installment.id));

        remainingAmount -= amountToPay;
      }

      return updatedLoan;
    });
  }

  /**
   * Check for overdue loans and apply late fees
   */
  async processOverdueLoans(): Promise<void> {
    const now = new Date();
    
    const overdueRepayments = await db
      .select()
      .from(loanRepayments)
      .where(
        and(
          eq(loanRepayments.status, 'pending'),
          sql`${loanRepayments.dueDate} < ${now}`
        )
      );

    for (const repayment of overdueRepayments) {
      // Mark as overdue
      await db
        .update(loanRepayments)
        .set({ status: 'overdue' })
        .where(eq(loanRepayments.id, repayment.id));

      // TODO: Apply late fees based on loan terms
      // TODO: Notify borrower and lender
    }
  }
}

export const fanCreatorLoanService = new FanCreatorLoanService();
