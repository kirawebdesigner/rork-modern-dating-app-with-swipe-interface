# Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment

Edit the `env` file with your credentials:

```env
ARIFPAY_API_KEY=your_api_key
ARIFPAY_ACCOUNT_NUMBER=your_account
ARIFPAY_BASE_URL=https://gateway.arifpay.net
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
PORT=8081
```

### 3. Setup Database

Run `database-schema.sql` in your Supabase SQL Editor.

### 4. Start Backend

```bash
bun backend/hono.ts
```

Backend runs on http://localhost:8081

### 5. Start App

```bash
bun expo start
```

## Authentication

- Email-based authentication via Supabase Auth
- Login: `app/(auth)/login.tsx`
- Signup: `app/(auth)/signup.tsx`

## Payments

- ArifPay integration for premium subscriptions
- Supported methods: CBE, TeleBirr, Amole
- Tiers: Free, Silver (1600 ETB), Gold (3200 ETB), VIP (4800 ETB)

## Membership Tiers

| Tier | Price | Features |
|------|-------|----------|
| Free | 0 | Basic (5 messages/day) |
| Silver | 1600 ETB/mo | 30 messages/day |
| Gold | 3200 ETB/mo | Unlimited swipes |
| VIP | 4800 ETB/mo | Everything unlimited |

## Project Structure

```
app/          - Screens (Expo Router)
backend/      - Hono + tRPC server
hooks/        - Auth, membership contexts
lib/          - Supabase, tRPC clients
components/   - Reusable UI components
```

## Troubleshooting

**Backend not connecting?**
- Ensure backend is running on port 8081
- Check firewall settings
- Verify environment variables

**Payment failing?**
- Check ArifPay credentials
- Ensure user is logged in
- Verify backend is accessible

**Database errors?**
- Run database-schema.sql
- Check Supabase credentials
- Verify RLS policies
