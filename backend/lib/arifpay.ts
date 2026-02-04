import { v4 as uuidv4 } from "uuid";

const ARIFPAY_API_KEY = process.env.ARIFPAY_API_KEY;
const ARIFPAY_BASE_URL = process.env.ARIFPAY_BASE_URL || "https://gateway.arifpay.net";
const ARIFPAY_ACCOUNT_NUMBER = process.env.ARIFPAY_ACCOUNT_NUMBER;

if (!ARIFPAY_API_KEY) {
  console.error("[Arifpay] CRITICAL: ARIFPAY_API_KEY environment variable is not set!");
}
if (!ARIFPAY_ACCOUNT_NUMBER) {
  console.error("[Arifpay] CRITICAL: ARIFPAY_ACCOUNT_NUMBER environment variable is not set!");
}

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

    if (!this.apiKey) {
      console.warn("[Arifpay] API key not configured");
    } else {
      console.log("[Arifpay] Client initialized with API key:", this.apiKey.substring(0, 10) + "...");
      console.log("[Arifpay] Base URL:", this.baseUrl);
      console.log("[Arifpay] Account Number:", ARIFPAY_ACCOUNT_NUMBER);
    }
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

  async createPayment(
    options: ArifpayPaymentOptions
  ): Promise<ArifpayPaymentResponse> {
    if (!this.apiKey) {
      throw new Error("ArifPay API key not configured");
    }

    // Normalize phone number to ArifPay format (251XXXXXXXXX)
    let phone = options.phone;
    let email = options.phone;
    let isEmail = phone.includes('@');
    
    // Normalize phone if it's not an email
    if (!isEmail) {
      // Remove all non-numeric characters
      phone = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
      
      // Convert to 251 format (MUST be 251, not +251)
      if (phone.startsWith('0')) {
        phone = '251' + phone.substring(1);
      } else if (phone.startsWith('+251')) {
        phone = phone.substring(1);
      } else if (phone.startsWith('251')) {
        // Already correct format
      } else if (phone.length === 9) {
        // Ethiopian number without prefix
        phone = '251' + phone;
      } else {
        // Assume it needs 251 prefix
        phone = '251' + phone;
      }
      
      // Create a default email if we have phone
      email = `${options.userId}@app.com`;
    } else {
      // If email provided, use test phone for CBE
      email = phone;
      phone = '251911111111'; // Test phone as per documentation
    }

    // Validate phone format (must be 251XXXXXXXXX, 12 digits total)
    if (phone.length < 12) {
      console.warn(`[Arifpay] Phone number too short: ${phone}. Using test number.`);
      phone = '251911111111';
    }

    console.log('[Arifpay] Processing payment');
    console.log('[Arifpay] Phone (normalized):', phone);
    console.log('[Arifpay] Email:', email);
    console.log('[Arifpay] Payment method:', options.paymentMethod);
    
    const nonce = `${options.userId}-${uuidv4()}`;
    const expireDate = new Date();
    expireDate.setHours(expireDate.getHours() + 24);
    const expireDateStr = expireDate.toISOString().split('.')[0];

    const totalAmount = options.amount;
    
    // CBE Direct Integration
    if (options.paymentMethod === 'CBE') {
      console.log('[Arifpay] Using CBE Direct Payment (V2)');
      
      // CBE Direct Payment Payload - Strictly following ArifPay documentation
      const payload = {
        phone: phone,
        email: email,
        nonce: nonce,
        cancelUrl: options.cancelUrl,
        errorUrl: options.errorUrl,
        notifyUrl: options.notifyUrl,
        successUrl: options.successUrl,
        paymentMethods: ['CBE'],
        expireDate: expireDateStr,
        items: [
          {
            name: `${options.tier.charAt(0).toUpperCase() + options.tier.slice(1)} Membership`,
            quantity: 1,
            price: totalAmount,
            description: `Premium ${options.tier} membership subscription`,
            image: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300"
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

      console.log("[Arifpay] Creating CBE direct payment with payload:", JSON.stringify(payload, null, 2));

      try {
        const url = `${this.baseUrl}/api/checkout/v2/cbe/direct/transfer`;
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-arifpay-key": this.apiKey,
          },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log("[Arifpay] CBE Response status:", response.status);

        const result = this.parseJsonResponse<Record<string, any>>(responseText, "CBE checkout");

        console.log("[Arifpay] CBE Parsed response:", JSON.stringify(result, null, 2));

        if (!response.ok) {
           console.error('[Arifpay] CBE Payment failed with status:', response.status);
           console.error('[Arifpay] Error response:', result);
           
           // Handle specific errors
           if (result.msg) {
             if (result.msg.includes("Phone") || result.msg.includes("phone")) {
               throw new Error("Invalid phone number format. Must be 251XXXXXXXXX.");
             }
             if (result.msg.includes("nonce")) {
               throw new Error("Payment session error. Please try again.");
             }
             throw new Error(result.msg);
           }
           
           throw new Error(result.message || `Payment failed with status ${response.status}`);
        }

        // Success response validation
        if (result.error === false && result.data && result.data.paymentUrl) {
          console.log('[Arifpay] CBE Payment created successfully');
          console.log('[Arifpay] Session ID:', result.data.sessionId);
          console.log('[Arifpay] Payment URL:', result.data.paymentUrl);
          
          return {
            sessionId: result.data.sessionId,
            paymentUrl: result.data.paymentUrl,
            status: "PENDING",
            totalAmount: result.data.totalAmount || options.amount,
          };
        } else {
          console.error('[Arifpay] Invalid response structure:', result);
          throw new Error(result.msg || "Payment creation failed - invalid response format");
        }
      } catch (error) {
        console.error("[Arifpay] CBE Payment error:", error);
        throw error;
      }
    }

    // Generic Checkout (TeleBirr, etc)
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

    // Generic checkout payload for other payment methods
    const payload = {
      phone: phone,
      email: email,
      nonce: nonce,
      cancelUrl: options.cancelUrl,
      errorUrl: options.errorUrl,
      notifyUrl: options.notifyUrl,
      successUrl: options.successUrl,
      paymentMethods: [selectedMethod],
      expireDate: expireDateStr,
      items: [
        {
          name: `${options.tier.charAt(0).toUpperCase() + options.tier.slice(1)} Membership`,
          quantity: 1,
          price: totalAmount,
          description: `Premium ${options.tier} membership subscription`,
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
      lang: "EN"
    };

    console.log("[Arifpay] Creating checkout session with payload:", JSON.stringify(payload, null, 2));

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
      console.log("[Arifpay] Raw response:", responseText);

      const result = this.parseJsonResponse<Record<string, any>>(responseText, "Checkout session");

      if (!response.ok) {
        throw new Error(result.msg || result.message || `Payment creation failed: ${response.status}`);
      }

      if (!result.error && result.data && result.data.paymentUrl) {
        return {
          sessionId: result.data.sessionId,
          paymentUrl: result.data.paymentUrl,
          status: result.data.status || "PENDING",
          totalAmount: result.data.totalAmount || options.amount,
        };
      } else {
        throw new Error(result.msg || "Payment creation failed - invalid response");
      }
    } catch (error) {
      console.error("[Arifpay] Payment error:", error);
      throw error;
    }
  }

  // Added createCheckout for compatibility with buy/route.ts
  async createCheckout(options: ArifpayCheckoutOptions): Promise<{ checkoutUrl: string; sessionId: string; transactionId: string }> {
      // Logic to map generic checkout options to createPayment or similar
      // Since createPayment is tailored for membership, we'll create a generic session here
      // reusing similar logic but adapted for generic items/credits
      
      const nonce = `${uuidv4()}`; 
      const expireDate = new Date();
      expireDate.setHours(expireDate.getHours() + 24);
      const expireDateStr = expireDate.toISOString().split('.')[0];
      
      let phone = options.phone || '251900000000'; // Default if missing for credits
      
      const payload = {
        cancelUrl: options.cancelUrl,
        phone: phone,
        email: options.email || "user@app.com",
        nonce: nonce,
        errorUrl: options.errorUrl,
        notifyUrl: options.notifyUrl,
        successUrl: options.successUrl,
        expireDate: expireDateStr,
        paymentMethods: ["TELEBIRR", "CBE", "AMOLE"], // Allow all for generic checkout
        lang: "EN",
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
      const result = this.parseJsonResponse<Record<string, any>>(responseText, "Generic checkout session");
      
      if (!response.ok || result.error) {
          throw new Error(result.msg || "Checkout creation failed");
      }
      
      return {
          checkoutUrl: result.data.paymentUrl,
          sessionId: result.data.sessionId,
          transactionId: result.data.transactionId || nonce // Fallback
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
