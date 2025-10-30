import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { arifpay } from "../../../../lib/arifpay";

const TIER_PRICES: Record<string, number> = {
  free: 0,
  silver: 499,
  gold: 999,
  vip: 1999,
};

export default protectedProcedure
  .input(
    z.object({
      tier: z.enum(["free", "silver", "gold", "vip"]),
      returnUrl: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }

    console.log("[tRPC] Upgrade tier for", userId, "->", input.tier);

    const amount = TIER_PRICES[input.tier];

    if (amount === 0) {
      return {
        success: true as const,
        newTier: input.tier,
        requiresPayment: false,
      };
    }

    try {
      const baseUrl = input.returnUrl || "exp://192.168.1.1:8081";

      const checkout = await arifpay.createCheckout({
        amount,
        currency: "ETB",
        beneficiaries: [
          {
            accountNumber: process.env.ARIFPAY_ACCOUNT_NUMBER || "1000000000",
            bank: "CBE",
            amount,
          },
        ],
        successUrl: `${baseUrl}/payment-verification?status=success&tier=${input.tier}`,
        cancelUrl: `${baseUrl}/payment-verification?status=cancelled&tier=${input.tier}`,
        errorUrl: `${baseUrl}/payment-verification?status=error&tier=${input.tier}`,
        notifyUrl: `${baseUrl}/api/webhooks/arifpay`,
      });

      console.log("[tRPC] Payment checkout created:", checkout);

      return {
        success: true as const,
        requiresPayment: true,
        checkoutUrl: checkout.checkoutUrl,
        sessionId: checkout.sessionId,
        transactionId: checkout.transactionId,
        amount,
      };
    } catch (error) {
      console.error("[tRPC] Payment creation failed:", error);
      throw new Error("Failed to create payment checkout");
    }
  });