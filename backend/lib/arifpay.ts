import { v4 as uuidv4 } from "uuid";

const ARIFPAY_API_KEY = process.env.ARIFPAY_API_KEY || "hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY";
const ARIFPAY_BASE_URL = process.env.ARIFPAY_BASE_URL || "https://gateway.arifpay.net";
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

    // Handle Phone / Email logic
    let phone = options.phone;
    let isEmail = phone.includes('@');
    
    // Normalize phone if it's not an email
    if (!isEmail) {
      phone = phone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
      if (phone.length > 0) {
        if (phone.startsWith('0')) {
          phone = '251' + phone.substring(1);
        } else if (!phone.startsWith('251')) {
          phone = '251' + phone;
        }
      }
    }

    // Validation for Payment Methods that REQUIRE phone
    if ((options.paymentMethod === 'TELEBIRR' || options.paymentMethod === 'AMOLE' || options.paymentMethod === 'MPESSA') && (isEmail || phone.length < 10)) {
       console.warn(`[Arifpay] Warning: ${options.paymentMethod} usually requires a valid phone number. Current input: ${options.phone}`);
       // We'll try to proceed, but it might fail at ArifPay level.
       // Ideally we should throw, but let's try to be permissive if they have a flow we don't know.
    }

    // Fallback for CBE/Other if phone is missing/email
    if ((isEmail || !phone) && options.paymentMethod === 'CBE') {
        // Use a dummy phone for CBE direct if we only have email, 
        // as CBE page usually lets user enter details or login.
        // But ArifPay API might validate it.
        // Let's use a dummy that passes regex but clearly isn't real if valid phone is missing.
        if (isEmail || !phone) {
             console.log('[Arifpay] No valid phone provided for CBE, using placeholder.');
             phone = "251900000000"; 
        }
    }

    console.log('[Arifpay] Processing payment with Phone:', phone);
    console.log('[Arifpay] Payment method:', options.paymentMethod);
    
    const nonce = `${options.userId}-${uuidv4()}`;
    const expireDate = new Date();
    expireDate.setHours(expireDate.getHours() + 24);
    const expireDateStr = expireDate.toISOString().split('.')[0];

    const totalAmount = options.amount;
    
    // CBE Direct Integration
    if (options.paymentMethod === 'CBE') {
      console.log('[Arifpay] Using CBE Direct Payment (V2)');
      
      const payload = {
        cancelUrl: options.cancelUrl,
        phone: phone, 
        email: isEmail ? options.phone : `${options.userId}@app.com`,
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
            beneficiaryId: "BEN-001"
          },
        ],
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
           // Handle specific error for invalid phone
           if (result.msg && result.msg.includes("Phone")) {
               throw new Error("Invalid phone number. Please update your profile with a valid phone number.");
           }
           throw new Error(result.msg || result.message || `CBE payment creation failed: ${response.status}`);
        }

        if (!result.error && result.data && result.data.paymentUrl) {
          return {
            sessionId: result.data.sessionId,
            paymentUrl: result.data.paymentUrl,
            status: result.data.status || "PENDING",
            totalAmount: result.data.totalAmount || options.amount,
          };
        } else {
          throw new Error(result.msg || "CBE payment creation failed - invalid response");
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

    const payload = {
      cancelUrl: options.cancelUrl,
      phone: phone,
      email: isEmail ? options.phone : `${options.userId}@app.com`,
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
