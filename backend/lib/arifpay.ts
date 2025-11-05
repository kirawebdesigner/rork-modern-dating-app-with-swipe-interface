import { v4 as uuidv4 } from "uuid";

const ARIFPAY_API_KEY = process.env.ARIFPAY_API_KEY || "hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY";
const ARIFPAY_BASE_URL = process.env.ARIFPAY_BASE_URL || "https://gateway.arifpay.org/api/sandbox";
const ARIFPAY_ACCOUNT_NUMBER = process.env.ARIFPAY_ACCOUNT_NUMBER || "01320811436100";

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

export class ArifpayClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = ARIFPAY_API_KEY;
    this.baseUrl = ARIFPAY_BASE_URL;

    if (!this.apiKey) {
      console.warn("[Arifpay] API key not configured");
    } else {
      console.log("[Arifpay] Client initialized with API key:", this.apiKey.substring(0, 10) + "...");
      console.log("[Arifpay] Base URL:", this.baseUrl);
      console.log("[Arifpay] Account Number:", ARIFPAY_ACCOUNT_NUMBER);
    }
  }

  async createPayment(
    options: ArifpayPaymentOptions
  ): Promise<ArifpayPaymentResponse> {
    if (!this.apiKey) {
      throw new Error("ArifPay API key not configured");
    }

    let phone = options.phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) {
      phone = '251' + phone.substring(1);
    } else if (!phone.startsWith('251')) {
      phone = '251' + phone;
    }
    
    console.log('[Arifpay] Normalized phone number:', phone);
    console.log('[Arifpay] Payment method:', options.paymentMethod);
    
    const nonce = `${options.userId}-${uuidv4()}`;
    const expireDate = new Date();
    expireDate.setHours(expireDate.getHours() + 24);
    const expireDateStr = expireDate.toISOString().split('.')[0];

    const totalAmount = options.amount;
    
    if (options.paymentMethod === 'CBE') {
      console.log('[Arifpay] Using CBE Direct Payment (V2)');
      
      const payload = {
        cancelUrl: options.cancelUrl,
        phone: phone,
        email: `${options.userId}@app.com`,
        nonce: nonce,
        errorUrl: options.errorUrl,
        notifyUrl: options.notifyUrl,
        successUrl: options.successUrl,
        expireDate: expireDateStr,
        paymentMethods: ['CBE'],
        lang: "EN",
        items: [
          {
            name: `Dating App - ${options.tier.toUpperCase()} Membership`,
            description: `Premium ${options.tier} membership subscription`,
            quantity: 1,
            price: totalAmount,
            image: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300"
          },
        ],
        beneficiaries: [
          {
            accountNumber: ARIFPAY_ACCOUNT_NUMBER,
            bank: "AWINETAA",
            amount: totalAmount,
          },
        ],
      };

      console.log("[Arifpay] Creating CBE direct payment with payload:", JSON.stringify(payload, null, 2));

      try {
        const response = await fetch(`${this.baseUrl}/checkout/v2/cbe/direct/transfer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-arifpay-key": this.apiKey,
          },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log("[Arifpay] CBE Raw response:", responseText);

        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error("[Arifpay] Failed to parse CBE response:", e);
          throw new Error(`Invalid response from ArifPay: ${responseText.substring(0, 200)}`);
        }

        console.log("[Arifpay] CBE Parsed response:", JSON.stringify(result, null, 2));

        if (!response.ok) {
          console.error("[Arifpay] CBE payment creation failed with status:", response.status);
          throw new Error(result.msg || result.message || `CBE payment creation failed with status ${response.status}`);
        }

        if (!result.error && result.data && result.data.paymentUrl) {
          return {
            sessionId: result.data.sessionId,
            paymentUrl: result.data.paymentUrl,
            status: result.data.status || "PENDING",
            totalAmount: result.data.totalAmount || options.amount,
          };
        } else {
          console.error("[Arifpay] Invalid CBE response structure:", result);
          throw new Error(result.msg || "CBE payment creation failed - invalid response");
        }
      } catch (error) {
        console.error("[Arifpay] CBE Payment error:", error);
        throw error;
      }
    }

    const paymentMethodsMap: Record<string, string> = {
      'TELEBIRR': 'TELEBIRR',
      'CBE': 'CBE',
      'AMOLE': 'AMOLE',
      'MPESSA': 'MPESSA',
      'AWAASH': 'AWAASH',
      'AWAASH_WALLET': 'AWAASH_WALLET',
      'PSS': 'PSS',
      'BOA': 'BOA',
      'KACHA': 'KACHA',
      'HELLOCASH': 'HELLOCASH',
    };

    const selectedMethod = paymentMethodsMap[options.paymentMethod] || 'TELEBIRR';

    const payload = {
      cancelUrl: options.cancelUrl,
      phone: phone,
      email: `${options.userId}@app.com`,
      nonce: nonce,
      errorUrl: options.errorUrl,
      notifyUrl: options.notifyUrl,
      successUrl: options.successUrl,
      expireDate: expireDateStr,
      paymentMethods: [selectedMethod],
      lang: "EN",
      items: [
        {
          name: `Dating App - ${options.tier.toUpperCase()} Membership`,
          description: `Premium ${options.tier} membership subscription`,
          quantity: 1,
          price: totalAmount,
          image: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300"
        },
      ],
      beneficiaries: [
        {
          accountNumber: ARIFPAY_ACCOUNT_NUMBER,
          bank: "AWINETAA",
          amount: totalAmount,
        },
      ],
    };

    console.log("[Arifpay] Creating checkout session with payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${this.baseUrl}/checkout/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-arifpay-key": this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log("[Arifpay] Raw response:", responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error("[Arifpay] Failed to parse response:", e);
        throw new Error(`Invalid response from ArifPay: ${responseText.substring(0, 200)}`);
      }

      console.log("[Arifpay] Parsed response:", JSON.stringify(result, null, 2));

      if (!response.ok) {
        console.error("[Arifpay] Payment creation failed with status:", response.status);
        throw new Error(result.msg || result.message || `Payment creation failed with status ${response.status}`);
      }

      if (!result.error && result.data && result.data.paymentUrl) {
        return {
          sessionId: result.data.sessionId,
          paymentUrl: result.data.paymentUrl,
          status: result.data.status || "PENDING",
          totalAmount: result.data.totalAmount || options.amount,
        };
      } else {
        console.error("[Arifpay] Invalid response structure:", result);
        throw new Error(result.msg || "Payment creation failed - invalid response");
      }
    } catch (error) {
      console.error("[Arifpay] Payment error:", error);
      throw error;
    }
  }

  async verifyPayment(sessionId: string): Promise<ArifpayVerificationResponse> {
    if (!this.apiKey) {
      throw new Error("ArifPay API key not configured");
    }

    console.log("[Arifpay] Verifying payment for session:", sessionId);

    try {
      const response = await fetch(`${this.baseUrl}/ms/transaction/status/${sessionId}`, {
        method: "GET",
        headers: {
          "x-arifpay-key": this.apiKey,
        },
      });

      const responseText = await response.text();
      console.log("[Arifpay] Verification raw response:", responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error("[Arifpay] Failed to parse verification response:", e);
        throw new Error(`Invalid verification response: ${responseText.substring(0, 200)}`);
      }

      console.log("[Arifpay] Verification parsed response:", JSON.stringify(result, null, 2));

      if (!response.ok) {
        console.error("[Arifpay] Verification failed with status:", response.status);
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
