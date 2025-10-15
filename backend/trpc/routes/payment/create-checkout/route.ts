import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { arifpayClient } from "../../../../lib/arifpay-client";
import { validateArifpayConfig } from "../../../../lib/arifpay-config";

const ETB_RATE = 160;

const PRICES_USD: Record<string, number> = {
  silver: 9.99,
  gold: 19.99,
  vip: 29.99,
};

export default protectedProcedure
  .input(
    z.object({
      tier: z.enum(["silver", "gold", "vip"]),
      successUrl: z.string().optional(),
      cancelUrl: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }

    if (!validateArifpayConfig()) {
      throw new Error(
        "Payment gateway not configured. Please contact support."
      );
    }

    const priceUSD = PRICES_USD[input.tier];
    if (!priceUSD) {
      throw new Error("Invalid tier");
    }

    const amountETB = Math.round(priceUSD * ETB_RATE);

    console.log(
      `[Arifpay] Creating checkout for user ${userId}, tier: ${input.tier}, amount: ${amountETB} ETB`
    );

    try {
      const session = await arifpayClient.createCheckoutSession({
        userId,
        amount: amountETB,
        currency: "ETB",
        description: `${input.tier.toUpperCase()} Membership - 30 days`,
        metadata: {
          tier: input.tier,
          userId,
        },
        successUrl: input.successUrl || "myapp://payment-success",
        cancelUrl: input.cancelUrl || "myapp://payment-cancelled",
      });

      console.log(
        `[Arifpay] Checkout session created: ${session.sessionId}`
      );

      return {
        success: true as const,
        sessionId: session.sessionId,
        checkoutUrl: session.checkoutUrl,
        orderId: session.orderId,
        amount: amountETB,
        currency: "ETB",
      };
    } catch (error) {
      console.error("[Arifpay] Checkout creation error:", error);
      throw new Error("Failed to create payment session. Please try again.");
    }
  });
