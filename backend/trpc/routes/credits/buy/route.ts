import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

const CREDIT_PRICES: Record<string, number> = {
  superLikes: 50,
  boosts: 100,
  compliments: 30,
  messages: 20,
  unlocks: 75,
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
      returnUrl: z.string().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }

    console.log("[tRPC] Buy credits for", userId, input.kind, input.amount);
    console.log("[tRPC] TEST MODE: Payment bypassed for testing");

    const unitPrice = CREDIT_PRICES[input.kind];
    const totalAmount = unitPrice * input.amount;

    console.log("[tRPC] TEST MODE: Credits added successfully");

    return {
      success: true as const,
      amount: totalAmount,
      testMode: true,
      message: 'Credits added successfully (test mode)',
    };

    // OLD PAYMENT CODE - Disabled for testing
    /*
    try {
      const baseUrl = input.returnUrl || "exp://192.168.1.1:8081";

      const checkout = await arifpay.createCheckout({
        amount: totalAmount,
        currency: "ETB",
        beneficiaries: [
          {
            accountNumber: process.env.ARIFPAY_ACCOUNT_NUMBER || "1000000000",
            bank: "CBE",
            amount: totalAmount,
          },
        ],
        successUrl: `${baseUrl}/payment-verification?status=success&kind=${input.kind}&amount=${input.amount}`,
        cancelUrl: `${baseUrl}/payment-verification?status=cancelled&kind=${input.kind}`,
        errorUrl: `${baseUrl}/payment-verification?status=error&kind=${input.kind}`,
        notifyUrl: `${baseUrl}/api/webhooks/arifpay`,
      });

      console.log("[tRPC] Payment checkout created:", checkout);

      return {
        success: true as const,
        checkoutUrl: checkout.checkoutUrl,
        sessionId: checkout.sessionId,
        transactionId: checkout.transactionId,
        amount: totalAmount,
      };
    } catch (error) {
      console.error("[tRPC] Payment creation failed:", error);
      throw new Error("Failed to create payment checkout");
    }
    */
  });