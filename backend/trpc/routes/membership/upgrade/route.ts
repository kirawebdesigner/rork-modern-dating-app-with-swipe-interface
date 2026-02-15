import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { createClient } from "@supabase/supabase-js";
import { arifpay } from "../../../../lib/arifpay";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nizdrhdfhddtrukeemhp.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pemRyaGRmaGRkdHJ1a2VlbWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDI2NTksImV4cCI6MjA3MDIxODY1OX0.5_8FUNRcHkr8PQtLMBhYp7PuqOgYphAjcw_E9jq-QTg';
const supabase = createClient(supabaseUrl, supabaseKey);

export const upgradeProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      tier: z.enum(["free", "silver", "gold", "vip"]),
      paymentMethod: z.string().optional(),
      phone: z.string().optional(),
      amount: z.number().optional(),
      billingMonths: z.number().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log("[tRPC Upgrade] Processing upgrade for user:", input.userId);
    console.log("[tRPC Upgrade] Upgrading to tier:", input.tier);

    const amount = input.amount ?? 0;
    const billingMonths = input.billingMonths ?? 1;
    console.log("[tRPC Upgrade] Amount:", amount, "ETB, billing months:", billingMonths);

    if (amount === 0 || input.tier === 'free') {
      console.log("[tRPC Upgrade] Free tier, no payment required");
      return {
        success: true as const,
        newTier: input.tier,
        requiresPayment: false,
      };
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, phone')
        .eq('id', input.userId)
        .single();

      let phone = input.phone || profile?.phone || profile?.email;
      if (!phone) {
        throw new Error('Phone number is required for payment');
      }

      const envBase = process.env.EXPO_PUBLIC_API_URL;
      let baseUrl: string | undefined = undefined;
      if (envBase) baseUrl = envBase;

      if (!baseUrl) {
        const origin = ctx.req.headers.get("origin") || ctx.req.headers.get("referer");
        if (origin) {
          try {
            const u = new URL(origin);
            baseUrl = `${u.protocol}//${u.host}`;
          } catch {}
        }
      }

      if (!baseUrl) {
        const host = ctx.req.headers.get("x-forwarded-host") || ctx.req.headers.get("host");
        const proto = ctx.req.headers.get("x-forwarded-proto") || "https";
        if (host) baseUrl = `${proto}://${host}`;
      }

      if (!baseUrl) baseUrl = "https://01sqivqojn0aq61khqyvn.rork.app";

      console.log("[tRPC Upgrade] Base URL:", baseUrl);

      const successUrl = `${baseUrl}/payment-success`;
      const cancelUrl = `${baseUrl}/payment-cancel`;
      const errorUrl = `${baseUrl}/payment-error`;

      console.log("[tRPC Upgrade] Creating ArifPay payment...");
      console.log("[tRPC Upgrade] Success URL:", successUrl);

      const payment = await arifpay.createPayment({
        amount,
        phone,
        tier: input.tier,
        userId: input.userId,
        paymentMethod: input.paymentMethod || 'CBE',
        successUrl,
        cancelUrl,
        errorUrl,
        notifyUrl: `${baseUrl}/api/webhooks/arifpay`,
      });

      const { error: txError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: input.userId,
          session_id: payment.sessionId,
          amount,
          tier: input.tier,
          payment_method: input.paymentMethod || 'CBE',
          status: 'pending',
          billing_months: billingMonths,
        });

      if (txError) {
        console.error("[tRPC Upgrade] Failed to create payment transaction:", txError);
      }

      console.log("[tRPC Upgrade] Payment created successfully");
      console.log("[tRPC Upgrade] Session ID:", payment.sessionId);
      console.log("[tRPC Upgrade] Payment URL:", payment.paymentUrl);

      return {
        success: true as const,
        requiresPayment: true,
        paymentUrl: payment.paymentUrl,
        sessionId: payment.sessionId,
        amount,
      };
    } catch (error) {
      console.error("[tRPC Upgrade] Payment creation failed:", error);
      
      let errorMsg = "Failed to create payment";
      
      if (error instanceof Error) {
        errorMsg = error.message;
        
        if (errorMsg.includes('<!DOCTYPE') || errorMsg.includes('<html')) {
          errorMsg = "Payment service error. Please try again.";
        } else if (errorMsg.includes('fetch failed') || errorMsg.includes('ECONNREFUSED')) {
          errorMsg = "Cannot connect to payment service. Please check your connection.";
        }
      }
      
      throw new Error(errorMsg);
    }
  });

export default upgradeProcedure;
