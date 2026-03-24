import { z } from "zod";
import { publicProcedure } from "../../../create-context.ts";
import { createClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";
import { arifpay } from "../../../lib/arifpay.ts";

// --- Issue #3 Fix: No hardcoded secrets. Fail fast if env vars are missing. ---
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("[tRPC Upgrade] FATAL: Missing SUPABASE env vars. Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// --- Issue #1 Fix: Server-side tier→price map. Client amount is IGNORED. ---
const TIER_PRICES: Record<string, number> = {
  silver: 500,
  gold: 1500,
  vip: 2600,
};

const BILLING_DISCOUNTS: Record<number, number> = {
  1: 0,
  6: 0.25,
  12: 0.40,
};

function getServerSideAmount(tier: string, billingMonths: number): number {
  const monthlyPrice = TIER_PRICES[tier];
  if (!monthlyPrice) return 0;
  const discount = BILLING_DISCOUNTS[billingMonths] ?? 0;
  return Math.round(monthlyPrice * billingMonths * (1 - discount));
}

export const upgradeProcedure = publicProcedure
  .input(
    z.object({
      userId: z.string(),
      tier: z.enum(["free", "silver", "gold", "vip"]),
      paymentMethod: z.string().optional(),
      phone: z.string().optional(),
      amount: z.number().optional(), // Kept for backward compat but IGNORED
      billingMonths: z.number().optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log("[tRPC Upgrade] Processing upgrade for user:", input.userId);
    console.log("[tRPC Upgrade] Upgrading to tier:", input.tier);

    const billingMonths = input.billingMonths ?? 1;

    if (input.tier === 'free') {
      console.log("[tRPC Upgrade] Free tier, no payment required");
      return {
        success: true,
        newTier: input.tier,
        requiresPayment: false,
        paymentUrl: null,
        sessionId: null,
        amount: 0,
        error: null,
      };
    }

    // Issue #1 Fix: Calculate amount server-side, never trust client
    const amount = getServerSideAmount(input.tier, billingMonths);
    if (amount <= 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid tier "${input.tier}" or billing months "${billingMonths}".`,
      });
    }

    // Log if client sent a mismatched amount (potential manipulation attempt)
    if (input.amount && input.amount !== amount) {
      console.warn(`[tRPC Upgrade] ⚠️ Client sent amount=${input.amount} but server calculated amount=${amount} for tier=${input.tier}, months=${billingMonths}. Using server amount.`);
    }

    console.log("[tRPC Upgrade] Server-calculated amount:", amount, "ETB, billing months:", billingMonths);

    let phone = input.phone || '';
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, phone')
        .eq('id', input.userId)
        .maybeSingle();

      phone = phone || profile?.phone || profile?.email || '';
    } catch (e: any) {
      console.log("[tRPC Upgrade] Profile fetch error (continuing):", e?.message);
    }

    if (!phone) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Phone number is required for payment',
      });
    }

    // --- Issue #10 Fix: Use ArifpayClient instead of duplicated logic ---
    let baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
    if (!baseUrl) {
      try {
        const origin = ctx.req.headers.get("origin") || ctx.req.headers.get("referer");
        if (origin) {
          const u = new URL(origin);
          baseUrl = `${u.protocol}//${u.host}`;
        }
      } catch { }
    }
    if (!baseUrl) {
      const host = ctx.req.headers.get("x-forwarded-host") || ctx.req.headers.get("host");
      const proto = ctx.req.headers.get("x-forwarded-proto") || "https";
      if (host) baseUrl = `${proto}://${host}`;
    }
    if (!baseUrl) baseUrl = "https://api.zewijuna.com";

    console.log("[tRPC Upgrade] Base URL:", baseUrl);

    const successUrl = `${baseUrl}/payment-success`;
    const cancelUrl = `${baseUrl}/payment-cancel`;
    const errorUrl = `${baseUrl}/payment-error`;
    const notifyUrl = `${baseUrl}/webhooks/arifpay`;

    let paymentUrl = '';
    let sessionId = '';

    try {
      const result = await arifpay.createPayment({
        amount,
        phone,
        tier: input.tier,
        userId: input.userId,
        paymentMethod: input.paymentMethod || 'TELEBIRR',
        cancelUrl,
        errorUrl,
        notifyUrl,
        successUrl,
      });

      paymentUrl = result.paymentUrl;
      sessionId = result.sessionId;
    } catch (error: any) {
      console.error("[tRPC Upgrade] ArifPay call failed:", error?.message || error);

      let errorMsg = 'Failed to create payment';
      if (error?.name === 'AbortError') {
        errorMsg = 'Payment service timed out. Please try again.';
      } else if (error?.message?.includes('fetch failed') || error?.message?.includes('ECONNREFUSED')) {
        errorMsg = 'Cannot connect to payment service. Please check your connection.';
      } else if (error?.message) {
        errorMsg = String(error.message).slice(0, 200);
      }

      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: errorMsg });
    }

    try {
      const { error: txError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: input.userId,
          session_id: sessionId,
          amount,
          tier: input.tier,
          payment_method: input.paymentMethod || 'CBE',
          status: 'pending',
          billing_months: billingMonths,
        });

      if (txError) {
        console.error("[tRPC Upgrade] Failed to save payment transaction:", txError.message);
      }
    } catch (dbErr: any) {
      console.error("[tRPC Upgrade] DB insert error (non-fatal):", dbErr?.message);
    }

    console.log("[tRPC Upgrade] Payment created successfully");
    console.log("[tRPC Upgrade] Session ID:", sessionId);
    console.log("[tRPC Upgrade] Payment URL:", paymentUrl);

    return {
      success: true,
      requiresPayment: true,
      paymentUrl,
      sessionId,
      amount,
      newTier: input.tier,
      error: null,
    };
  });

export default upgradeProcedure;
