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

    const { sessionId, status, transactionId } = body;

    if (status === "SUCCESS" || status === "PAID") {
      console.log("[Webhook] Payment successful, verifying...");
      const verification = await arifpay.verifyPayment(sessionId);

      console.log("[Webhook] Verification result:", JSON.stringify(verification, null, 2));

      if (verification.status === "SUCCESS" || verification.status === "PAID") {
        console.log("[Webhook] Payment confirmed:", transactionId);

        const parts = sessionId.split('-');
        const userId = parts.length > 1 ? parts.slice(0, 2).join('-') : '';

        console.log('[Webhook] Extracted userId from sessionId:', userId);

        if (userId && userId.startsWith('phone-')) {
          const phone = userId.replace('phone-', '');

          console.log("[Webhook] Updating membership for phone:", phone);

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', phone)
            .single();

          if (profileError || !profile) {
            console.error("[Webhook] Profile not found for phone:", phone, profileError);
            return c.json({ error: "Profile not found" }, 404);
          }

          const amount = verification.amount || 0;
          let tier = 'free';
          if (amount >= 4800) tier = 'vip';
          else if (amount >= 3200) tier = 'gold';
          else if (amount >= 1600) tier = 'silver';

          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          const { error: updateError } = await supabase
            .from('memberships')
            .update({
              tier,
              expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', profile.id);

          if (updateError) {
            console.error("[Webhook] Failed to update membership:", updateError);
            return c.json({ error: "Failed to update membership" }, 500);
          }

          console.log("[Webhook] Membership updated to:", tier, "for user:", profile.id);
        }
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("[Webhook] Error processing Arifpay notification:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default webhooks;
