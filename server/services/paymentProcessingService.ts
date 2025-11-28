import { storage } from '../storage';
import { notificationService } from './notificationService';
import { 
  VerotelProvider, 
  VendoServicesProvider, 
  CommerceGateProvider, 
  NETbillingProvider, 
  CentroBillProvider,
  B2BinPayProvider,
  CoinPaymentsProvider,
  iPayoutProvider,
  MassPayProvider,
  WisePayoutProvider,
  PayoneerProvider,
  BangoProvider,
  BokuProvider,
  ACHProvider,
  SEPAProvider
} from './adultPaymentProviders';

// Payment provider interfaces for all adult-friendly processors
interface PaymentProvider {
  name: string;
  type: 'card' | 'crypto' | 'bank' | 'carrier' | 'ewallet';
  supportedCurrencies: string[];
  isAdultFriendly: boolean;
  processingFeeBps: number; // basis points (100 = 1%)
  
  // Core payment methods
  processPayment(request: PaymentRequest): Promise<PaymentResult>;
  processRefund(transactionId: string, amountCents: number): Promise<RefundResult>;
  processSubscription(request: SubscriptionRequest): Promise<SubscriptionResult>;
  
  // Validation and status
  validatePaymentData(data: any): boolean;
  getTransactionStatus(transactionId: string): Promise<TransactionStatus>;
}

interface PayoutProvider {
  name: string;
  type: 'bank' | 'ewallet' | 'crypto' | 'check';
  supportedCurrencies: string[];
  supportedCountries: string[];
  minimumPayoutCents: number;
  processingFeeBps: number;
  
  processPayout(request: PayoutRequest): Promise<PayoutResult>;
  getPayoutStatus(payoutId: string): Promise<PayoutStatus>;
}

interface PaymentRequest {
  userId: string;
  amountCents: number;
  currency: string;
  description: string;
  metadata?: any;
  billingAddress?: BillingAddress;
  paymentMethod: PaymentMethodData;
}

interface PayoutRequest {
  creatorId: string;
  amountCents: number;
  currency: string;
  method: 'bank' | 'ewallet' | 'crypto' | 'check';
  destination: PayoutDestination;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  providerTransactionId: string;
  error?: string;
  requiresAction?: boolean;
  actionUrl?: string;
}

interface PayoutResult {
  success: boolean;
  payoutId: string;
  providerPayoutId: string;
  estimatedArrival?: Date;
  error?: string;
}

// ===== CARD PROCESSORS & GATEWAYS (ADULT-FRIENDLY) =====

class CCBillProvider implements PaymentProvider {
  name = 'ccbill';
  type = 'card' as const;
  supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
  isAdultFriendly = true;
  processingFeeBps = 1250; // 12.5% for adult content

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    console.log(`💳 Processing CCBill payment: $${request.amountCents / 100}`);
    
    try {
      // In production: integrate with CCBill API
      const response = await this.callCCBillAPI({
        clientAccnum: process.env.CCBILL_CLIENT_ACCNUM,
        clientSubacc: process.env.CCBILL_CLIENT_SUBACC,
        formPrice: request.amountCents / 100,
        formPeriod: '30',
        currencyCode: request.currency,
        customerInfo: request.billingAddress
      });

      return {
        success: true,
        transactionId: `ccb_${Date.now()}`,
        providerTransactionId: response.transactionId || `ccb_mock_${Date.now()}`,
      };
    } catch (error) {
      console.error('❌ CCBill payment failed:', error);
      return {
        success: false,
        transactionId: '',
        providerTransactionId: '',
        error: error instanceof Error ? error.message : 'CCBill processing failed'
      };
    }
  }

  async processRefund(transactionId: string, amountCents: number): Promise<RefundResult> {
    console.log(`💸 Processing CCBill refund: ${transactionId}`);
    // Implementation for CCBill refunds
    return { success: true, refundId: `ccb_ref_${Date.now()}` };
  }

  async processSubscription(request: SubscriptionRequest): Promise<SubscriptionResult> {
    console.log(`🔄 Processing CCBill subscription`);
    // CCBill subscription billing implementation
    return { success: true, subscriptionId: `ccb_sub_${Date.now()}` };
  }

  validatePaymentData(data: any): boolean {
    return !!(data.clientAccnum && data.clientSubacc);
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    return { status: 'completed', amountCents: 0 };
  }

  private async callCCBillAPI(data: any): Promise<any> {
    // Mock implementation - in production, integrate with CCBill API
    await new Promise(resolve => setTimeout(resolve, 500));
    return { transactionId: `ccb_${Date.now()}`, status: 'approved' };
  }
}

class SegpayProvider implements PaymentProvider {
  name = 'segpay';
  type = 'card' as const;
  supportedCurrencies = ['USD', 'EUR', 'GBP'];
  isAdultFriendly = true;
  processingFeeBps = 1200; // 12% for adult content

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    console.log(`💳 Processing Segpay payment: $${request.amountCents / 100}`);
    
