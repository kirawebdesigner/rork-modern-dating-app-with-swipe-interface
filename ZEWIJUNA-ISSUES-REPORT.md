# 🛡️ Zewijuna App Issues Report
**Date:** March 24, 2026
**Status:** Deep-Dive Audit Completed
**Agents:** `@orchestrator`, `@security-auditor`, `@backend-specialist`, `@frontend-specialist`, `@database-architect`, `@mobile-developer`

---

## 🔴 CRITICAL SECURITY & BUSINESS VULNERABILITIES (Must Fix Immediately)

### 1. Payment Amount Manipulation (Price Bypass)
*   **Agent:** `@backend-specialist` / `@security-auditor`
*   **Issue:** The tRPC `upgradeProcedure` accepts the `amount` directly from the client and trusts it without validating it against the requested `tier`.
*   **Impact:** An attacker can request a `VIP` membership and set the `amount` to 1 ETB. Since the server uses this amount to create the ArifPay session and later fulfills the order based on the session ID alone, users can gain premium access for free/near-free.
*   **Location:** `backend/trpc/routes/membership/upgrade/route.ts` (Lines 45-55).

### 2. Database Row-Level Security (RLS) Leak
*   **Agent:** `@database-architect` / `@security-auditor`
*   **Issue:** All tables in the Supabase `public` schema have RLS enabled, but the policies are set to `Allow all` (`USING (true) WITH CHECK (true)`).
*   **Impact:** Any authenticated user can read, update, or delete **any** other user's data, including private messages, profile photos, and payment transactions. This is a massive data privacy breach.
*   **Location:** `database-schema.sql` (Lines 185-200).

### 3. Hardcoded Production Secrets
*   **Agent:** `@security-auditor`
*   **Issue:** Sensitive credentials for Supabase and ArifPay are hardcoded as fallbacks in multiple files.
*   **Impact:** If the `.env` file is missing or fails to load, the app exposes production keys and connection strings in the client/server source code.
*   **Secrets Found:**
    *   `SUPABASE_ANON_KEY`: Hardcoded in `lib/supabase.ts`, `backend/hono-webhooks.ts`.
    *   `ARIFPAY_API_KEY`: Hardcoded in `backend/lib/arifpay.ts`, `backend/trpc/routes/membership/upgrade/route.ts`.
    *   `ARIFPAY_ACCOUNT_NUMBER`: Hardcoded in `backend/lib/arifpay.ts`.

---

## 🟠 MAJOR STABILITY & ARCHITECTURAL RISKS

### 4. Missing Webhook Signature Verification
*   **Agent:** `@backend-specialist` / `@security-auditor`
*   **Issue:** The `/webhooks/arifpay` endpoint processes payment notifications without verifying the HMAC signature from ArifPay.
*   **Impact:** Attackers can flood the endpoint with fake session IDs, potentially causing a Denial of Service (DoS) or exposing race conditions in the fulfillment logic.
*   **Location:** `backend/hono-webhooks.ts`.

### 5. Native Dependency Mismatches (Build Instability)
*   **Agent:** `@mobile-developer`
*   **Issue:** Significant version conflicts in native modules:
    *   **Duplicates:** `expo-location` (v55.1.2 vs v15.1.1).
    *   **Mismatch:** `react-native-reanimated` (v4.2.1 found, but `~4.1.1` expected).
*   **Impact:** This will likely cause build failures on Android/iOS or unpredictable crashes in production builds.
*   **Location:** `doctor_output_v5.txt`, `package.json`.

### 6. Client-Side Database Reliance
*   **Agent:** `@orchestrator`
*   **Issue:** The mobile app performs direct Supabase `update` calls for critical data (profiles, swipes, etc.) instead of going through a secured API layer.
*   **Impact:** Once RLS is properly secured, these client-side updates will fail unless extremely complex and permissive policies are written. This makes the architecture brittle and hard to secure.
*   **Location:** `hooks/app-context.tsx`, `app/profile-setup.tsx`.

---

## 🟡 FUNCTIONAL & UX GAPS

### 7. Profile Invisibility Loop (Onboarding Drop-off)
*   **Agent:** `@frontend-specialist`
*   **Issue:** The discovery logic only shows profiles where `completed = true`. However, `ProfileSetup.tsx` only sets `completed: true` at the very last step.
*   **Impact:** If a user completes their name, photo, and bio but stops at the "Interests" screen, their profile is functional but **completely invisible** to others.
*   **Location:** `app/profile-setup.tsx`, `hooks/app-context.tsx`.

### 8. AsyncStorage Race Condition (Payment Success)
*   **Agent:** `@mobile-developer`
*   **Issue:** `AsyncStorage.setItem('pending_payment_session', ...)` is followed immediately by `Linking.openURL`.
*   **Impact:** If the user is redirected away before the local storage write finishes, the `payment-success` screen won't find the session ID, causing an "Auto-Verification" failure.
*   **Location:** `app/premium.tsx` (Line 160).

### 9. Incomplete Test Mode (Credits)
*   **Agent:** `@backend-specialist`
*   **Issue:** The `credits.buy` procedure is hardcoded to return `success: true` for testing but **does not actually add credits** to the database.
*   **Impact:** Developers think the flow is working, but credits are never credited to the account during testing.
*   **Location:** `backend/trpc/routes/credits/buy/route.ts`.

---

## 🔵 MAINTENANCE & OPTIMIZATION

### 10. Massive Logic Duplication (ArifPay)
*   **Agent:** `@backend-specialist`
*   **Issue:** `normalizePhone` and `normalizePaymentMethod` are re-implemented in every route that uses ArifPay instead of using the `ArifpayClient`.
*   **Impact:** High maintenance overhead. If phone formatting rules change, they must be updated in 4+ locations.
*   **Location:** `backend/lib/arifpay.ts`, `backend/trpc/routes/membership/upgrade/route.ts`, `backend/trpc/routes/credits/buy/route.ts`.

### 11. Lack of Centralized Logging/Monitoring
*   **Agent:** `@orchestrator`
*   **Issue:** The app relies solely on `console.log` for error reporting.
*   **Impact:** There is no visibility into production crashes or payment failures once the app is in the hands of users.

---

## 🛠️ Recommended Next Steps (High-Level)

1.  **Fulfillment Lock:** Validate the `amount` against the `tier` inside the `upgradeProcedure` before calling ArifPay.
2.  **Secure RLS:** Replace "Allow all" with `auth.uid() = user_id` policies for all tables.
3.  **Deduplicate Logic:** Use the `ArifpayClient` class exclusively for all ArifPay interactions.
4.  **Expo Synchronization:** Run `npx expo install --check` and resolve the `expo-location` duplication from `@teovilla/react-native-web-maps`.
5.  **Signature Auth:** Implement HMAC verification in `backend/hono-webhooks.ts`.

---
**Report generated by Gemini CLI Orchestrator Agent.**