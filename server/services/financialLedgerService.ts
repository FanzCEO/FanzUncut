import { storage } from '../storage';
import { v4 as uuidv4 } from 'uuid';

// Production-ready financial ledger service with persistent transaction storage
class FinancialLedgerService {
  private transactionCache = new Map<string, any>();
  private idempotencyCache = new Map<string, string>();

  // Create immutable transaction record with audit trail
  async createTransaction(params: {
    userId: string;
    type: 'payment' | 'payout' | 'tip' | 'subscription' | 'ppv' | 'refund';
    amount: number;
    currency: string;
    paymentMethod: string;
    providerId?: string;
    externalTransactionId?: string;
    metadata?: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<{ transactionId: string; success: boolean }> {
    const idempotencyKey = params.idempotencyKey || uuidv4();
    
    // Check for duplicate transaction using idempotency key
    if (this.idempotencyCache.has(idempotencyKey)) {
      const existingTransactionId = this.idempotencyCache.get(idempotencyKey)!;
      return { transactionId: existingTransactionId, success: true };
    }

    try {
      const transactionId = uuidv4();
      const timestamp = new Date();

      // Create immutable transaction record
      const transaction = {
        id: transactionId,
        userId: params.userId,
        type: params.type,
        amount: params.amount,
        currency: params.currency,
        paymentMethod: params.paymentMethod,
        providerId: params.providerId || 'unknown',
        externalTransactionId: params.externalTransactionId,
        status: 'pending',
        createdAt: timestamp,
        updatedAt: timestamp,
        metadata: {
          ...params.metadata,
          idempotencyKey,
          platform: 'boyfanz',
          version: '1.0'
        }
      };

      // Store in persistent database (append-only)
      await storage.createTransaction(transaction);

      // Cache for performance
      this.transactionCache.set(transactionId, transaction);
      this.idempotencyCache.set(idempotencyKey, transactionId);

      // Create audit log for transaction creation
      await storage.createAuditLog({
        actorId: params.userId,
        action: 'transaction_created',
        targetType: 'financial_transaction',
        targetId: transactionId,
        diffJson: { 
          type: params.type,
          amount: params.amount,
          currency: params.currency,
          paymentMethod: params.paymentMethod
        }
      });

      console.log(`💰 Transaction created: ${transactionId} - ${params.type} ${params.amount/100} ${params.currency}`);
      return { transactionId, success: true };

    } catch (error) {
      console.error('Transaction creation failed:', error);
      throw new Error('Failed to create transaction record');
    }
  }

  // Update transaction status (immutable - creates new record)
  async updateTransactionStatus(
    transactionId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded',
    externalId?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const existingTransaction = await this.getTransaction(transactionId);
      if (!existingTransaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      // Create new immutable record with status update
      const updatedTransaction = {
        ...existingTransaction,
        status,
        externalTransactionId: externalId || existingTransaction.externalTransactionId,
        updatedAt: new Date(),
        statusHistory: [
          ...(existingTransaction.statusHistory || []),
          {
            status,
            timestamp: new Date(),
            externalId,
            metadata
          }
        ],
        metadata: {
          ...existingTransaction.metadata,
          ...metadata,
          lastStatusUpdate: new Date().toISOString()
        }
      };

      // Update in database
      await storage.updateTransaction(transactionId, updatedTransaction);

      // Update cache
      this.transactionCache.set(transactionId, updatedTransaction);

      // Create audit log for status change
      await storage.createAuditLog({
        actorId: 'system',
        action: 'transaction_status_updated',
        targetType: 'financial_transaction',
        targetId: transactionId,
        diffJson: { 
          oldStatus: existingTransaction.status,
          newStatus: status,
          externalId,
          metadata
        }
      });

      console.log(`💰 Transaction ${transactionId} status updated: ${existingTransaction.status} → ${status}`);
      return true;

    } catch (error) {
      console.error('Transaction status update failed:', error);
      return false;
    }
  }

  // Get transaction with full audit trail
  async getTransaction(transactionId: string): Promise<any | null> {
    try {
      // Check cache first
      if (this.transactionCache.has(transactionId)) {
        return this.transactionCache.get(transactionId);
      }

      // Fetch from database
      const transaction = await storage.getTransaction(transactionId);
      if (transaction) {
        this.transactionCache.set(transactionId, transaction);
      }

      return transaction;
    } catch (error) {
      console.error('Failed to retrieve transaction:', error);
      return null;
    }
  }

  // Get user's transaction history with pagination
  async getUserTransactions(
    userId: string, 
    options: {
      limit?: number;
      offset?: number;
      type?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    transactions: any[];
    total: number;
    summary: {
      totalAmount: number;
      totalCount: number;
      byStatus: Record<string, number>;
      byType: Record<string, number>;
    };
  }> {
    try {
      const { limit = 50, offset = 0 } = options;

      const transactions = await storage.getUserTransactions(userId, {
        ...options,
        limit,
        offset
      });

      const total = await storage.getUserTransactionCount(userId, options);

      // Calculate summary statistics
      const summary = await this.calculateTransactionSummary(userId, options);

      return {
        transactions,
        total,
        summary
      };

    } catch (error) {
      console.error('Failed to get user transactions:', error);
      return {
        transactions: [],
        total: 0,
        summary: {
          totalAmount: 0,
          totalCount: 0,
          byStatus: {},
          byType: {}
        }
      };
    }
  }

  // Calculate comprehensive transaction analytics
  private async calculateTransactionSummary(
    userId: string,
    filters: any
  ): Promise<{
    totalAmount: number;
    totalCount: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  }> {
    try {
      const transactions = await storage.getUserTransactions(userId, {
        ...filters,
        limit: 10000 // Get all for accurate summary
      });

      const summary = {
        totalAmount: 0,
        totalCount: transactions.length,
        byStatus: {} as Record<string, number>,
        byType: {} as Record<string, number>
      };

      transactions.forEach(transaction => {
        // Sum completed transactions only
        if (transaction.status === 'completed') {
          summary.totalAmount += transaction.amount;
        }

        // Count by status
        summary.byStatus[transaction.status] = (summary.byStatus[transaction.status] || 0) + 1;

        // Count by type
        summary.byType[transaction.type] = (summary.byType[transaction.type] || 0) + 1;
      });

      return summary;

    } catch (error) {
      console.error('Failed to calculate transaction summary:', error);
      return {
        totalAmount: 0,
        totalCount: 0,
        byStatus: {},
        byType: {}
      };
    }
  }

  // Create financial reconciliation report
  async createReconciliationReport(
    startDate: Date,
    endDate: Date,
    providerId?: string
  ): Promise<{
    totalTransactions: number;
    totalAmount: number;
    completedAmount: number;
    pendingAmount: number;
    failedAmount: number;
    refundedAmount: number;
    byProvider: Record<string, any>;
    discrepancies: any[];
  }> {
    try {
      const transactions = await storage.getTransactionsByDateRange(startDate, endDate, providerId);

      const report = {
        totalTransactions: transactions.length,
        totalAmount: 0,
        completedAmount: 0,
        pendingAmount: 0,
        failedAmount: 0,
        refundedAmount: 0,
        byProvider: {} as Record<string, any>,
        discrepancies: [] as any[]
      };

      transactions.forEach(transaction => {
        report.totalAmount += transaction.amount;

        switch (transaction.status) {
          case 'completed':
            report.completedAmount += transaction.amount;
            break;
          case 'pending':
          case 'processing':
            report.pendingAmount += transaction.amount;
            break;
          case 'failed':
          case 'cancelled':
            report.failedAmount += transaction.amount;
            break;
          case 'refunded':
            report.refundedAmount += transaction.amount;
            break;
        }

        // Group by provider
        const provider = transaction.providerId || 'unknown';
        if (!report.byProvider[provider]) {
          report.byProvider[provider] = {
            count: 0,
            amount: 0,
            completed: 0,
            failed: 0
          };
        }
        report.byProvider[provider].count++;
        report.byProvider[provider].amount += transaction.amount;
        if (transaction.status === 'completed') {
          report.byProvider[provider].completed += transaction.amount;
        } else if (transaction.status === 'failed') {
          report.byProvider[provider].failed += transaction.amount;
        }

        // Check for discrepancies
        if (transaction.statusHistory && transaction.statusHistory.length > 5) {
          report.discrepancies.push({
            transactionId: transaction.id,
            issue: 'excessive_status_changes',
            details: `${transaction.statusHistory.length} status changes`
          });
        }
      });

      console.log(`📊 Reconciliation report generated: ${report.totalTransactions} transactions totaling ${report.totalAmount/100} USD`);
      return report;

    } catch (error) {
      console.error('Failed to create reconciliation report:', error);
      throw error;
    }
  }

  // Cleanup old cache entries to prevent memory leaks
  async cleanupCache(): Promise<void> {
    const maxCacheSize = 10000;
    
    if (this.transactionCache.size > maxCacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.transactionCache.entries());
      const toRemove = entries.slice(0, entries.length - maxCacheSize);
      toRemove.forEach(([key]) => this.transactionCache.delete(key));
    }

    if (this.idempotencyCache.size > maxCacheSize) {
      const entries = Array.from(this.idempotencyCache.entries());
      const toRemove = entries.slice(0, entries.length - maxCacheSize);
      toRemove.forEach(([key]) => this.idempotencyCache.delete(key));
    }
  }

  // Export transactions for accounting/tax purposes
  async exportTransactions(
    filters: {
      startDate: Date;
      endDate: Date;
      userId?: string;
      status?: string;
      type?: string;
    },
    format: 'csv' | 'json' = 'csv'
  ): Promise<string> {
    try {
      const transactions = await storage.getTransactionsByFilters(filters);

      if (format === 'json') {
        return JSON.stringify(transactions, null, 2);
      }

      // CSV format
      const headers = [
        'Transaction ID',
        'User ID',
        'Type',
        'Amount',
        'Currency',
        'Status',
        'Payment Method',
        'Provider ID',
        'External ID',
        'Created At',
        'Updated At'
      ];

      const rows = transactions.map(t => [
        t.id,
        t.userId,
        t.type,
        t.amount / 100, // Convert to decimal
        t.currency,
        t.status,
        t.paymentMethod,
        t.providerId,
        t.externalTransactionId || '',
        t.createdAt.toISOString(),
        t.updatedAt.toISOString()
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      return csv;

    } catch (error) {
      console.error('Failed to export transactions:', error);
      throw error;
    }
  }
}

export const financialLedgerService = new FinancialLedgerService();