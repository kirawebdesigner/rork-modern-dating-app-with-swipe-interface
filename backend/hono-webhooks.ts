import { Hono } from "hono";
import { arifpay } from "./lib/arifpay";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || "",
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ""
);

const webhooks = new Hono();

webhooks.post("/arifpay", async (c) => {
  try {
    const body = await c.req.json();
    console.log("[Webhook] Arifpay notification received:", JSON.stringify(body, null, 2));

    const { uuid, sessionId, status, transactionId } = body;
    const actualSessionId = uuid || sessionId;

    console.log("[Webhook] Processing sessionId:", actualSessionId, "status:", status);

    // Look up the transaction in our database first
    if (!actualSessionId) {
      console.error("[Webhook] No sessionId found in webhook payload");
      return c.json({ error: "Missing sessionId" }, 400);
    }

    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('session_id', actualSessionId)
      .single();

    if (txError || !transaction) {
      console.error("[Webhook] Transaction not found:", actualSessionId, txError);
      // We might want to return 200 to acknowledge receipt even if we can't find it,
      // to avoid ArifPay retrying indefinitely if it's a valid webhook but invalid internal state.
      // But for now let's return 404.
      return c.json({ error: "Transaction not found" }, 404);
    }

    if (status === "SUCCESS" || status === "PAID" || status === "success") {
      console.log("[Webhook] Payment successful, verifying with ArifPay...");

      const verification = await arifpay.verifyPayment(actualSessionId);
      console.log("[Webhook] Verification result:", JSON.stringify(verification, null, 2));

      if (verification.status === "SUCCESS" || verification.status === "PAID" || verification.status === "success") {
        console.log("[Webhook] Payment verified. Updating user:", transaction.user_id);

        const userId = transaction.user_id;
        const amount = verification.amount || transaction.amount;
        let tier = transaction.tier || 'free';

        // Fallback tier logic if not in transaction
        if (tier === 'free') {
           if (amount >= 4800) tier = 'vip';
           else if (amount >= 3200) tier = 'gold';
           else if (amount >= 1600) tier = 'silver';
        }

        const now = new Date();
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1); // Add 1 month

        console.log(`[Webhook] Setting tier to ${tier} for user ${userId}`);

        // 1. Update Membership
        const { error: updateError } = await supabase
          .from('memberships')
          .upsert({
            user_id: userId,
            tier,
            expires_at: expiresAt.toISOString(),
            updated_at: now.toISOString(),
            // Maintain other fields if they exist
            // email: transaction.email // Removed to avoid potential null overwrite
          }, { onConflict: 'user_id' }); // Upsert by user_id

        if (updateError) {
          console.error("[Webhook] Failed to update membership:", updateError);
          return c.json({ error: "Failed to update membership" }, 500);
        }

        // 2. Update Payment Transaction Status
        await supabase
          .from('payment_transactions')
          .update({
            status: 'completed',
            completed_at: now.toISOString(),
            arifpay_transaction_id: transactionId || verification.transactionId
          })
          .eq('id', transaction.id);

        // 3. Update Profile is_premium flag
        await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', userId);

        console.log("[Webhook] Upgrade successful for user:", userId);
      } else {
        console.log("[Webhook] Payment not verified. Status:", verification.status);
        await supabase
          .from('payment_transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);
      }
    } else {
      console.log("[Webhook] Payment status not successful:", status);
      await supabase
          .from('payment_transactions')
          .update({ status: 'failed' })
          .eq('id', transaction.id);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("[Webhook] Error processing Arifpay notification:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default webhooks;
