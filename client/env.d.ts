/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID: string;
  readonly VITE_APPLE_PAY_MERCHANT_ID: string;
  readonly VITE_APPLE_PAY_DISPLAY_NAME: string;
  readonly VITE_GOOGLE_PAY_MERCHANT_ID: string;
  readonly VITE_STRIPE_MERCHANT_ID: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;
  readonly VITE_COINBASE_COMMERCE_API_KEY: string;
  readonly VITE_BITPAY_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Apple Pay API declarations
declare global {
  interface Window {
    ApplePaySession?: {
      new (version: number, paymentRequest: any): ApplePaySession;
      canMakePayments(): boolean;
      STATUS_SUCCESS: number;
      STATUS_FAILURE: number;
    };
    google?: {
      payments?: {
        api?: {
          PaymentsClient: {
            new (config: any): any;
          };
        };
      };
    };
  }

  interface ApplePaySession {
    begin(): void;
    abort(): void;
    completeMerchantValidation(merchantSession: any): void;
    completePayment(status: number): void;
    onvalidatemerchant: (event: any) => void;
    onpaymentauthorized: (event: any) => void;
    oncancel: () => void;
  }
}