import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { arifpayClient } from "../../../../lib/arifpay-client";
import { validateArifpayConfig } from "../../../../lib/arifpay-config";

const ETB_RATE = 160;

const CREDIT_PRICES_USD: Record<string, Record<number, number>> = {
  superLikes: {
    5: 4.99,
    10: 8.99,
    25: 19.99,
  },
  boosts: {
    1: 4.99,
    5: 19.99,
    10: 34.99,
  },
  compliments: {
    5: 2.99,
    10: 4.99,
    25: 9.99,
  },
  messages: {
    10: 4.99,
    25: 9.99,
    50: 16.99,
  },
  unlocks: {
    3: 4.99,
    10: 14.99,
    25: 29.99,
  },
};

export default protectedProcedure
  .input(
    z.object({
      kind: z.enum([
        "superLikes",
        "boosts",
        "compliments",
        "messages",
        "unlocks",
      ]),
      amount: z.number().min(1),
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

    const priceUSD = CREDIT_PRICES_USD[input.kind]?.[input.amount];
    if (!priceUSD) {
      throw new Error("Invalid credit package");
    }

    const amountETB = Math.round(priceUSD * ETB_RATE);

    console.log(
      `[Arifpay] Creating credits checkout for user ${userId}, kind: ${input.kind}, amount: ${input.amount}, price: ${amountETB} ETB`
    );

    try {
      const session = await arifpayClient.createCheckoutSession({
        userId,
        amount: amountETB,
        currency: "ETB",
        description: `${input.amount} ${input.kind}`,
        metadata: {
          creditKind: input.kind,
          creditAmount: input.amount,
          userId,
        },
        successUrl: input.successUrl || "myapp://payment-success",
        cancelUrl: input.cancelUrl || "myapp://payment-cancelled",
      });

      console.log(
        `[Arifpay] Credits checkout session created: ${session.sessionId}`
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
      console.error("[Arifpay] Credits checkout creation error:", error);
      throw new Error("Failed to create payment session. Please try again.");
    }
  });
