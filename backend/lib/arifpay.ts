import { v4 as uuidv4 } from "uuid";

const ARIFPAY_API_KEY = process.env.ARIFPAY_API_KEY || "hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY";
const ARIFPAY_BASE_URL = process.env.ARIFPAY_BASE_URL || "https://gateway.arifpay.net";
const ARIFPAY_ACCOUNT_NUMBER = process.env.ARIFPAY_ACCOUNT_NUMBER || "01320811436100";

// Supported payment methods from Arifpay API documentation
const SUPPORTED_PAYMENT_METHODS = [
  "TELEBIRR", "AWAASH", "AWAASH_WALLET", "PSS", "CBE",
  "AMOLE", "BOA", "KACHA", "HELLOCASH", "MPESSA"
];

// API Key and Base URL initialization
console.log("[Arifpay] Initializing with account:", ARIFPAY_ACCOUNT_NUMBER);
console.log("[Arifpay] Base URL:", ARIFPAY_BASE_URL);

export interface ArifpayPaymentOptions {
  amount: number;
  phone: string;
  tier: string;
  userId: string;
  paymentMethod: string;
  cancelUrl: string;
  errorUrl: string;
  notifyUrl: string;
  successUrl: string;
}

export interface ArifpayPaymentResponse {
  sessionId: string;
  paymentUrl: string;
  status: string;
  totalAmount: number;
}

export interface ArifpayVerificationResponse {
  status: string;
  amount?: number;
  transactionId?: string;
  paidAt?: string;
}

export interface ArifpayCheckoutOptions {
  amount: number;
  currency: string;
  beneficiaries: any[];
  successUrl: string;
  cancelUrl: string;
  errorUrl: string;
  notifyUrl: string;
  phone?: string;
  email?: string;
}

