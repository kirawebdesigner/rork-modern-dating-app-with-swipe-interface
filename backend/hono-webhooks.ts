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

    const { uuid, sessionId, status, transactionId, nonce } = body;
    const actualSessionId = uuid || sessionId;

    console.log("[Webhook] Processing sessionId:", actualSessionId, "status:", status);

    if (status === "SUCCESS" || status === "PAID" || status === "success") {
      console.log("[Webhook] Payment successful, verifying...");
      
      if (!actualSessionId) {
        console.error("[Webhook] No sessionId found in webhook payload");
        return c.json({ error: "Missing sessionId" }, 400);
      }

      const verification = await arifpay.verifyPayment(actualSessionId);

      console.log("[Webhook] Verification result:", JSON.stringify(verification, null, 2));

      if (verification.status === "SUCCESS" || verification.status === "PAID" || verification.status === "success") {
        console.log("[Webhook] Payment confirmed:", transactionId);

        let userId = '';
        if (nonce) {
          const parts = nonce.split('-');
          userId = parts.length >= 2 ? parts.slice(0, 2).join('-') : '';
        }

        if (!userId && actualSessionId) {
          const parts = actualSessionId.split('-');
          userId = parts.length > 1 ? parts.slice(0, 2).join('-') : '';
        }

        console.log('[Webhook] Extracted userId:', userId);

        if (userId && userId.startsWith('phone-')) {
          const phone = userId.replace('phone-', '');

          console.log("[Webhook] Updating membership for phone:", phone);

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone', phone)
            .maybeSingle();

          if (profileError || !profile) {
            console.error("[Webhook] Profile not found for phone:", phone, profileError);
            return c.json({ error: "Profile not found" }, 404);
          }

          const amount = verification.amount || 0;
          let tier = 'free';
          if (amount >= 4800) tier = 'vip';
          else if (amount >= 3200) tier = 'gold';
          else if (amount >= 1600) tier = 'silver';

          const now = new Date();
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          console.log(`[Webhook] Setting tier to ${tier} with expiration at ${expiresAt.toISOString()}`);

          const { error: updateError } = await supabase
            .from('memberships')
            .upsert({
              user_id: profile.id,
              phone_number: phone,
              tier,
              expires_at: expiresAt.toISOString(),
              updated_at: now.toISOString(),
            }, { onConflict: 'user_id' });

          if (updateError) {
            console.error("[Webhook] Failed to update membership:", updateError);
            return c.json({ error: "Failed to update membership" }, 500);
          }

          console.log("[Webhook] Membership updated successfully. Tier:", tier, "User:", profile.id, "Expires:", expiresAt.toISOString());
        } else {
          console.error("[Webhook] Invalid userId extracted:", userId);
        }
      } else {
        console.log("[Webhook] Payment not verified. Status:", verification.status);
      }
    } else {
      console.log("[Webhook] Payment status not successful:", status);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("[Webhook] Error processing Arifpay notification:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default webhooks;
