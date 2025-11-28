import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';

interface ApplePayButtonProps {
  amount: number;
  currency?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  className?: string;
  disabled?: boolean;
}

export default function ApplePayButton({
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  className = '',
  disabled = false
}: ApplePayButtonProps) {
  const [isApplePaySupported, setIsApplePaySupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if Apple Pay is supported
    if (window.ApplePaySession) {
      const merchantIdentifier = import.meta.env.VITE_APPLE_PAY_MERCHANT_ID;
      if (merchantIdentifier && ApplePaySession.canMakePayments()) {
        setIsApplePaySupported(true);
      }
    }
  }, []);

  const handleApplePayClick = async () => {
    if (!isApplePaySupported || isLoading || disabled) return;

    setIsLoading(true);
    trackEvent('apple_pay_initiated', 'payment', 'apple_pay_button');

    try {
      const merchantIdentifier = import.meta.env.VITE_APPLE_PAY_MERCHANT_ID;
      const displayName = import.meta.env.VITE_APPLE_PAY_DISPLAY_NAME || 'BoyFanz';
      
      if (!merchantIdentifier) {
        throw new Error('Apple Pay merchant identifier not configured');
      }

      // Create payment request
      const paymentRequest = {
        countryCode: 'US',
        currencyCode: currency,
        supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
        merchantCapabilities: ['supports3DS'],
        total: {
          label: displayName,
          amount: (amount / 100).toFixed(2),
          type: 'final'
        }
      };

      const session = new ApplePaySession(3, paymentRequest);

      session.onvalidatemerchant = async (event) => {
        try {
          // Validate merchant with your backend
          const response = await fetch('/api/payments/apple-pay/validate-merchant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              validationURL: event.validationURL,
              domainName: window.location.hostname
            })
          });

          if (!response.ok) {
            throw new Error('Merchant validation failed');
          }

          const merchantSession = await response.json();
          session.completeMerchantValidation(merchantSession);
        } catch (error) {
          console.error('Apple Pay merchant validation failed:', error);
          session.abort();
          onError?.(error);
        }
      };

      session.onpaymentauthorized = async (event) => {
        try {
          // Process payment with your backend
          const response = await fetch('/api/payments/apple-pay/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentToken: event.payment.token,
              amount: amount,
              currency: currency
            })
          });

          const result = await response.json();

          if (result.success) {
            session.completePayment(ApplePaySession.STATUS_SUCCESS);
            trackEvent('apple_pay_success', 'payment', 'apple_pay_completion');
            onSuccess?.(result);
            toast({
              title: 'Payment Successful',
              description: 'Your Apple Pay payment was processed successfully'
            });
          } else {
            session.completePayment(ApplePaySession.STATUS_FAILURE);
            throw new Error(result.error || 'Payment processing failed');
          }
        } catch (error) {
          console.error('Apple Pay payment processing failed:', error);
          session.completePayment(ApplePaySession.STATUS_FAILURE);
          onError?.(error);
          toast({
            title: 'Payment Failed',
            description: 'Your Apple Pay payment could not be processed',
            variant: 'destructive'
          });
        }
      };

      session.oncancel = () => {
        trackEvent('apple_pay_cancelled', 'payment', 'apple_pay_cancellation');
        setIsLoading(false);
      };

      session.begin();
    } catch (error) {
      console.error('Apple Pay initialization failed:', error);
      onError?.(error);
      setIsLoading(false);
      toast({
        title: 'Apple Pay Error',
        description: 'Could not initialize Apple Pay',
        variant: 'destructive'
      });
    }
  };

  if (!isApplePaySupported) {
    return null; // Don't render if Apple Pay is not supported
  }

  return (
    <Button
      onClick={handleApplePayClick}
      disabled={disabled || isLoading}
      className={`bg-black text-white hover:bg-gray-800 border border-gray-300 rounded-lg px-4 py-2 font-medium ${className}`}
      data-testid="button-apple-pay"
    >
      <div className="flex items-center space-x-2">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
        <span>{isLoading ? 'Processing...' : 'Pay'}</span>
      </div>
    </Button>
  );
}