    // Mock implementation - in production, integrate with Segpay API
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      success: true,
      transactionId: `seg_${Date.now()}`,
      providerTransactionId: `seg_mock_${Date.now()}`,
    };
  }

  async processRefund(transactionId: string, amountCents: number): Promise<RefundResult> {
    return { success: true, refundId: `seg_ref_${Date.now()}` };
  }

  async processSubscription(request: SubscriptionRequest): Promise<SubscriptionResult> {
    return { success: true, subscriptionId: `seg_sub_${Date.now()}` };
  }

  validatePaymentData(data: any): boolean {
    return !!(data.packageId && data.userid);
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    return { status: 'completed', amountCents: 0 };
  }
}

class EpochProvider implements PaymentProvider {
  name = 'epoch';
  type = 'card' as const;
  supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD'];
  isAdultFriendly = true;
  processingFeeBps = 1150; // 11.5% for adult content

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    console.log(`💳 Processing Epoch payment: $${request.amountCents / 100}`);
    
    // Mock implementation - in production, integrate with Epoch API
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      success: true,
      transactionId: `epo_${Date.now()}`,
      providerTransactionId: `epo_mock_${Date.now()}`,
    };
  }

  async processRefund(transactionId: string, amountCents: number): Promise<RefundResult> {
    return { success: true, refundId: `epo_ref_${Date.now()}` };
  }

  async processSubscription(request: SubscriptionRequest): Promise<SubscriptionResult> {
    return { success: true, subscriptionId: `epo_sub_${Date.now()}` };
  }

  validatePaymentData(data: any): boolean {
    return !!(data.pi && data.pf);
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    return { status: 'completed', amountCents: 0 };
  }
}

// ===== CRYPTO GATEWAYS (ADULT-COMPATIBLE) =====

class NOWPaymentsProvider implements PaymentProvider {
  name = 'nowpayments';
  type = 'crypto' as const;
  supportedCurrencies = ['BTC', 'ETH', 'LTC', 'XMR', 'USDT', 'USDC'];
  isAdultFriendly = true;
  processingFeeBps = 50; // 0.5% for crypto

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    console.log(`₿ Processing NOWPayments crypto payment: ${request.amountCents / 100} ${request.currency}`);
    
    try {
      // In production: integrate with NOWPayments API
      const response = await this.callNOWPaymentsAPI({
        price_amount: request.amountCents / 100,
        price_currency: 'USD',
        pay_currency: request.currency,
        order_id: `order_${Date.now()}`,
        order_description: request.description
      });

      return {
        success: true,
        transactionId: `now_${Date.now()}`,
        providerTransactionId: response.payment_id || `now_mock_${Date.now()}`,
        requiresAction: true,
        actionUrl: response.invoice_url
      };
    } catch (error) {
      console.error('❌ NOWPayments failed:', error);
      return {
        success: false,
        transactionId: '',
        providerTransactionId: '',
        error: error instanceof Error ? error.message : 'Crypto payment failed'
      };
    }
  }

  async processRefund(transactionId: string, amountCents: number): Promise<RefundResult> {
    // Crypto refunds are manual processes
    return { success: false, refundId: '', error: 'Crypto refunds require manual processing' };
  }

  async processSubscription(request: SubscriptionRequest): Promise<SubscriptionResult> {
    return { success: true, subscriptionId: `now_sub_${Date.now()}` };
  }

  validatePaymentData(data: any): boolean {
    return !!(data.price_amount && data.pay_currency);
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    return { status: 'pending', amountCents: 0 };
  }

  private async callNOWPaymentsAPI(data: any): Promise<any> {
    // Mock implementation - in production, integrate with NOWPayments API
    await new Promise(resolve => setTimeout(resolve, 300));
    return { 
      payment_id: `now_${Date.now()}`, 
      invoice_url: `https://nowpayments.io/payment/${Date.now()}`,
      status: 'waiting' 
    };
  }
}

class CoinsPaidProvider implements PaymentProvider {
  name = 'coinspaid';
  type = 'crypto' as const;
  supportedCurrencies = ['BTC', 'ETH', 'USDT', 'LTC', 'BCH'];
  isAdultFriendly = true;
  processingFeeBps = 100; // 1% for crypto

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    console.log(`₿ Processing CoinsPaid payment: ${request.amountCents / 100} ${request.currency}`);
    
    // Mock implementation - in production, integrate with CoinsPaid API
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return {
      success: true,
      transactionId: `cp_${Date.now()}`,
      providerTransactionId: `cp_mock_${Date.now()}`,
      requiresAction: true,
      actionUrl: `https://coinspaid.com/payment/${Date.now()}`
    };
  }

  async processRefund(transactionId: string, amountCents: number): Promise<RefundResult> {
    return { success: false, refundId: '', error: 'Crypto refunds require manual processing' };
  }

  async processSubscription(request: SubscriptionRequest): Promise<SubscriptionResult> {
    return { success: true, subscriptionId: `cp_sub_${Date.now()}` };
  }

  validatePaymentData(data: any): boolean {
    return !!(data.amount && data.currency);
  }

  async getTransactionStatus(transactionId: string): Promise<TransactionStatus> {
    return { status: 'pending', amountCents: 0 };
  }
}

// ===== CREATOR PAYOUT PLATFORMS =====

