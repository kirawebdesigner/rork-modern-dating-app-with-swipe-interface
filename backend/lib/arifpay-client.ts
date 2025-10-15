import { v4 as uuidv4 } from 'uuid';
import { ARIFPAY_CONFIG } from './arifpay-config';

export interface ArifpayCheckoutSession {
  sessionId: string;
  checkoutUrl: string;
  amount: number;
  currency: string;
  orderId: string;
}

export interface ArifpayPaymentVerification {
  success: boolean;
  sessionId: string;
  orderId: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  amount?: number;
  currency?: string;
  transactionId?: string;
  paidAt?: string;
}

export class ArifpayClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = ARIFPAY_CONFIG.sandboxMode
      ? 'https://gateway.arifpay.net/sandbox'
      : 'https://gateway.arifpay.net';
    this.apiKey = ARIFPAY_CONFIG.apiKey;
  }

  async createCheckoutSession(params: {
    userId: string;
    amount: number;
    currency: string;
    description: string;
    metadata?: Record<string, any>;
    successUrl: string;
    cancelUrl: string;
  }): Promise<ArifpayCheckoutSession> {
    const orderId = `ORDER-${uuidv4()}`;
    
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/checkout/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'x-arifpay-key': this.apiKey,
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency,
          orderId,
          userId: params.userId,
          description: params.description,
          metadata: params.metadata || {},
          successUrl: params.successUrl,
          cancelUrl: params.cancelUrl,
          packageName: ARIFPAY_CONFIG.packageName,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Arifpay] Checkout session creation failed:', errorText);
        throw new Error(`Failed to create checkout session: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        sessionId: data.sessionId || data.id,
        checkoutUrl: data.checkoutUrl || data.url,
        amount: params.amount,
        currency: params.currency,
        orderId,
      };
    } catch (error) {
      console.error('[Arifpay] Error creating checkout session:', error);
      throw error;
    }
  }

  async verifyPayment(sessionId: string): Promise<ArifpayPaymentVerification> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/checkout/session/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'x-arifpay-key': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Arifpay] Payment verification failed:', errorText);
        return {
          success: false,
          sessionId,
          orderId: '',
          status: 'failed',
        };
      }

      const data = await response.json();

      const status = data.status?.toLowerCase() || 'pending';
      const isCompleted = status === 'completed' || status === 'paid' || status === 'success';

      return {
        success: isCompleted,
        sessionId,
        orderId: data.orderId || '',
        status: isCompleted ? 'completed' : (status as any),
        amount: data.amount,
        currency: data.currency,
        transactionId: data.transactionId || data.txRef,
        paidAt: data.paidAt || data.completedAt,
      };
    } catch (error) {
      console.error('[Arifpay] Error verifying payment:', error);
      return {
        success: false,
        sessionId,
        orderId: '',
        status: 'failed',
      };
    }
  }
}

export const arifpayClient = new ArifpayClient();
