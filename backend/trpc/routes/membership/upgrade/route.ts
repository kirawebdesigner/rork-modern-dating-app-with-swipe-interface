import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { arifpay } from "../../../../lib/arifpay";

const TIER_PRICES: Record<string, number> = {
  free: 0,
  silver: 1600,
  gold: 3200,
  vip: 4800,
};

export default publicProcedure
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

    console.log("[tRPC] Upgrade tier for", pseudoUserId, "->", input.tier);

    const amount = TIER_PRICES[input.tier];

    if (amount === 0) {
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

      if (!baseUrl) baseUrl = "http://localhost:3000";

      const successUrl = `${baseUrl}/payments/success`;
      const cancelUrl = `${baseUrl}/payments/cancel`;
      const errorUrl = `${baseUrl}/payments/error`;

      const payment = await arifpay.createPayment({
        amount,
        phone: input.phone,
        tier: input.tier,
        userId: pseudoUserId,
        paymentMethod: input.paymentMethod || 'TELEBIRR',
        successUrl,
        cancelUrl,
        errorUrl,
        notifyUrl: `${baseUrl}/webhooks/arifpay`,
      });

      console.log("[tRPC] Payment created:", payment);

      return {
        success: true as const,
        requiresPayment: true,
        paymentUrl: payment.paymentUrl,
        sessionId: payment.sessionId,
        amount,
      };
    } catch (error) {
      console.error("[tRPC] Payment creation failed:", error);
      throw new Error("Failed to create payment");
    }
  });