class PaxumPayoutProvider implements PayoutProvider {
  name = 'paxum';
  type = 'ewallet' as const;
  supportedCurrencies = ['USD', 'EUR', 'GBP'];
  supportedCountries = ['US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'AU'];
  minimumPayoutCents = 2000; // $20 minimum
  processingFeeBps = 200; // 2% fee

  async processPayout(request: PayoutRequest): Promise<PayoutResult> {
    console.log(`💰 Processing Paxum payout: $${request.amountCents / 100} to ${request.destination.email}`);
    
    try {
      // In production: integrate with Paxum API
      const response = await this.callPaxumAPI({
        recipient_email: request.destination.email,
        amount: request.amountCents / 100,
        currency: request.currency,
        memo: `BoyFanz creator payout`
      });

      return {
        success: true,
        payoutId: `pax_${Date.now()}`,
        providerPayoutId: response.transaction_id || `pax_mock_${Date.now()}`,
        estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };
    } catch (error) {
      console.error('❌ Paxum payout failed:', error);
      return {
        success: false,
        payoutId: '',
        providerPayoutId: '',
        error: error instanceof Error ? error.message : 'Paxum payout failed'
      };
    }
  }

  async getPayoutStatus(payoutId: string): Promise<PayoutStatus> {
    return { status: 'completed', amountCents: 0 };
  }

  private async callPaxumAPI(data: any): Promise<any> {
    // Mock implementation - in production, integrate with Paxum API
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { transaction_id: `pax_${Date.now()}`, status: 'sent' };
  }
}

class CosmoPaymentProvider implements PayoutProvider {
  name = 'cosmopayment';
  type = 'ewallet' as const;
  supportedCurrencies = ['USD', 'EUR'];
  supportedCountries = ['US', 'CA', 'GB', 'DE', 'FR', 'RO', 'BG'];
  minimumPayoutCents = 1000; // $10 minimum
  processingFeeBps = 250; // 2.5% fee

  async processPayout(request: PayoutRequest): Promise<PayoutResult> {
    console.log(`💰 Processing CosmoPayment payout: $${request.amountCents / 100}`);
    
    // Mock implementation - in production, integrate with CosmoPayment API
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      success: true,
      payoutId: `cos_${Date.now()}`,
      providerPayoutId: `cos_mock_${Date.now()}`,
      estimatedArrival: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
    };
  }

  async getPayoutStatus(payoutId: string): Promise<PayoutStatus> {
    return { status: 'processing', amountCents: 0 };
  }
}

class ePayServiceProvider implements PayoutProvider {
  name = 'epayservice';
  type = 'ewallet' as const;
  supportedCurrencies = ['USD', 'EUR', 'GBP', 'RUB'];
  supportedCountries = ['US', 'GB', 'DE', 'RU', 'UA', 'BY', 'KZ'];
  minimumPayoutCents = 500; // $5 minimum
  processingFeeBps = 300; // 3% fee

  async processPayout(request: PayoutRequest): Promise<PayoutResult> {
    console.log(`💰 Processing ePayService payout: $${request.amountCents / 100}`);
    
    // Mock implementation - in production, integrate with ePayService API
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      success: true,
      payoutId: `eps_${Date.now()}`,
      providerPayoutId: `eps_mock_${Date.now()}`,
      estimatedArrival: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours
    };
  }

  async getPayoutStatus(payoutId: string): Promise<PayoutStatus> {
    return { status: 'completed', amountCents: 0 };
  }
}

// ===== MAIN PAYMENT PROCESSING SERVICE =====

export class PaymentProcessingService {
  private paymentProviders: Map<string, PaymentProvider> = new Map();
  private payoutProviders: Map<string, PayoutProvider> = new Map();
  private fallbackRouting: { [key: string]: string[] } = {};

  constructor() {
    this.initializeProviders();
    this.setupFallbackRouting();
  }

  private initializeProviders(): void {
    // Card processors (adult-friendly) - Primary tier
    this.paymentProviders.set('ccbill', new CCBillProvider());
    this.paymentProviders.set('segpay', new SegpayProvider());
    this.paymentProviders.set('epoch', new EpochProvider());
    this.paymentProviders.set('verotel', new VerotelProvider());
    this.paymentProviders.set('vendo', new VendoServicesProvider());
    this.paymentProviders.set('commercegate', new CommerceGateProvider());
    this.paymentProviders.set('netbilling', new NETbillingProvider());
    this.paymentProviders.set('centrobill', new CentroBillProvider());
    
    // Crypto gateways (adult-compatible) - Using providers from main service
    this.paymentProviders.set('nowpayments', new NOWPaymentsProvider());
    this.paymentProviders.set('coinspaid', new CoinsPaidProvider());
    this.paymentProviders.set('b2binpay', new B2BinPayProvider());
    this.paymentProviders.set('coinpayments', new CoinPaymentsProvider());
    
    // Bank transfer providers
    this.paymentProviders.set('ach', new ACHProvider());
    this.paymentProviders.set('sepa', new SEPAProvider());
    
    // Direct carrier billing (limited adult support)
    this.paymentProviders.set('bango', new BangoProvider());
    this.paymentProviders.set('boku', new BokuProvider());
    
    // Creator payout providers - All providers properly registered
    this.payoutProviders.set('paxum', new PaxumPayoutProvider());
    this.payoutProviders.set('cosmopayment', new CosmoPaymentProvider());
    this.payoutProviders.set('epayservice', new ePayServiceProvider());
    this.payoutProviders.set('ipayout', new iPayoutProvider());
    this.payoutProviders.set('masspay', new MassPayProvider());
    this.payoutProviders.set('wise', new WisePayoutProvider());
    this.payoutProviders.set('payoneer', new PayoneerProvider());

    console.log(`🔌 Initialized ${this.paymentProviders.size} payment providers and ${this.payoutProviders.size} payout providers`);
    console.log(`💳 Card processors: ${Array.from(this.paymentProviders.values()).filter(p => p.type === 'card').map(p => p.name).join(', ')}`);
    console.log(`₿ Crypto gateways: ${Array.from(this.paymentProviders.values()).filter(p => p.type === 'crypto').map(p => p.name).join(', ')}`);
    console.log(`💰 Payout providers: ${Array.from(this.payoutProviders.values()).map(p => p.name).join(', ')}`);
    
    // Verify all expected providers are registered
    this.verifyProviderCoverage();
  }

