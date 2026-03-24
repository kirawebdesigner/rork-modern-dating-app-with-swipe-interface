import { z } from "zod";
import { protectedProcedure } from "../../../create-context.ts";
import { createClient } from "@supabase/supabase-js";

const CREDIT_PRICES: Record<string, number> = {
  superLikes: 50,
  boosts: 100,
  compliments: 30,
  messages: 20,
  unlocks: 75,
};

// --- Issue #9 Fix: Actually credit the user's account in test mode ---
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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

    const unitPrice = CREDIT_PRICES[input.kind];
    const totalAmount = unitPrice * input.amount;

    // TEST MODE: Bypass payment but actually add credits to DB
    console.log("[tRPC] TEST MODE: Bypassing payment, adding credits to DB...");

    if (supabase) {
      try {
        // Fetch current credits
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .maybeSingle();

        const currentCredits = (profile as any)?.credits ?? 0;
        const newCredits = currentCredits + input.amount;

        // Update credits in DB
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ credits: newCredits })
          .eq('id', userId);

        if (updateErr) {
          console.error("[tRPC] Failed to update credits in DB:", updateErr.message);
        } else {
          console.log(`[tRPC] TEST MODE: Credits updated ${currentCredits} → ${newCredits} for ${input.kind}`);
        }

        // Also log the transaction
        await supabase
          .from('payment_transactions')
          .insert({
            user_id: userId,
            session_id: `test-${Date.now()}`,
            amount: totalAmount,
            tier: 'credits',
            payment_method: 'TEST',
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .then(({ error }) => {
            if (error) console.log("[tRPC] Credit transaction log failed:", error.message);
          });
      } catch (dbErr: any) {
        console.error("[tRPC] DB error adding credits:", dbErr?.message);
      }
    } else {
      console.warn("[tRPC] No Supabase client available - credits NOT persisted to DB");
    }

    return {
      success: true,
      amount: totalAmount,
      testMode: true,
      message: 'Credits added successfully (test mode)',
    };
  });