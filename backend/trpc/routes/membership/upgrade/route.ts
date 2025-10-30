import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { arifpay } from "../../../../lib/arifpay";

const TIER_PRICES: Record<string, number> = {
  free: 0,
  silver: 1599,
  gold: 3199,
  vip: 4799,
};

export default publicProcedure
  .input(
    z.object({
      tier: z.enum(["free", "silver", "gold", "vip"]),
      phone: z.string(),
      successUrl: z.string(),
      cancelUrl: z.string(),
      errorUrl: z.string(),
    })
  )
  .mutation(async ({ input }) => {
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
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || "https://your-app.com";

      const payment = await arifpay.createPayment({
        amount,
        phone: input.phone,
        tier: input.tier,
        userId: pseudoUserId,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        errorUrl: input.errorUrl,
        notifyUrl: `${baseUrl}/api/webhooks/arifpay`,
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