import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { arifpay } from "../../../../lib/arifpay";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
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

           // Fallback tier logic
           if (tier === 'free') {
              if (amount >= 4800) tier = 'vip';
              else if (amount >= 3200) tier = 'gold';
              else if (amount >= 1600) tier = 'silver';
           }

           const now = new Date();
           const expiresAt = new Date();
           expiresAt.setMonth(expiresAt.getMonth() + 1);

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
