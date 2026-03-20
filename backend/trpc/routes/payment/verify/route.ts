import { z } from "zod";
import { publicProcedure } from "../../../create-context.ts";
import { arifpay } from "../../../../lib/arifpay.ts";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nizdrhdfhddtrukeemhp.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pemRyaGRmaGRkdHJ1a2VlbWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDI2NTksImV4cCI6MjA3MDIxODY1OX0.5_8FUNRcHkr8PQtLMBhYp7PuqOgYphAjcw_E9jq-QTg';
const supabase = createClient(supabaseUrl, supabaseKey);

export default publicProcedure
  .input(
    z.object({
      sessionId: z.string(),
    })
  )
  .query(async ({ input }) => {
    console.log("[tRPC] Verifying payment:", input.sessionId);

    try {
      // 1. Verify with ArifPay
      const verification = await arifpay.verifyPayment(input.sessionId);
      console.log("[tRPC] Payment verification result:", verification);

      // 2. If successful, update our database immediately (don't wait for webhook)
      if (verification.status === "SUCCESS" || verification.status === "PAID" || verification.status === "success") {
        // Find transaction
        const { data: transaction } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('session_id', input.sessionId)
          .single();

        if (transaction && transaction.status !== 'completed') {
          console.log("[tRPC] Transaction found, upgrading user:", transaction.user_id);

          const userId = transaction.user_id;
          const amount = verification.amount || transaction.amount;
          let tier = transaction.tier || 'free';

          if (tier === 'free') {
            if (amount >= 2600) tier = 'vip';
            else if (amount >= 1500) tier = 'gold';
            else if (amount >= 500) tier = 'silver';
          }

          const billingMonths = transaction.billing_months ?? 1;
          const now = new Date();
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + billingMonths);

          // Update Membership
          await supabase
            .from('memberships')
            .upsert({
              user_id: userId,
              tier,
              expires_at: expiresAt.toISOString(),
              updated_at: now.toISOString(),
            }, { onConflict: 'user_id' });

          // Update Transaction
          await supabase
            .from('payment_transactions')
            .update({
              status: 'completed',
              completed_at: now.toISOString(),
              arifpay_transaction_id: verification.transactionId
            })
            .eq('id', transaction.id);

          // Update Profile
          await supabase
            .from('profiles')
            .update({ is_premium: true })
            .eq('id', userId);
        }
      }

      const { data: txRecord } = await supabase
        .from('payment_transactions')
        .select('tier, billing_months')
        .eq('session_id', input.sessionId)
        .maybeSingle();

      return {
        success: true,
        status: verification.status,
        amount: verification.amount,
        transactionId: verification.transactionId,
        paidAt: verification.paidAt,
        tier: txRecord?.tier ?? null,
        billingMonths: txRecord?.billing_months ?? 1,
      };
    } catch (error) {
      console.error("[tRPC] Payment verification failed:", error);
      throw new Error("Failed to verify payment");
    }
  });