  private verifyProviderCoverage(): void {
    const expectedCardProviders = ['ccbill', 'segpay', 'epoch', 'verotel', 'vendo', 'commercegate', 'netbilling', 'centrobill'];
    const expectedCryptoProviders = ['nowpayments', 'coinspaid', 'b2binpay', 'coinpayments'];
    const expectedPayoutProviders = ['paxum', 'cosmopayment', 'epayservice', 'ipayout', 'masspay', 'wise', 'payoneer'];
    
    const missingCard = expectedCardProviders.filter(name => !this.paymentProviders.has(name));
    const missingCrypto = expectedCryptoProviders.filter(name => !this.paymentProviders.has(name));
    const missingPayout = expectedPayoutProviders.filter(name => !this.payoutProviders.has(name));
    
    if (missingCard.length > 0) console.warn(`⚠️ Missing card providers: ${missingCard.join(', ')}`);
    if (missingCrypto.length > 0) console.warn(`⚠️ Missing crypto providers: ${missingCrypto.join(', ')}`);
    if (missingPayout.length > 0) console.warn(`⚠️ Missing payout providers: ${missingPayout.join(', ')}`);
    
    if (missingCard.length === 0 && missingCrypto.length === 0 && missingPayout.length === 0) {
      console.log(`✅ All expected payment processors successfully registered`);
    }
  }

  private setupFallbackRouting(): void {
    // Define comprehensive fallback chains for adult-friendly processing
    this.fallbackRouting = {
      // Card processing with regional optimization
      'card_usd': ['ccbill', 'segpay', 'epoch', 'verotel', 'netbilling'],
      'card_eur': ['segpay', 'verotel', 'commercegate', 'ccbill', 'epoch'],
      'card_gbp': ['verotel', 'segpay', 'ccbill', 'epoch'],
      'card_cad': ['ccbill', 'epoch', 'netbilling'],
      'card_global': ['vendo', 'centrobill', 'verotel', 'ccbill'],
      
      // Crypto payments
      'crypto_btc': ['nowpayments', 'coinspaid', 'b2binpay', 'coinpayments'],
      'crypto_eth': ['coinspaid', 'nowpayments', 'b2binpay'],
      'crypto_usdt': ['b2binpay', 'coinspaid', 'nowpayments'],
      
      // Bank transfers
      'bank_usd': ['ach', 'netbilling'],
      'bank_eur': ['sepa', 'commercegate'],
      
      // Creator payouts by region/currency
      'payout_usd': ['paxum', 'ipayout', 'masspay', 'epayservice'],
      'payout_eur': ['epayservice', 'wise', 'paxum', 'masspay'],
      'payout_gbp': ['wise', 'paxum', 'ipayout'],
      'payout_global': ['payoneer', 'wise', 'paxum', 'masspay'],
      
      // High-volume/enterprise routing
      'enterprise_card': ['ccbill', 'epoch', 'vendo'],
      'enterprise_crypto': ['coinspaid', 'b2binpay'],
      'enterprise_payout': ['masspay', 'ipayout', 'payoneer']
    };
    
    console.log(`🔀 Configured fallback routing for ${Object.keys(this.fallbackRouting).length} scenarios`);
  }

