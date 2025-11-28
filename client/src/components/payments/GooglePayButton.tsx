import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';

interface GooglePayButtonProps {
  amount: number;
  currency?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  className?: string;
  disabled?: boolean;
}

export default function GooglePayButton({
  amount,
  currency = 'USD',
  onSuccess,
  onError,
  className = '',
  disabled = false
}: GooglePayButtonProps) {
  const [isGooglePayReady, setIsGooglePayReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentsClient, setPaymentsClient] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initGooglePay = async () => {
      if (!window.google?.payments?.api) {
        // Load Google Pay API
        const script = document.createElement('script');
        script.src = 'https://pay.google.com/gp/p/js/pay.js';
        script.onload = () => checkGooglePayReadiness();
        document.head.appendChild(script);
      } else {
        checkGooglePayReadiness();
      }
    };

    const checkGooglePayReadiness = async () => {
      const googlePaymentsMerchantId = import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID;
      
      if (!googlePaymentsMerchantId) {
        console.warn('Google Pay merchant ID not configured');
        return;
      }

      const paymentsClient = new google.payments.api.PaymentsClient({
        environment: import.meta.env.PROD ? 'PRODUCTION' : 'TEST',
        merchantInfo: {
          merchantId: googlePaymentsMerchantId,
          merchantName: 'BoyFanz'
        }
      });

      const isReadyToPayRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'ccbill',
              gatewayMerchantId: import.meta.env.VITE_CCBILL_MERCHANT_ID || ''
            }
          }
        }]
      };

      try {
        const response = await paymentsClient.isReadyToPay(isReadyToPayRequest);
        if (response.result) {
          setIsGooglePayReady(true);
          setPaymentsClient(paymentsClient);
        }
      } catch (error) {
        console.error('Google Pay readiness check failed:', error);
      }
    };

    initGooglePay();
  }, []);

  const handleGooglePayClick = async () => {
    if (!isGooglePayReady || !paymentsClient || isLoading || disabled) return;

    setIsLoading(true);
    trackEvent('google_pay_initiated', 'payment', 'google_pay_button');

    try {
      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'ccbill',
              gatewayMerchantId: import.meta.env.VITE_CCBILL_MERCHANT_ID || ''
            }
          }
        }],
        merchantInfo: {
          merchantId: import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID,
          merchantName: 'BoyFanz'
        },
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: (amount / 100).toFixed(2),
          currencyCode: currency,
          countryCode: 'US'
        },
        shippingAddressRequired: false,
        emailRequired: true
      };

      const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);

      // Process payment with backend
      const response = await fetch('/api/payments/google-pay/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodData: paymentData.paymentMethodData,
          amount: amount,
          currency: currency
        })
      });

      const result = await response.json();

      if (result.success) {
        trackEvent('google_pay_success', 'payment', 'google_pay_completion');
        onSuccess?.(result);
        toast({
          title: 'Payment Successful',
          description: 'Your Google Pay payment was processed successfully'
        });
      } else {
        throw new Error(result.error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Google Pay payment failed:', error);
      trackEvent('google_pay_failed', 'payment', 'google_pay_error');
      onError?.(error);
      toast({
        title: 'Payment Failed',
        description: 'Your Google Pay payment could not be processed',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isGooglePayReady) {
    return null; // Don't render if Google Pay is not ready
  }

  return (
    <Button
      onClick={handleGooglePayClick}
      disabled={disabled || isLoading}
      className={`bg-black text-white hover:bg-gray-800 border border-gray-300 rounded-lg px-4 py-2 font-medium ${className}`}
      data-testid="button-google-pay"
    >
      <div className="flex items-center space-x-2">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>{isLoading ? 'Processing...' : 'Pay'}</span>
      </div>
    </Button>
  );
}