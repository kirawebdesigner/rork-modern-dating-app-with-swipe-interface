import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { arifpay } from "../../../../lib/arifpay";

export default protectedProcedure
  .input(
    z.object({
      sessionId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }

    console.log("[tRPC] Verifying payment:", input.sessionId);

    try {
      const verification = await arifpay.verifyPayment(input.sessionId);

      console.log("[tRPC] Payment verification result:", verification);

      return {
        success: true as const,
        status: verification.status,
        amount: verification.amount,
        transactionId: verification.transactionId,
        paidAt: verification.paidAt,
      };
    } catch (error) {
      console.error("[tRPC] Payment verification failed:", error);
      throw new Error("Failed to verify payment");
    }
  });
