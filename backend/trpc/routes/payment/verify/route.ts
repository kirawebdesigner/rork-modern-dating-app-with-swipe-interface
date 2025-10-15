import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { arifpayClient } from "../../../../lib/arifpay-client";

export default protectedProcedure
  .input(
    z.object({
      sessionId: z.string(),
    })
  )
  .query(async ({ input, ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }

    console.log(
      `[Arifpay] Verifying payment for user ${userId}, session: ${input.sessionId}`
    );

    try {
      const verification = await arifpayClient.verifyPayment(input.sessionId);

      console.log(
        `[Arifpay] Verification result:`,
        verification.status,
        verification.success
      );

      return {
        success: verification.success,
        status: verification.status,
        sessionId: verification.sessionId,
        orderId: verification.orderId,
        amount: verification.amount,
        currency: verification.currency,
        transactionId: verification.transactionId,
        paidAt: verification.paidAt,
      };
    } catch (error) {
      console.error("[Arifpay] Verification error:", error);
      throw new Error("Failed to verify payment. Please try again.");
    }
  });