  // Process payment with automatic failover, idempotency, and persistence
  async processPayment(request: PaymentRequest, preferredProvider?: string, idempotencyKey?: string): Promise<PaymentResult> {
    // Generate idempotency key if not provided
    const iKey = idempotencyKey || `${request.userId}_${request.amountCents}_${Date.now()}`;
    
    // Check for duplicate transaction
    const existingTransaction = await this.checkIdempotency(iKey);
    if (existingTransaction) {
      console.log(`🔄 Returning cached result for idempotency key: ${iKey}`);
      return existingTransaction;
    }

    // Create pending transaction record
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.persistTransaction({
      id: transactionId,
      userId: request.userId,
      amountCents: request.amountCents,
      currency: request.currency,
      status: 'pending',
      idempotencyKey: iKey,
      metadata: request.metadata,
      createdAt: new Date()
    });

    const routingKey = this.determineRoutingKey(request);
    const providers = preferredProvider 
      ? [preferredProvider, ...(this.fallbackRouting[routingKey] || [])]
      : this.fallbackRouting[routingKey] || ['ccbill'];

    console.log(`💳 Processing payment with routing: ${providers.join(' → ')}`);

    for (const providerName of providers) {
      const provider = this.paymentProviders.get(providerName);
      if (!provider) continue;

      try {
        // Check provider health/circuit breaker
        if (await this.isProviderHealthy(providerName)) {
          const result = await provider.processPayment(request);
          
          if (result.success) {
            // Update transaction record
            await this.updateTransactionStatus(transactionId, {
              status: 'completed',
              providerName,
              providerTransactionId: result.providerTransactionId,
              completedAt: new Date()
            });

            // Cache result for idempotency
            await this.cacheIdempotencyResult(iKey, result);

            // Log successful payment
            await this.logPaymentEvent({
              userId: request.userId,
              provider: providerName,
              amountCents: request.amountCents,
              currency: request.currency,
              transactionId: result.transactionId,
              status: 'completed'
            });

            return result;
          } else {
            // Mark provider attempt failed
            await this.recordProviderFailure(providerName, result.error || 'Unknown error');
          }
        } else {
          console.log(`⚠️ Provider ${providerName} unhealthy, skipping`);
        }
      } catch (error) {
        console.error(`❌ Provider ${providerName} failed:`, error);
        await this.recordProviderFailure(providerName, error instanceof Error ? error.message : 'Unknown error');
        continue; // Try next provider
      }
    }

    // All providers failed - update transaction
    await this.updateTransactionStatus(transactionId, {
      status: 'failed',
      error: 'All payment providers failed',
      failedAt: new Date()
    });

    const failureResult = {
      success: false,
      transactionId,
      providerTransactionId: '',
      error: 'All payment providers failed'
    };

    // Cache failure for idempotency
    await this.cacheIdempotencyResult(iKey, failureResult);
    return failureResult;
  }

