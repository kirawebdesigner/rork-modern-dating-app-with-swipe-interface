import { z } from "zod";
import { protectedProcedure } from "../../../create-context";

export default protectedProcedure
  .input(z.object({ theme: z.enum(["midnight", "sunset", "geometric"]) }))
  .mutation(async ({ input, ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      throw new Error("Unauthorized");
    }

    console.log("[tRPC] Unlock theme for", userId, input.theme);

    return { success: true as const };
  });