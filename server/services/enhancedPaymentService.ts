import { storage } from '../storage';

// Enhanced Payment Service with Apple Pay, Google Pay, and crypto support
class EnhancedPaymentService {
  private stripe: Stripe | null = null;
  private isStripeEnabled = false;
  
  constructor() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey && stripeSecretKey !== 'test_key') {
      try {
        this.stripe = new Stripe(stripeSecretKey, {
          apiVersion: '2025-08-27.basil'
        });
        this.isStripeEnabled = true;
        console.log('✅ Enhanced Payment Service initialized with Stripe');
      } catch (error) {
        console.warn('⚠️ Stripe initialization failed:', error);
        this.isStripeEnabled = false;
      }
    } else {
      console.warn('⚠️ Enhanced Payment Service running without Stripe (missing STRIPE_SECRET_KEY)');
      this.isStripeEnabled = false;
    }
  }

  private ensureStripeEnabled(): void {
    if (!this.isStripeEnabled || !this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
    }
  }

  // Apple Pay merchant validation with proper certificate validation
  async validateApplePayMerchant(validationURL: string, domainName: string): Promise<any> {
    try {
      // SECURITY: Validate URL is from Apple's allowed domains
      const allowedDomains = [
        'apple-pay-gateway-cert.apple.com',
        'apple-pay-gateway-nc-pod1.apple.com',
        'apple-pay-gateway-nc-pod2.apple.com',
        'apple-pay-gateway-nc-pod3.apple.com',
        'apple-pay-gateway-nc-pod4.apple.com',
        'apple-pay-gateway-nc-pod5.apple.com'
      ];

      const urlObj = new URL(validationURL);
      if (!allowedDomains.includes(urlObj.hostname)) {
        throw new Error('Invalid Apple Pay validation URL domain');
      }

      // SECURITY: Verify we have the required merchant certificate
      const merchantCertificate = process.env.APPLE_PAY_MERCHANT_CERTIFICATE;
      const merchantKey = process.env.APPLE_PAY_MERCHANT_KEY;
      
      if (!merchantCertificate || !merchantKey) {
        throw new Error('Apple Pay merchant certificate not configured');
      }

      // For production: Use certificate-based authentication
      // This is a placeholder - actual implementation requires HTTPS client certificates
      console.warn('Apple Pay merchant validation requires certificate-based authentication in production');
      
      // Temporarily disable Apple Pay until proper certificate setup
      throw new Error('Apple Pay temporarily disabled - certificate setup required');
      
    } catch (error) {
      console.error('Apple Pay validation error:', error);
      throw error;
    }
  }

  // Process Apple Pay payment
  async processApplePayPayment(paymentToken: any, amount: number, currency: string, userId?: string): Promise<any> {
    try {
      this.ensureStripeEnabled();
      // For Apple Pay, create payment method first then use it
      const paymentMethod = await this.stripe!.paymentMethods.create({
        type: 'card',
        card: {
          token: paymentToken.token
        }
      });

      // Create payment intent with the payment method
      const paymentIntent = await this.stripe!.paymentIntents.create({
        amount: amount,
        currency: currency.toLowerCase(),
        payment_method: paymentMethod.id,
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          payment_method: 'apple_pay',
          user_id: userId || 'anonymous'
        }
      });

      // Store transaction record
      if (userId) {
        await this.createTransactionRecord({
          userId,
          amount,
          currency,
          paymentMethod: 'apple_pay',
          stripePaymentIntentId: paymentIntent.id,
          status: paymentIntent.status
        });
      }

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      };
    } catch (error) {
      console.error('Apple Pay processing error:', error);
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }

  // Process Google Pay payment  
  async processGooglePayPayment(paymentMethodData: any, amount: number, currency: string, userId?: string): Promise<any> {
    try {
      this.ensureStripeEnabled();
      // Create payment method from Google Pay token
      const paymentMethod = await this.stripe!.paymentMethods.create({
        type: 'card',
        card: {
          token: paymentMethodData.tokenizationData.token
        }
      });

      // Create and confirm payment intent
      const paymentIntent = await this.stripe!.paymentIntents.create({
        amount: amount,
        currency: currency.toLowerCase(),
        payment_method: paymentMethod.id,
        confirmation_method: 'manual',
        confirm: true,
        metadata: {
          payment_method: 'google_pay',
          user_id: userId || 'anonymous'
        }
      });

      // Store transaction record
      if (userId) {
        await this.createTransactionRecord({
          userId,
          amount,
          currency,
          paymentMethod: 'google_pay',
          stripePaymentIntentId: paymentIntent.id,
          status: paymentIntent.status
        });
      }

      return {
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      };
    } catch (error) {
      console.error('Google Pay processing error:', error);
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }

  // Enhanced Stripe payment with saved cards support
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customerId?: string;
    paymentMethodId?: string;
    savePaymentMethod?: boolean;
    metadata?: Record<string, string>;
  }): Promise<any> {
    try {
      this.ensureStripeEnabled();
      const { amount, currency, customerId, paymentMethodId, savePaymentMethod, metadata } = params;

      const paymentIntentData: any = {
        amount,
        currency: currency.toLowerCase(),
        metadata: {
          ...metadata,
          created_via: 'enhanced_stripe_service'
        }
      };

      // Add customer and payment method if provided
      if (customerId) {
        paymentIntentData.customer = customerId;
      }

      if (paymentMethodId) {
        paymentIntentData.payment_method = paymentMethodId;
        paymentIntentData.confirmation_method = 'manual';
        paymentIntentData.confirm = true;
      }

      // Configure for saving payment method
      if (savePaymentMethod) {
        paymentIntentData.setup_future_usage = 'off_session';
      }

      const paymentIntent = await this.stripe!.paymentIntents.create(paymentIntentData);

      return {
        success: true,
        paymentIntent,
        clientSecret: paymentIntent.client_secret
      };
    } catch (error) {
      console.error('Enhanced Stripe payment intent creation failed:', error);
      return {
        success: false,
        error: 'Payment intent creation failed'
      };
    }
  }

  // Create or retrieve Stripe customer
  async getOrCreateStripeCustomer(userId: string, email?: string, name?: string): Promise<string> {
    try {
      this.ensureStripeEnabled();
      // Check if customer already exists in our records
      const existingCustomer = await storage.getStripeCustomerId(userId);
      if (existingCustomer) {
        return existingCustomer;
      }

      // Create new Stripe customer
      const customer = await this.stripe!.customers.create({
        email,
        name,
        metadata: {
          user_id: userId,
          platform: 'boyfanz'
        }
      });

      // Store customer ID in our database
      await storage.storeStripeCustomerId(userId, customer.id);

      return customer.id;
    } catch (error) {
      console.error('Stripe customer creation failed:', error);
      throw error;
    }
  }

  // Get saved payment methods for customer
  async getSavedPaymentMethods(customerId: string): Promise<any[]> {
    try {
      this.ensureStripeEnabled();
      const paymentMethods = await this.stripe!.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
        funding: pm.card?.funding
      }));
    } catch (error) {
      console.error('Failed to retrieve saved payment methods:', error);
      return [];
    }
  }

  // Coinbase Commerce integration
  async createCoinbaseCharge(params: {
    amount: number;
    currency: string;
    description: string;
    userId?: string;
  }): Promise<any> {
    try {
      const coinbaseApiKey = process.env.COINBASE_COMMERCE_API_KEY;
      if (!coinbaseApiKey) {
        throw new Error('Coinbase Commerce API key not configured');
      }

      const response = await fetch('https://api.commerce.coinbase.com/charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CC-Api-Key': coinbaseApiKey,
          'X-CC-Version': '2018-03-22'
        },
        body: JSON.stringify({
          name: params.description,
          description: params.description,
          pricing_type: 'fixed_price',
          local_price: {
            amount: (params.amount / 100).toFixed(2),
            currency: params.currency
          },
          metadata: {
            user_id: params.userId || 'anonymous',
            platform: 'boyfanz'
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Coinbase charge creation failed');
      }

      return {
        success: true,
        chargeId: result.data.id,
        hostedUrl: result.data.hosted_url,
        addresses: result.data.addresses
      };
    } catch (error) {
      console.error('Coinbase Commerce charge creation failed:', error);
      return {
        success: false,
        error: 'Crypto payment creation failed'
      };
    }
  }

  // BitPay integration
  async createBitPayInvoice(params: {
    amount: number;
    currency: string;
    description: string;
    userId?: string;
  }): Promise<any> {
    try {
      const bitpayToken = process.env.BITPAY_API_TOKEN;
      if (!bitpayToken) {
        throw new Error('BitPay API token not configured');
      }

      const response = await fetch('https://bitpay.com/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bitpayToken}`
        },
        body: JSON.stringify({
          price: (params.amount / 100).toFixed(2),
          currency: params.currency,
          itemDesc: params.description,
          notificationURL: `${process.env.BASE_URL}/api/webhooks/bitpay`,
          redirectURL: `${process.env.BASE_URL}/payment/success`,
          buyer: {
            name: 'BoyFanz User',
            email: 'user@boyfanz.com'
          },
          token: bitpayToken
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'BitPay invoice creation failed');
      }

      return {
        success: true,
        invoiceId: result.data.id,
        paymentUrl: result.data.url,
        bitcoinAddress: result.data.bitcoinAddress
      };
    } catch (error) {
      console.error('BitPay invoice creation failed:', error);
      return {
        success: false,
        error: 'Bitcoin payment creation failed'
      };
    }
  }

  // Create transaction record in database
  private async createTransactionRecord(params: {
    userId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    stripePaymentIntentId?: string;
    status: string;
  }): Promise<void> {
    try {
      await storage.createTransaction({
        userId: params.userId,
        amount: params.amount,
        currency: params.currency,
        paymentMethod: params.paymentMethod,
        externalId: params.stripePaymentIntentId || '',
        status: params.status,
        metadata: {
          platform: 'boyfanz',
          payment_processor: 'stripe'
        }
      });
    } catch (error) {
      console.error('Failed to create transaction record:', error);
      // Don't throw - payment succeeded, record failure is secondary
    }
  }
}

export const enhancedPaymentService = new EnhancedPaymentService();