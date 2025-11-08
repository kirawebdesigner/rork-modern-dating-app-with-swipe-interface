import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { arifpay } from "../../../../lib/arifpay";

const TIER_PRICES: Record<string, number> = {
  free: 0,
  silver: 1600,
  gold: 3200,
  vip: 4800,
};

export const upgradeProcedure = publicProcedure
  .input(
    z.object({
      tier: z.enum(["free", "silver", "gold", "vip"]),
      phone: z.string(),
      paymentMethod: z.string().optional(),
      successUrl: z.string().optional(),
      cancelUrl: z.string().optional(),
      errorUrl: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const pseudoUserId = `phone-${input.phone}`;

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[tRPC Upgrade] 🔄 Processing upgrade request");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[tRPC Upgrade] User:", pseudoUserId);
    console.log("[tRPC Upgrade] Tier:", input.tier);
    console.log("[tRPC Upgrade] Payment method:", input.paymentMethod || 'CBE');

    const amount = TIER_PRICES[input.tier];
    console.log("[tRPC Upgrade] Amount:", amount, "ETB");

    if (amount === 0) {
      console.log("[tRPC Upgrade] ✅ Free tier, no payment required");
      return {
        success: true as const,
        newTier: input.tier,
        requiresPayment: false,
      };
    }

    try {
      const envBase = process.env.EXPO_PUBLIC_API_URL;
      const isPlaceholder = (url?: string) => !!url && url.includes("your-app.com");

      let baseUrl: string | undefined = undefined;
      if (envBase && !isPlaceholder(envBase)) baseUrl = envBase;

      if (!baseUrl) {
        const origin = ctx.req.headers.get("origin") || ctx.req.headers.get("referer");
        if (origin) {
          try {
            const u = new URL(origin);
            baseUrl = `${u.protocol}//${u.host}`;
          } catch {}
        }
      }

      if (!baseUrl) {
        const host = ctx.req.headers.get("x-forwarded-host") || ctx.req.headers.get("host");
        const proto = ctx.req.headers.get("x-forwarded-proto") || "http";
        if (host) baseUrl = `${proto}://${host}`;
      }

      if (!baseUrl) baseUrl = "http://localhost:8081";

      console.log("[tRPC Upgrade] Base URL:", baseUrl);

      const successUrl = `${baseUrl}/payment-success`;
      const cancelUrl = `${baseUrl}/payment-cancel`;
      const errorUrl = `${baseUrl}/payment-error`;

      console.log("[tRPC Upgrade] 💳 Creating ArifPay payment...");

      const payment = await arifpay.createPayment({
        amount,
        phone: input.phone,
        tier: input.tier,
        userId: pseudoUserId,
        paymentMethod: input.paymentMethod || 'CBE',
        successUrl,
        cancelUrl,
        errorUrl,
        notifyUrl: `${baseUrl}/webhooks/arifpay`,
      });

      console.log("[tRPC Upgrade] ✅ Payment created successfully");
      console.log("[tRPC Upgrade] Session ID:", payment.sessionId);
      console.log("[tRPC Upgrade] Payment URL:", payment.paymentUrl);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      return {
        success: true as const,
        requiresPayment: true,
        paymentUrl: payment.paymentUrl,
        sessionId: payment.sessionId,
        amount,
      };
    } catch (error) {
      console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("[tRPC Upgrade] ❌ Payment creation failed");
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("[tRPC Upgrade] Error:", error);
      
      let errorMsg = "Failed to create payment";
      
      if (error instanceof Error) {
        console.error("[tRPC Upgrade] Error message:", error.message);
        console.error("[tRPC Upgrade] Error stack:", error.stack);
        errorMsg = error.message;
        
        if (errorMsg.includes('<!DOCTYPE') || errorMsg.includes('<html')) {
          errorMsg = "Payment service returned invalid response. Please try again later.";
        } else if (errorMsg.includes('fetch failed') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ENOTFOUND')) {
          errorMsg = "Cannot connect to ArifPay payment service. Please check your internet connection and try again.";
        } else if (errorMsg.includes('API key')) {
          errorMsg = "Payment configuration error. Please contact support.";
        }
      }
      
      console.error("[tRPC Upgrade] Final error message:", errorMsg);
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      
      throw new Error(errorMsg);
    }
  });

export default upgradeProcedure;