  // Process creator payout with KYC/AML checks, automatic routing, and persistence
  async processPayout(request: PayoutRequest, preferredProvider?: string, idempotencyKey?: string): Promise<PayoutResult> {
    // Generate idempotency key if not provided
    const iKey = idempotencyKey || `payout_${request.creatorId}_${request.amountCents}_${Date.now()}`;
    
    // Check for duplicate payout
    const existingPayout = await this.checkPayoutIdempotency(iKey);
    if (existingPayout) {
      console.log(`🔄 Returning cached payout result for idempotency key: ${iKey}`);
      return existingPayout;
    }

    // CRITICAL: Enforce KYC/AML compliance before payouts
    const kycStatus = await this.checkCreatorKYCStatus(request.creatorId);
    if (!kycStatus.verified || !kycStatus.ageVerified) {
      const failureResult = {
        success: false,
        payoutId: '',
        providerPayoutId: '',
        error: 'KYC verification required before payouts. Creator must complete identity verification.'
      };
      await this.cachePayoutIdempotencyResult(iKey, failureResult);
      return failureResult;
    }

    // Check AML compliance and suspicious activity
    const amlCheck = await this.performAMLCheck(request.creatorId, request.amountCents);
    if (!amlCheck.passed) {
      const failureResult = {
        success: false,
        payoutId: '',
        providerPayoutId: '',
        error: `AML check failed: ${amlCheck.reason}. Payout requires manual review.`
      };
      await this.cachePayoutIdempotencyResult(iKey, failureResult);
      return failureResult;
    }

    // Create pending payout record
    const payoutId = `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.persistPayout({
      id: payoutId,
      creatorId: request.creatorId,
      amountCents: request.amountCents,
      currency: request.currency,
      method: request.method,
      destination: request.destination,
      status: 'pending',
      idempotencyKey: iKey,
      kycVerified: true,
      amlPassed: true,
      createdAt: new Date()
    });

    const routingKey = `payout_${request.currency.toLowerCase()}`;
    const providers = preferredProvider 
      ? [preferredProvider, ...(this.fallbackRouting[routingKey] || [])]
      : this.fallbackRouting[routingKey] || ['paxum'];

    console.log(`💰 Processing payout with routing: ${providers.join(' → ')}`);

    for (const providerName of providers) {
      const provider = this.payoutProviders.get(providerName);
      if (!provider) continue;

      // Check minimum payout amount
      if (request.amountCents < provider.minimumPayoutCents) {
        console.log(`⚠️ Amount below minimum for ${providerName}: $${request.amountCents / 100} < $${provider.minimumPayoutCents / 100}`);
        continue;
      }

      try {
        // Check provider health
        if (await this.isPayoutProviderHealthy(providerName)) {
          const result = await provider.processPayout(request);
          
          if (result.success) {
            // Update payout record
            await this.updatePayoutStatus(payoutId, {
              status: 'processing',
              providerName,
              providerPayoutId: result.providerPayoutId,
              estimatedArrival: result.estimatedArrival,
              processingStartedAt: new Date()
            });

            // Cache result for idempotency
            await this.cachePayoutIdempotencyResult(iKey, result);

            // Log successful payout
            await this.logPayoutEvent({
              creatorId: request.creatorId,
              provider: providerName,
              amountCents: request.amountCents,
              currency: request.currency,
              payoutId: result.payoutId,
              status: 'processing'
            });

            return result;
          } else {
            await this.recordPayoutProviderFailure(providerName, result.error || 'Unknown error');
          }
        } else {
          console.log(`⚠️ Payout provider ${providerName} unhealthy, skipping`);
        }
      } catch (error) {
        console.error(`❌ Payout provider ${providerName} failed:`, error);
        await this.recordPayoutProviderFailure(providerName, error instanceof Error ? error.message : 'Unknown error');
        continue; // Try next provider
      }
    }

    // All providers failed - update payout
    await this.updatePayoutStatus(payoutId, {
      status: 'failed',
      error: 'All payout providers failed',
      failedAt: new Date()
    });

    const failureResult = {
      success: false,
      payoutId,
      providerPayoutId: '',
      error: 'All payout providers failed'
    };

    await this.cachePayoutIdempotencyResult(iKey, failureResult);
    return failureResult;
  }

  // Get available payment methods for region/currency
  getAvailablePaymentMethods(currency: string, country?: string): PaymentProvider[] {
    return Array.from(this.paymentProviders.values())
      .filter(provider => 
        provider.supportedCurrencies.includes(currency.toUpperCase()) &&
        provider.isAdultFriendly
      );
  }

  // Get available payout methods for creator
  getAvailablePayoutMethods(currency: string, country?: string): PayoutProvider[] {
    return Array.from(this.payoutProviders.values())
      .filter(provider => 
        provider.supportedCurrencies.includes(currency.toUpperCase()) &&
        (!country || provider.supportedCountries.includes(country.toUpperCase()))
      );
  }

  private async logPaymentEvent(event: any): Promise<void> {
    try {
      await storage.createAuditLog({
        actorId: event.userId,
        action: 'payment_processed',
        targetType: 'payment',
        targetId: event.transactionId,
        diffJson: event
      });
    } catch (error) {
      console.error('Failed to log payment event:', error);
    }
  }

  private async logPayoutEvent(event: any): Promise<void> {
    try {
      await storage.createAuditLog({
        actorId: event.creatorId,
        action: 'payout_processed',
        targetType: 'payout',
        targetId: event.payoutId,
        diffJson: event
      });
    } catch (error) {
      console.error('Failed to log payout event:', error);
    }
  }

  // ===== ROBUST ORCHESTRATION LAYER METHODS =====

  // Idempotency management
  private idempotencyCache = new Map<string, any>();
  private payoutIdempotencyCache = new Map<string, any>();

  private async checkIdempotency(key: string): Promise<PaymentResult | null> {
    return this.idempotencyCache.get(key) || null;
  }

  private async checkPayoutIdempotency(key: string): Promise<PayoutResult | null> {
    return this.payoutIdempotencyCache.get(key) || null;
  }

  private async cacheIdempotencyResult(key: string, result: PaymentResult): Promise<void> {
    this.idempotencyCache.set(key, result);
    // Cache expires after 24 hours
    setTimeout(() => this.idempotencyCache.delete(key), 24 * 60 * 60 * 1000);
  }

  private async cachePayoutIdempotencyResult(key: string, result: PayoutResult): Promise<void> {
    this.payoutIdempotencyCache.set(key, result);
    // Cache expires after 24 hours
    setTimeout(() => this.payoutIdempotencyCache.delete(key), 24 * 60 * 60 * 1000);
  }

  // Transaction and payout persistence
  private async persistTransaction(transaction: any): Promise<void> {
    try {
      // Store in database for audit trail and reconciliation
      await storage.createAuditLog({
        actorId: transaction.userId,
        action: 'transaction_created',
        targetType: 'payment_transaction',
        targetId: transaction.id,
        diffJson: transaction
      });
    } catch (error) {
      console.error('Failed to persist transaction:', error);
    }
  }

  private async persistPayout(payout: any): Promise<void> {
    try {
      // Store in database for audit trail and reconciliation
      await storage.createAuditLog({
        actorId: payout.creatorId,
        action: 'payout_created',
        targetType: 'payout_transaction',
        targetId: payout.id,
        diffJson: payout
      });
    } catch (error) {
      console.error('Failed to persist payout:', error);
    }
  }

  private async updateTransactionStatus(transactionId: string, update: any): Promise<void> {
    try {
      await storage.createAuditLog({
        actorId: 'system',
        action: 'transaction_updated',
        targetType: 'payment_transaction',
        targetId: transactionId,
        diffJson: update
      });
    } catch (error) {
      console.error('Failed to update transaction status:', error);
    }
  }

  private async updatePayoutStatus(payoutId: string, update: any): Promise<void> {
    try {
      await storage.createAuditLog({
        actorId: 'system',
        action: 'payout_updated',
        targetType: 'payout_transaction',
        targetId: payoutId,
        diffJson: update
      });
    } catch (error) {
      console.error('Failed to update payout status:', error);
    }
  }

  // Provider health monitoring and circuit breaker
  private providerHealth = new Map<string, { healthy: boolean, lastCheck: Date, failures: number }>();
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // failures before circuit opens
  private readonly CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes

  private async isProviderHealthy(providerName: string): Promise<boolean> {
    const health = this.providerHealth.get(providerName);
    if (!health) {
      this.providerHealth.set(providerName, { healthy: true, lastCheck: new Date(), failures: 0 });
      return true;
    }

    // If circuit is open, check if timeout has passed
    if (!health.healthy) {
      const timeSinceLastCheck = Date.now() - health.lastCheck.getTime();
      if (timeSinceLastCheck > this.CIRCUIT_BREAKER_TIMEOUT) {
        console.log(`🔄 Attempting to reset circuit breaker for ${providerName}`);
        health.healthy = true;
        health.failures = 0;
        health.lastCheck = new Date();
        return true;
      }
      return false;
    }

    return health.healthy;
  }

  private async isPayoutProviderHealthy(providerName: string): Promise<boolean> {
    return this.isProviderHealthy(providerName); // Same logic for now
  }

  private async recordProviderFailure(providerName: string, error: string): Promise<void> {
    const health = this.providerHealth.get(providerName) || { healthy: true, lastCheck: new Date(), failures: 0 };
    health.failures++;
    health.lastCheck = new Date();

    if (health.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      health.healthy = false;
      console.warn(`⚠️ Circuit breaker opened for ${providerName} after ${health.failures} failures`);
    }

    this.providerHealth.set(providerName, health);
    
    // Log provider failure for monitoring
    await storage.createAuditLog({
      actorId: 'system',
      action: 'provider_failure',
      targetType: 'payment_provider',
      targetId: providerName,
      diffJson: { error, failureCount: health.failures, circuitOpen: !health.healthy }
    });
  }

  private async recordPayoutProviderFailure(providerName: string, error: string): Promise<void> {
    return this.recordProviderFailure(providerName, error);
  }

  // KYC/AML compliance checks
  private async checkCreatorKYCStatus(creatorId: string): Promise<{ verified: boolean, ageVerified: boolean, reason?: string }> {
    try {
      const user = await storage.getUser(creatorId);
      if (!user) {
        return { verified: false, ageVerified: false, reason: 'User not found' };
      }

      // Check if user has KYC status in database
      const kycStatus = await storage.getUserKYCStatus?.(creatorId);
      if (kycStatus) {
        return {
          verified: kycStatus.status === 'verified',
          ageVerified: kycStatus.ageVerified === true,
          reason: kycStatus.status !== 'verified' ? 'KYC verification incomplete' : undefined
        };
      }

      // For development: Mock KYC check
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚠️ Development mode: Mocking KYC verification for ${creatorId}`);
        return { verified: true, ageVerified: true };
      }

      return { verified: false, ageVerified: false, reason: 'KYC verification required' };
    } catch (error) {
      console.error('KYC check failed:', error);
      return { verified: false, ageVerified: false, reason: 'KYC check system error' };
    }
  }

  private async performAMLCheck(creatorId: string, amountCents: number): Promise<{ passed: boolean, reason?: string }> {
    try {
      // Check for suspicious patterns
      const LARGE_AMOUNT_THRESHOLD = 1000000; // $10,000 in cents
      const DAILY_LIMIT = 5000000; // $50,000 in cents per day

      // Check daily payout total
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Mock daily total check - in production, query actual payout history
      const dailyTotal = await this.getDailyPayoutTotal(creatorId, today);
      
      if (dailyTotal + amountCents > DAILY_LIMIT) {
        return { passed: false, reason: 'Daily payout limit exceeded' };
      }

      if (amountCents > LARGE_AMOUNT_THRESHOLD) {
        return { passed: false, reason: 'Large amount requires manual review' };
      }

      // For development: Pass AML checks
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚠️ Development mode: Passing AML check for ${creatorId}`);
        return { passed: true };
      }

      return { passed: true };
    } catch (error) {
      console.error('AML check failed:', error);
      return { passed: false, reason: 'AML check system error' };
    }
  }

  private async getDailyPayoutTotal(creatorId: string, date: Date): Promise<number> {
    // Mock implementation - in production, query actual payout database
    return 0;
  }

  // Smart routing based on request characteristics
  private determineRoutingKey(request: PaymentRequest): string {
    const { currency, amountCents } = request;
    
    // Large transactions get enterprise routing
    if (amountCents > 100000) { // $1000+
      return currency === 'USD' ? 'enterprise_card' : 'card_global';
    }
    
    // Crypto transactions
    if (request.paymentMethod?.type === 'crypto') {
      return `crypto_${currency.toLowerCase()}`;
    }
    
    // Bank transfers
    if (request.paymentMethod?.type === 'bank') {
      return `bank_${currency.toLowerCase()}`;
    }
    
    // Default card routing
    return `card_${currency.toLowerCase()}`;
  }

  // Webhook signature verification
  async verifyWebhookSignature(provider: string, payload: string, signature: string, secret: string): Promise<boolean> {
    try {
      const crypto = await import('crypto');
      
      switch (provider) {
        case 'ccbill':
          // CCBill uses MD5 hash verification
          const ccbillHash = crypto.createHash('md5').update(payload + secret).digest('hex');
          return signature.toLowerCase() === ccbillHash;
          
        case 'segpay':
          // Segpay uses HMAC-SHA256
          const segpaySignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
          return signature === segpaySignature;
          
        case 'nowpayments':
          // NOWPayments uses HMAC-SHA512
          const nowSignature = crypto.createHmac('sha512', secret).update(payload).digest('hex');
          return signature === nowSignature;
          
        case 'coinspaid':
          // CoinsPaid uses custom HMAC verification
          const coinspaidSignature = crypto.createHmac('sha512', secret).update(payload).digest('hex');
          return signature === coinspaidSignature;
          
        default:
          console.warn(`Unknown webhook provider: ${provider}`);
          return false;
      }
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  // Webhook processing with idempotent status updates
  async processWebhook(provider: string, webhookData: any): Promise<{ success: boolean, message: string }> {
    try {
      const { transactionId, status, providerTransactionId } = webhookData;
      
      if (!transactionId) {
        return { success: false, message: 'Missing transaction ID' };
      }

      // Prevent duplicate webhook processing
      const webhookKey = `webhook_${provider}_${transactionId}_${status}`;
      if (this.idempotencyCache.has(webhookKey)) {
        return { success: true, message: 'Webhook already processed' };
      }

      // Update transaction status
      await this.updateTransactionStatus(transactionId, {
        status,
        providerTransactionId,
        webhookReceivedAt: new Date(),
        webhookProvider: provider
      });

      // Cache to prevent reprocessing
      this.cacheIdempotencyResult(webhookKey, { success: true } as any);

      console.log(`✅ Processed ${provider} webhook for transaction ${transactionId}: ${status}`);
      return { success: true, message: 'Webhook processed successfully' };
    } catch (error) {
      console.error('Webhook processing failed:', error);
      return { success: false, message: 'Webhook processing failed' };
    }
  }

  // Payout webhook processing with idempotent status updates
  async processPayoutWebhook(provider: string, webhookData: any): Promise<{ success: boolean, message: string }> {
    try {
      const { payoutId, status, providerPayoutId, errorMessage } = webhookData;
      
      if (!payoutId) {
        return { success: false, message: 'Missing payout ID' };
      }

      // Prevent duplicate webhook processing
      const webhookKey = `payout_webhook_${provider}_${payoutId}_${status}`;
      if (this.payoutIdempotencyCache.has(webhookKey)) {
        return { success: true, message: 'Payout webhook already processed' };
      }

      // Update payout status
      const updateData: any = {
        status,
        providerPayoutId,
        webhookReceivedAt: new Date(),
        webhookProvider: provider
      };

      if (status === 'completed') {
        updateData.completedAt = new Date();
      } else if (status === 'failed') {
        updateData.failedAt = new Date();
        updateData.error = errorMessage || 'Payout failed';
      }

      await this.updatePayoutStatus(payoutId, updateData);

      // Cache to prevent reprocessing
      this.payoutIdempotencyCache.set(webhookKey, { success: true });
      setTimeout(() => this.payoutIdempotencyCache.delete(webhookKey), 24 * 60 * 60 * 1000);

      // Log payout status change
      await storage.createAuditLog({
        actorId: 'system',
        action: 'payout_webhook_processed',
        targetType: 'payout_transaction',
        targetId: payoutId,
        diffJson: { provider, status, providerPayoutId, webhookData }
      });

      console.log(`✅ Processed ${provider} payout webhook for ${payoutId}: ${status}`);
      return { success: true, message: 'Payout webhook processed successfully' };
    } catch (error) {
      console.error('Payout webhook processing failed:', error);
      return { success: false, message: 'Payout webhook processing failed' };
    }
  }

  // ===== PROVIDER LISTING METHODS =====

  /**
   * Get all available payment providers for deposits
   */
  getAvailablePaymentProviders(): Array<{
    id: string;
    name: string;
    type: string;
    currencies: string[];
    feeBps: number;
  }> {
    const providers: Array<{
      id: string;
      name: string;
      type: string;
      currencies: string[];
      feeBps: number;
    }> = [];

    for (const [id, provider] of this.paymentProviders) {
      providers.push({
        id,
        name: provider.name,
        type: provider.type,
        currencies: provider.supportedCurrencies,
        feeBps: provider.processingFeeBps,
      });
    }

    return providers;
  }

  /**
   * Get all available payout providers for withdrawals
   */
  getAvailablePayoutProviders(): Array<{
    id: string;
    name: string;
    type: string;
    currencies: string[];
    countries: string[];
    minimumCents: number;
    feeBps: number;
  }> {
    const providers: Array<{
      id: string;
      name: string;
      type: string;
      currencies: string[];
      countries: string[];
      minimumCents: number;
      feeBps: number;
    }> = [];

    for (const [id, provider] of this.payoutProviders) {
      providers.push({
        id,
        name: provider.name,
        type: provider.type,
        currencies: provider.supportedCurrencies,
        countries: provider.supportedCountries,
        minimumCents: provider.minimumPayoutCents,
        feeBps: provider.processingFeeBps,
      });
    }

    return providers;
  }
}

// Type definitions
interface BillingAddress {
  name: string;
  email: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface PaymentMethodData {
  type: 'card' | 'crypto' | 'bank';
  card?: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  };
  crypto?: {
    currency: string;
    walletAddress?: string;
  };
}

interface PayoutDestination {
  type: 'bank' | 'ewallet' | 'crypto' | 'check';
  email?: string;
  bankAccount?: {
    accountNumber: string;
    routingNumber: string;
    accountType: 'checking' | 'savings';
  };
  cryptoAddress?: string;
  checkAddress?: BillingAddress;
}

interface SubscriptionRequest {
  userId: string;
  planId: string;
  amountCents: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  paymentMethod: PaymentMethodData;
}

interface SubscriptionResult {
  success: boolean;
  subscriptionId: string;
  error?: string;
}

interface RefundResult {
  success: boolean;
  refundId: string;
  error?: string;
}

interface TransactionStatus {
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  amountCents: number;
}

interface PayoutStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amountCents: number;
}

export const paymentProcessingService = new PaymentProcessingService();