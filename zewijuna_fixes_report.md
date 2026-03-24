# 🛡️ Zewijuna Issues — Fix Report

**Date:** March 24, 2026  
**Status:** ✅ All 16 issues addressed

---

## Summary of Changes

| # | Issue | Severity | Status | Files Changed |
|---|-------|----------|--------|---------------|
| 1 | Payment Amount Manipulation | 🔴 CRITICAL | ✅ Fixed | [route.ts](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/backend/trpc/routes/membership/upgrade/route.ts) |
| 2 | Database RLS Leak | 🔴 CRITICAL | ✅ SQL Ready | [fix-rls-policies.sql](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/fix-rls-policies.sql) |
| 3 | Hardcoded Secrets | 🔴 CRITICAL | ✅ Fixed | [arifpay.ts](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/backend/lib/arifpay.ts), [hono-webhooks.ts](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/backend/hono-webhooks.ts), [supabase.ts](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/lib/supabase.ts), [route.ts](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/backend/trpc/routes/membership/upgrade/route.ts) |
| 4 | Missing Webhook Signature | 🟠 MAJOR | ✅ Fixed | [hono-webhooks.ts](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/backend/hono-webhooks.ts) |
| 5 | Native Dependency Mismatches | 🟠 MAJOR | ⚠️ Manual | See instructions below |
| 6 | Client-Side DB Reliance | 🟠 MAJOR | ⚠️ Noted | Architecture recommendation |
| 7 | Profile Invisibility Loop | 🟡 UX | ✅ Fixed | [profile-setup.tsx](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/app/profile-setup.tsx) |
| 8 | AsyncStorage Race Condition | 🟡 UX | ✅ Fixed | [premium.tsx](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/app/premium.tsx) |
| 9 | Incomplete Test Mode (Credits) | 🟡 UX | ✅ Fixed | [credits/buy/route.ts](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/backend/trpc/routes/credits/buy/route.ts) |
| 10 | Logic Duplication (ArifPay) | 🔵 MAINT | ✅ Fixed | [route.ts](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/backend/trpc/routes/membership/upgrade/route.ts) |
| 11 | No Centralized Logging | 🔵 MAINT | ✅ Created | [logger.ts](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/lib/logger.ts) |
| 12 | Database Linter Warnings (Search Path) | 🟠 MAJOR | ✅ SQL Ready | [fix-security-hardened.sql](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/fix-security-hardened.sql) |
| 13 | Permissive Notifications RLS | 🟠 MAJOR | ✅ SQL Ready | [fix-security-hardened.sql](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/fix-security-hardened.sql) |
| 14 | Profile Saving Stability | 🟠 MAJOR | ✅ Fixed | [app-context.tsx](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/hooks/app-context.tsx) |
| 15 | Adaptive Startup Failure (cPanel) | 🟠 MAJOR | ✅ Fixed | [index.js](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/backend/index.js) |
| 16 | Backend Dependency Conflict | 🔵 MAINT | ✅ Fixed | [package.json](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/backend/package.json) |

---

## Detailed Fix Descriptions

### 🔴 Fix #12 & #13: Database Security Hardening

> [!IMPORTANT]
> You MUST run [fix-security-hardened.sql](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/fix-security-hardened.sql) in Supabase SQL Editor.

- **Search Path Hardening**: Set `search_path = public` on all database functions to prevent search path hijacking.
- **Notifications RLS**: Restricted `INSERT`, `UPDATE`, and `DELETE` on the `notifications` table to the owner (`auth.uid() = user_id`). Removed `USING (true)` policies.

### 🔴 Fix #14: Profile Saving Stability

Refactored `updateProfile` and `setCurrentProfile` in `app-context.tsx`:
- Removed unstable async IIFE inside `setState`.
- Properly `await` Supabase synchronization before completing the callback.
- Added safety fallbacks for `name` field to prevent `NOT NULL` violations.
- Fixed a data loss bug where failing image uploads could delete photos from the cloud profile.

### 🟠 Fix #15: cPanel Adaptive Startup

Fixed "Adaptive Startup Failed" on Litespeed/cPanel servers by updating the `index.js` loader:
- Correctly locates the `tsx` register file even after `package.json` was moved to the `backend/` subdirectory.
- Added graceful fallbacks for different server environments.

### 🔵 Fix #16: Backend Dependency Isolation

Created a dedicated `package.json` inside the `backend/` directory to resolve `ERESOLVE` peer dependency conflicts between Expo (React 18/19) and Hono/tRPC backend utilities.

---

## 🚀 Post-Fix Checklist

- [ ] Run [fix-rls-policies.sql](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/fix-rls-policies.sql)
- [ ] Run [fix-security-hardened.sql](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/fix-security-hardened.sql)
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` to production [.env](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/.env)
- [ ] Add `ARIFPAY_WEBHOOK_SECRET` to production [.env](file:///c:/Users/kirub/OneDrive/Desktop/zewijunaapp/.env)
- [ ] Run `npx expo install --check`
- [ ] Test the full profile edit flow (Name, Bio, Photos)
- [ ] Perform a final payment test to verify webhook verification
- [ ] Push build to Expo using `eas build`