export class ArifpayClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = ARIFPAY_API_KEY;
    this.baseUrl = ARIFPAY_BASE_URL;
    console.log("[Arifpay] Client initialized");
  }

  private parseJsonResponse<T>(responseText: string, context: string): T {
    const trimmed = responseText.trim();

    if (trimmed.startsWith("<")) {
      console.error(`[Arifpay] ${context} returned HTML response snippet:`, trimmed.slice(0, 200));
      throw new Error("Payment gateway returned an unexpected response. Please verify ArifPay credentials and network access.");
    }

    try {
      return JSON.parse(trimmed) as T;
    } catch (error) {
      console.error(`[Arifpay] Failed to parse ${context} response:`, error);
      throw new Error("Payment service sent an unreadable response. Please try again later.");
    }
  }

  private normalizePhone(phone: string): string {
    // Strictly follow: "Only 251... not +251 or 09"
    let normalized = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');

    if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }

    if (normalized.startsWith('0')) {
      normalized = '251' + normalized.substring(1);
    } else if (normalized.startsWith('251')) {
      // Correct format
    } else if (normalized.length === 9) {
      normalized = '251' + normalized;
    } else {
      // Fallback - prepend 251
      normalized = '251' + normalized;
    }

    // Ensure it's exactly 12 digits (251XXXXXXXXX)
    if (normalized.length !== 12) {
      console.warn(`[Arifpay] Phone normalization resulted in odd length: ${normalized}. Using fallback.`);
      return '251911111111';
    }

    return normalized;
  }

  private normalizePaymentMethod(method: string): string[] {
    // Map common names to Arifpay API format
    const methodMap: Record<string, string> = {
      'telebirr': 'TELEBIRR',
      'cbe': 'CBE',
      'awash': 'AWAASH',
      'awaash': 'AWAASH',
      'amole': 'AMOLE',
      'boa': 'BOA',
      'kacha': 'KACHA',
      'hellocash': 'HELLOCASH',
      'mpesa': 'MPESSA',
      'mpessa': 'MPESSA',
    };

    const normalized = methodMap[method.toLowerCase()] || method.toUpperCase();

    // Validate against supported methods
    if (SUPPORTED_PAYMENT_METHODS.includes(normalized)) {
      return [normalized];
    }

    // Default to showing all major payment options
    return ["TELEBIRR", "CBE", "AWAASH"];
  }

  async createPayment(
    options: ArifpayPaymentOptions
  ): Promise<ArifpayPaymentResponse> {
    if (!this.apiKey) {
      throw new Error("ArifPay API key not configured");
    }

    const phone = this.normalizePhone(options.phone);
    const email = options.phone.includes('@') ? options.phone : `${options.userId}@app.com`;
    const nonce = `${options.userId}-${uuidv4()}`;

    // Expire date in future (24 hours) - format: 2023-12-31T23:59:59Z
    const expireDate = new Date();
    expireDate.setHours(expireDate.getHours() + 24);
    const expireDateStr = expireDate.toISOString().replace('.000Z', 'Z');

    const totalAmount = options.amount;

    // Use the normalizePaymentMethod helper to get valid payment methods
    const paymentMethods = this.normalizePaymentMethod(options.paymentMethod || 'TELEBIRR');

    // Build payload exactly matching API documentation
    const payload = {
      cancelUrl: options.cancelUrl,
      phone: phone,
      email: email,
      nonce: nonce,
      successUrl: options.successUrl,
      errorUrl: options.errorUrl,
      notifyUrl: options.notifyUrl,
      paymentMethods: paymentMethods,
      expireDate: expireDateStr,
      items: [
        {
          name: `${options.tier.charAt(0).toUpperCase() + options.tier.slice(1)} Membership`,
          quantity: 1,
          price: totalAmount,
          description: `Premium ${options.tier} membership subscription`
        },
      ],
      beneficiaries: [
        {
          accountNumber: ARIFPAY_ACCOUNT_NUMBER,
          bank: "AWINETAA",
          amount: totalAmount
        },
      ],
      lang: "EN"
    };

    const methodName = paymentMethods[0] || 'TELEBIRR';
    console.log(`[Arifpay] Creating ${methodName} payment payload:`, JSON.stringify(payload, null, 2));

    try {
      const url = `${this.baseUrl}/api/checkout/session`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-arifpay-key": this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      const result = this.parseJsonResponse<Record<string, any>>(responseText, `${methodName} checkout`);

      if (!response.ok) {
        console.error(`[Arifpay] ${methodName} payment failed:`, response.status, result);
        throw new Error(result.msg || result.message || `Payment creation failed with status ${response.status}`);
      }

      if (result.error === false && result.data && result.data.paymentUrl) {
        return {
          sessionId: result.data.sessionId,
          paymentUrl: result.data.paymentUrl,
          status: "PENDING",
          totalAmount: result.data.totalAmount || options.amount,
        };
      } else {
        throw new Error(result.msg || "Payment creation failed - invalid response structure");
      }
    } catch (error) {
      console.error("[Arifpay] Payment Error:", error);
      throw error;
    }
  }

  // Compatibility method for credits
  async createCheckout(options: ArifpayCheckoutOptions): Promise<{ checkoutUrl: string; sessionId: string; transactionId: string }> {
    const phone = this.normalizePhone(options.phone || '251911111111');
    const nonce = uuidv4();
    const expireDate = new Date();
    expireDate.setHours(expireDate.getHours() + 24);
    const expireDateStr = expireDate.toISOString().split('.')[0];

    const payload = {
      phone: phone,
      email: options.email || "user@app.com",
      nonce: nonce,
      cancelUrl: options.cancelUrl,
      errorUrl: options.errorUrl,
      notifyUrl: options.notifyUrl,
      successUrl: options.successUrl,
      paymentMethods: ["CBE"], // Default to CBE
      expireDate: expireDateStr,
      items: [
        {
          name: "In-App Credits",
          quantity: 1,
          price: options.amount,
          image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300"
        }
      ],
      beneficiaries: options.beneficiaries || [
        {
          accountNumber: ARIFPAY_ACCOUNT_NUMBER,
          bank: "AWINETAA",
          amount: options.amount,
        },
      ],
      lang: "EN"
    };

    const url = `${this.baseUrl}/api/checkout/session`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-arifpay-key": this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    const result = this.parseJsonResponse<Record<string, any>>(responseText, "Credits checkout");

    if (!response.ok || result.error) {
      throw new Error(result.msg || "Checkout creation failed");
    }

    return {
      checkoutUrl: result.data.paymentUrl,
      sessionId: result.data.sessionId,
      transactionId: result.data.transactionId || nonce
    };
  }

  async verifyPayment(sessionId: string): Promise<ArifpayVerificationResponse> {
    if (!this.apiKey) {
      throw new Error("ArifPay API key not configured");
    }

    console.log("[Arifpay] Verifying payment for session:", sessionId);

    try {
      const url = `${this.baseUrl}/api/ms/transaction/status/${sessionId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "x-arifpay-key": this.apiKey,
        },
      });

      const responseText = await response.text();
      const result = this.parseJsonResponse<Record<string, any>>(responseText, "Verification");

      console.log("[Arifpay] Verification parsed response:", JSON.stringify(result, null, 2));

      if (!response.ok) {
        return { status: "FAILED" };
      }

      if (result.data) {
        return {
          status: result.data.status || "UNKNOWN",
          amount: result.data.totalAmount,
          transactionId: result.data.transactionId,
          paidAt: result.data.paidAt,
        };
      }

      return { status: "UNKNOWN" };
    } catch (error) {
      console.error("[Arifpay] Verification error:", error);
      return { status: "FAILED" };
    }
  }
}

export const arifpay = new ArifpayClient();
