const Arifpay = require("arifpay-express-plugin");
import { v4 as uuidv4 } from "uuid";

const ARIFPAY_API_KEY = process.env.ARIFPAY_API_KEY || "";
const ARIFPAY_SESSION_EXPIRY = process.env.ARIFPAY_SESSION_EXPIRY || "2026-10-30T15:00:58";

export interface ArifpayPaymentOptions {
  amount: number;
  phone: string;
  tier: string;
  userId: string;
  cancelUrl: string;
  errorUrl: string;
  notifyUrl: string;
  successUrl: string;
}

export interface ArifpayPaymentResponse {
  sessionId: string;
  paymentUrl: string;
  status: string;
}

export class ArifpayClient {
  private client: any;

  constructor() {
    if (!ARIFPAY_API_KEY) {
      console.warn("[Arifpay] API key not configured");
    }

    try {
      this.client = new Arifpay(ARIFPAY_API_KEY, ARIFPAY_SESSION_EXPIRY);
      console.log("[Arifpay] Express plugin initialized with API key:", ARIFPAY_API_KEY.substring(0, 10) + "...");
    } catch (error) {
      console.error("[Arifpay] Failed to initialize Express plugin:", error);
      this.client = null;
    }
  }

  async createPayment(
    options: ArifpayPaymentOptions
  ): Promise<ArifpayPaymentResponse> {
    if (!this.client) {
      throw new Error("ArifPay client not initialized");
    }

    const paymentInfo = {
      cancelUrl: options.cancelUrl,
      errorUrl: options.errorUrl,
      notifyUrl: options.notifyUrl,
      successUrl: options.successUrl,
      phone: options.phone,
      amount: options.amount,
      nonce: `${options.userId}-${uuidv4()}`,
      paymentMethods: ["TELEBIRR"],
      items: [
        {
          name: `Dating App - ${options.tier.toUpperCase()} Plan`,
          quantity: 1,
          price: options.amount,
        },
      ],
    };

    console.log("[Arifpay] Creating payment:", paymentInfo);

    try {
      const response = await this.client.Make_payment(paymentInfo);
      const result = JSON.parse(response);

      console.log("[Arifpay] Payment response:", result);

      if (!result.error && result.data && result.data.paymentUrl) {
        return {
          sessionId: result.data.sessionId,
          paymentUrl: result.data.paymentUrl,
          status: result.data.status,
        };
      } else {
        console.error("[Arifpay] Payment creation failed:", result.msg);
        throw new Error(result.msg || "Payment creation failed");
      }
    } catch (error) {
      console.error("[Arifpay] Payment error:", error);
      throw error;
    }
  }

  async verifyPayment(sessionId: string): Promise<{ status: string }>{
    try {
      if (!this.client) {
        throw new Error("ArifPay client not initialized");
      }
      // The express plugin does not expose a verify method in docs we have.
      // As a placeholder, assume paid; real integration should call ArifPay verify endpoint.
      console.log("[Arifpay] verifyPayment called for session:", sessionId);
      return { status: "PAID" };
    } catch (e) {
      console.error("[Arifpay] verifyPayment failed:", e);
      return { status: "UNKNOWN" };
    }
  }
}

export const arifpay = new ArifpayClient();
