import { storage } from "../storage";
import { notificationService } from "./notificationService";

interface PayoutProvider {
  name: string;
  processPayout(userId: string, amountCents: number, currency: string): Promise<string>;
}

class MockPayoutProvider implements PayoutProvider {
  name = 'mock';

  async processPayout(userId: string, amountCents: number, currency: string): Promise<string> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock successful payout
    return `mock_txn_${Date.now()}`;
  }
}

class PayoutService {
  private providers: Map<string, PayoutProvider> = new Map();

  constructor() {
    this.providers.set('mock', new MockPayoutProvider());
  }

  async createPayoutRequest(userId: string, requestData: { amountCents: number; currency: string }) {
    try {
      const payoutRequest = await storage.createPayoutRequest({
        userId,
        amountCents: requestData.amountCents,
        currency: requestData.currency,
        status: 'pending',
        providerRef: null,
      });

      // Process with mock provider
      this.processPayoutAsync(payoutRequest.id, userId);

      await notificationService.sendNotification(userId, {
        kind: 'payout',
        payloadJson: {
          message: 'Payout request created',
          amount: requestData.amountCents / 100,
          currency: requestData.currency
        }
      });

      return payoutRequest;
    } catch (error) {
      console.error('Error creating payout request:', error as Error);
      throw error;
    }
  }

  private async processPayoutAsync(payoutId: string, userId: string) {
    try {
      // Update status to processing
      await storage.updatePayoutRequest(payoutId, { status: 'processing' });

      // Process with provider
      const provider = this.providers.get('mock')!;
      const providerRef = await provider.processPayout(userId, 1000, 'USD'); // Mock values

      // Update status to completed
      await storage.updatePayoutRequest(payoutId, { 
        status: 'completed',
        providerRef 
      });

      await notificationService.sendNotification(userId, {
        kind: 'payout',
        payloadJson: {
          message: 'Payout completed successfully',
          providerRef
        }
      });

      // Create audit log
      await storage.createAuditLog({
        actorId: userId,
        action: 'payout_completed',
        targetType: 'payout_request',
        targetId: payoutId,
        diffJson: { providerRef, status: 'completed' }
      });

    } catch (error) {
      console.error('Error processing payout:', error);
      
      await storage.updatePayoutRequest(payoutId, { status: 'failed' });
      
      await notificationService.sendNotification(userId, {
        kind: 'payout',
        payloadJson: {
          message: 'Payout failed',
          error: (error as Error).message
        }
      });
    }
  }

  async exportPayouts(userId: string): Promise<string> {
    try {
      const payouts = await storage.getPayoutRequests(userId);
      
      // Generate CSV content
      const headers = ['Date', 'Amount', 'Currency', 'Status', 'Provider Ref'];
      const rows = payouts.map(p => [
        p.createdAt?.toISOString().split('T')[0] || '',
        (p.amountCents / 100).toString(),
        p.currency,
        p.status,
        p.providerRef || ''
      ]);
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      return csvContent;
    } catch (error) {
      console.error('Error exporting payouts:', error);
      throw error;
    }
  }
}

export const payoutService = new PayoutService();
