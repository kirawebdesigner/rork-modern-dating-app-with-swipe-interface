import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { createClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://nizdrhdfhddtrukeemhp.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pemRyaGRmaGRkdHJ1a2VlbWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NDI2NTksImV4cCI6MjA3MDIxODY1OX0.5_8FUNRcHkr8PQtLMBhYp7PuqOgYphAjcw_E9jq-QTg';
const supabase = createClient(supabaseUrl, supabaseKey);

const ARIFPAY_API_KEY = process.env.ARIFPAY_API_KEY || "hxsMUuBvV4j3ONdDif4SRSo2cKPrMoWY";
const ARIFPAY_BASE_URL = process.env.ARIFPAY_BASE_URL || "https://gateway.arifpay.net";
const ARIFPAY_ACCOUNT_NUMBER = process.env.ARIFPAY_ACCOUNT_NUMBER || "01320811436100";

const SUPPORTED_PAYMENT_METHODS = [
  "TELEBIRR", "AWAASH", "AWAASH_WALLET", "PSS", "CBE",
  "AMOLE", "BOA", "KACHA", "HELLOCASH", "MPESSA"
];

function normalizePhone(phone: string): string {
  let normalized = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  if (normalized.startsWith('+')) normalized = normalized.substring(1);
  if (normalized.startsWith('0')) normalized = '251' + normalized.substring(1);
  else if (!normalized.startsWith('251') && normalized.length === 9) normalized = '251' + normalized;
  if (normalized.length !== 12) return '251911111111';
  return normalized;
}

function normalizePaymentMethod(method: string): string[] {
  const methodMap: Record<string, string> = {
    'telebirr': 'TELEBIRR', 'cbe': 'CBE', 'awash': 'AWAASH',
    'awaash': 'AWAASH', 'amole': 'AMOLE', 'boa': 'BOA',
    'kacha': 'KACHA', 'hellocash': 'HELLOCASH', 'mpesa': 'MPESSA', 'mpessa': 'MPESSA',
  };
  const normalized = methodMap[method.toLowerCase()] || method.toUpperCase();
  if (SUPPORTED_PAYMENT_METHODS.includes(normalized)) return [normalized];
  return ["TELEBIRR", "CBE", "AWAASH"];
}

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
        requiresPayment: false as const,
        paymentUrl: null as string | null,
        sessionId: null as string | null,
        amount: 0,
        error: null as string | null,
      };
    }

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

    const normalizedPhone = normalizePhone(phone);

    let baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
    if (!baseUrl) {
      try {
        const origin = ctx.req.headers.get("origin") || ctx.req.headers.get("referer");
        if (origin) {
          const u = new URL(origin);
          baseUrl = `${u.protocol}//${u.host}`;
        }
      } catch {}
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
    const notifyUrl = `${baseUrl}/api/webhooks/arifpay`;

    const email = phone.includes('@') ? phone : `${input.userId}@app.com`;
    const nonce = `${input.userId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const expireDate = new Date();
    expireDate.setHours(expireDate.getHours() + 24);
    const expireDateStr = expireDate.toISOString().replace('.000Z', 'Z');
    const paymentMethods = normalizePaymentMethod(input.paymentMethod || 'TELEBIRR');

    const arifPayload = {
      cancelUrl,
      phone: normalizedPhone,
      email,
      nonce,
      successUrl,
      errorUrl,
      notifyUrl,
      paymentMethods,
      expireDate: expireDateStr,
      items: [
        {
          name: `${input.tier.charAt(0).toUpperCase() + input.tier.slice(1)} Membership`,
          quantity: 1,
          price: amount,
          description: `Premium ${input.tier} membership subscription`,
        },
      ],
      beneficiaries: [
        {
          accountNumber: ARIFPAY_ACCOUNT_NUMBER,
          bank: "AWINETAA",
          amount,
        },
      ],
      lang: "EN",
    };

    console.log("[tRPC Upgrade] ArifPay payload:", JSON.stringify(arifPayload, null, 2));

    let paymentUrl = '';
    let sessionId = '';

    try {
      const url = `${ARIFPAY_BASE_URL}/api/checkout/session`;
      console.log("[tRPC Upgrade] Calling ArifPay at:", url);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-arifpay-key": ARIFPAY_API_KEY,
        },
        body: JSON.stringify(arifPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseText = await response.text();
      console.log("[tRPC Upgrade] ArifPay raw response status:", response.status);
      console.log("[tRPC Upgrade] ArifPay raw response:", responseText.slice(0, 500));

      if (responseText.trim().startsWith('<')) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Payment gateway returned an invalid response. Please try again later.',
        });
      }

      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Payment gateway returned unparseable response. Please try again.',
        });
      }

      if (!response.ok) {
        const msg = result?.msg || result?.message || `Payment failed with status ${response.status}`;
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: String(msg) });
      }

      if (result?.error === false && result?.data?.paymentUrl) {
        paymentUrl = String(result.data.paymentUrl);
        sessionId = String(result.data.sessionId || '');
      } else {
        const msg = result?.msg || 'Payment creation failed - invalid response';
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: String(msg) });
      }
    } catch (error: any) {
      console.error("[tRPC Upgrade] ArifPay call failed:", error?.message || error);
      if (error instanceof TRPCError) throw error;

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
      success: true as const,
      requiresPayment: true as const,
      paymentUrl,
      sessionId,
      amount,
      newTier: input.tier,
      error: null as string | null,
    };
  });

export default upgradeProcedure;
