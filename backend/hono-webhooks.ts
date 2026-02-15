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

    // ArifPay webhook payload structure can vary slightly; handle common mappings
    const {
      uuid,
      sessionId,
      transactionStatus,
      transaction: webhookTransaction,
      totalAmount,
      paymentMethod
    } = body;

    const actualSessionId = uuid || sessionId || webhookTransaction?.sessionId;

    // Status can be in transactionStatus or inside the transaction object
    const rawStatus = transactionStatus || webhookTransaction?.transactionStatus || body.status;
    const status = String(rawStatus || "").toUpperCase();

    const transactionId = webhookTransaction?.transactionId || body.transactionId;

    if (!actualSessionId) {
      console.error("[Webhook] No sessionId/uuid found in webhook payload:", body);
      return c.json({ error: "Missing sessionId" }, 400);
    }

    console.log(`[Webhook] Processing ${status} for sessionId: ${actualSessionId}`);

    // Look up the transaction in our database
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('session_id', actualSessionId)
      .single();

    if (txError || !transaction) {
      console.warn("[Webhook] Transaction record not found in DB:", actualSessionId);
      // We return 200 to acknowledge receipt even if not found, to stop retries for non-existent sessions
      return c.json({ success: false, message: "Transaction record not found" });
    }

    // Handle successful payment
    if (["SUCCESS", "PAID", "COMPLETED"].includes(status)) {
      console.log("[Webhook] Payment success confirmed. Verifying with ArifPay API...");

      const verification = await arifpay.verifyPayment(actualSessionId);
      const vStatus = String(verification.status || "").toUpperCase();

      if (["SUCCESS", "PAID", "COMPLETED"].includes(vStatus)) {
        console.log(`[Webhook] Verified! Updating user: ${transaction.user_id}`);

        const userId = transaction.user_id;
        const amount = verification.amount || transaction.amount;
        let tier = transaction.tier || 'free';

        // Auto-detect tier based on amount if not specified
        if (tier === 'free') {
          if (amount >= 2600) tier = 'vip';
          else if (amount >= 1500) tier = 'gold';
          else if (amount >= 500) tier = 'silver';
        }

        const now = new Date();
        const billingMonths = transaction.billing_months ?? 1;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + billingMonths);

        console.log(`[Webhook] Upgrading user ${userId} to ${tier}`);

        // 1. Update/Create Membership
        const { error: mError } = await supabase
          .from('memberships')
          .upsert({
            user_id: userId,
            tier,
            expires_at: expiresAt.toISOString(),
            updated_at: now.toISOString(),
          }, { onConflict: 'user_id' });

        if (mError) {
          console.error("[Webhook] Membership upsert failed:", mError);
          return c.json({ error: "Database error during membership update" }, 500);
        }

        // 2. Update Payment Transaction Record
        await supabase
          .from('payment_transactions')
          .update({
            status: 'completed',
            completed_at: now.toISOString(),
            arifpay_transaction_id: transactionId || verification.transactionId
          })
          .eq('id', transaction.id);

        // 3. Mark Profile as Premium
        await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('id', userId);

        console.log("[Webhook] ✅ Fulfillment completed for session:", actualSessionId);
        return c.json({ success: true, message: "Payment processed and fulfilled" });
      } else {
        console.warn("[Webhook] ⚠️ Verification failed for session:", actualSessionId, "Verif result:", verification);
        return c.json({ success: false, message: "Payment verification failed with provider" }, 400);
      }
    } else if (["FAILED", "CANCELED", "CANCELLED", "EXPIRED"].includes(status)) {
      console.log(`[Webhook] Payment terminal status: ${status}`);
      await supabase
        .from('payment_transactions')
        .update({ status: status.toLowerCase() })
        .eq('id', transaction.id);

      return c.json({ success: true, message: `Status updated to ${status}` });
    } else if (status === "PENDING") {
      console.log("[Webhook] Payment is still pending...");
      return c.json({ success: true, message: "Payment pending" });
    } else {
      console.log("[Webhook] Unknown status received:", status);
      return c.json({ success: false, message: "Unknown status" }, 400);
    }
  } catch (error) {
    console.error("[Webhook] ❌ Critical error processing Arifpay notification:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, 500);
  }
});

export default webhooks;
