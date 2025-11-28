// Apple Pay TypeScript Declarations
declare global {
  interface Window {
    ApplePaySession?: typeof ApplePaySession;
    google?: {
      payments?: {
        api?: {
          PaymentsClient: new (config: any) => any;
        };
      };
    };
  }

  class ApplePaySession {
    static readonly STATUS_SUCCESS: number;
    static readonly STATUS_FAILURE: number;
    
    static canMakePayments(): boolean;
    
    constructor(version: number, paymentRequest: any);
    
    begin(): void;
    abort(): void;
    completeMerchantValidation(merchantSession: any): void;
    completePayment(status: number): void;
    
    onvalidatemerchant: ((event: any) => void) | null;
    onpaymentauthorized: ((event: any) => void) | null;
    oncancel: (() => void) | null;
  }
}

// Google Pay TypeScript Declarations
declare namespace google {
  namespace payments {
    namespace api {
      class PaymentsClient {
        constructor(config: {
          environment: 'TEST' | 'PRODUCTION';
          merchantInfo: {
            merchantId: string;
            merchantName: string;
          };
        });

        isReadyToPay(request: any): Promise<{ result: boolean }>;
        loadPaymentData(request: any): Promise<any>;
      }
    }
  }
}

export {};