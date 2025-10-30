import { createClient } from "@supabase/supabase-js";

const ARIFPAY_API_KEY = process.env.ARIFPAY_API_KEY || "";
const ARIFPAY_BASE_URL = "https://gateway.arifpay.net/api";

export interface ArifpayCheckoutOptions {
  amount: number;
  currency?: string;
  beneficiaries: Array<{
    accountNumber: string;
    bank: string;
    amount: number;
  }>;
  cancelUrl: string;
  errorUrl: string;
  notifyUrl: string;
  successUrl: string;
  merchantId?: string;
}

export interface ArifpayCheckoutResponse {
  sessionId: string;
  checkoutUrl: string;
  transactionId: string;
}

export interface ArifpayVerifyResponse {
  transactionId: string;
  status: "PAID" | "PENDING" | "FAILED" | "CANCELLED";
  amount: number;
  currency: string;
  paymentMethod: string;
  paidAt?: string;
}

export class ArifpayClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || ARIFPAY_API_KEY;
    this.baseUrl = ARIFPAY_BASE_URL;

    if (!this.apiKey) {
      console.warn("[Arifpay] API key not configured");
    }
  }

  async createCheckout(
    options: ArifpayCheckoutOptions
  ): Promise<ArifpayCheckoutResponse> {
    const payload = {
      ...options,
      currency: options.currency || "ETB",
    };

    console.log("[Arifpay] Creating checkout:", payload);

    const response = await fetch(`${this.baseUrl}/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Arifpay] Checkout creation failed:", error);
      throw new Error(`Arifpay checkout failed: ${error}`);
    }

    const data = await response.json();
    console.log("[Arifpay] Checkout created:", data);

    return {
      sessionId: data.sessionId || data.session_id,
      checkoutUrl: data.checkoutUrl || data.checkout_url,
      transactionId: data.transactionId || data.transaction_id,
    };
  }

  async verifyPayment(sessionId: string): Promise<ArifpayVerifyResponse> {
    console.log("[Arifpay] Verifying payment:", sessionId);

    const response = await fetch(
      `${this.baseUrl}/checkout/verify/${sessionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[Arifpay] Payment verification failed:", error);
      throw new Error(`Arifpay verification failed: ${error}`);
    }

    const data = await response.json();
    console.log("[Arifpay] Payment verified:", data);

    return {
      transactionId: data.transactionId || data.transaction_id,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      paymentMethod: data.paymentMethod || data.payment_method,
      paidAt: data.paidAt || data.paid_at,
    };
  }

  async cancelCheckout(sessionId: string): Promise<void> {
    console.log("[Arifpay] Cancelling checkout:", sessionId);

    const response = await fetch(
      `${this.baseUrl}/checkout/cancel/${sessionId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[Arifpay] Checkout cancellation failed:", error);
      throw new Error(`Arifpay cancellation failed: ${error}`);
    }

    console.log("[Arifpay] Checkout cancelled");
  }
}

export const arifpay = new ArifpayClient();
