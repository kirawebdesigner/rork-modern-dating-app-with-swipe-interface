import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export default protectedProcedure
  .input(z.object({ tier: z.enum(["free", "gold", "vip"]) }))
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }

    console.log("[tRPC] Upgrade tier for", userId, "->", input.tier);

    return { success: true as const, newTier: input.tier };
  });