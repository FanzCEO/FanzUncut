// Google Pay API type definitions
declare namespace google {
  namespace payments {
    namespace api {
      interface PaymentsClient {
        isReadyToPay(request: any): Promise<{ result: boolean }>;
        loadPaymentData(request: any): Promise<any>;
      }
      const PaymentsClient: {
        new (config: {
          environment: 'TEST' | 'PRODUCTION';
          merchantInfo?: {
            merchantId?: string;
            merchantName?: string;
          };
        }): PaymentsClient;
      };
    }
  }
}

interface Window {
  google?: typeof google;
}
