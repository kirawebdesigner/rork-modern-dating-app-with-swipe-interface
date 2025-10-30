import { Hono } from "hono";
import { arifpay } from "./lib/arifpay";

const webhooks = new Hono();

webhooks.post("/arifpay", async (c) => {
  try {
    const body = await c.req.json();
    console.log("[Webhook] Arifpay notification:", body);

    const { sessionId, status, transactionId } = body;

    if (status === "PAID") {
      const verification = await arifpay.verifyPayment(sessionId);

      if (verification.status === "PAID") {
        console.log("[Webhook] Payment confirmed:", transactionId);
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("[Webhook] Error processing Arifpay notification:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default webhooks;
