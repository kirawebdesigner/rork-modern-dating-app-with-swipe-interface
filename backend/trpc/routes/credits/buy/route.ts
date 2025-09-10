import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export default protectedProcedure
  .input(z.object({ kind: z.enum(["superLikes", "boosts", "compliments", "messages", "unlocks"]), amount: z.number().min(1) }))
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }

    console.log("[tRPC] Buy credits for", userId, input.kind, input.amount);

    return { success: true as const };
  });