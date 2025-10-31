# 🔧 Supabase Connection Error Fix

## The Problem

You're seeing this error:
```
[Auth] fetchProfileByPhone error: { "message": "TypeError: Failed to fetch" }
```

This means your app **cannot connect to the Supabase database**. This happens because:

1. **Your Supabase project is PAUSED** ⏸️ (most likely)
2. **The database tables don't exist yet** 🗄️
3. **Network/firewall blocking the connection** 🔥

---

## ✅ Solution: Resume & Setup Your Supabase Project

### Step 1: Resume Your Supabase Project (if paused)

1. Go to: **https://supabase.com/dashboard**
2. Log in to your account
3. Find your project: **nizdrhdfhddtrukeemhp** (or the project called "Zewijuna" or similar)
4. If you see a **"Project Paused"** message:
   - Click **"Resume Project"** or **"Restore Project"**
   - Wait 1-2 minutes for it to wake up
5. If you see **"Project Active"** ✅ - Good! Move to Step 2

> **Note**: Free tier Supabase projects auto-pause after 1 week of inactivity

---

### Step 2: Verify Your Database Tables Exist

1. In your Supabase Dashboard, click **"Table Editor"** (left sidebar)
2. Check if you see these tables:
   - `profiles`
   - `memberships`
   - `swipes`
   - `matches`
   - `messages`
   - `conversations`
   - `interests`

3. **If tables are MISSING**: Run the database schema

#### How to Run Database Schema:

1. In Supabase Dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"+ New Query"**
3. Copy the entire contents of your `database-schema.sql` file
4. Paste it into the SQL editor
5. Click **"Run"** (or press Ctrl+Enter)
6. Wait for: ✅ "Success. No rows returned"
7. Go back to **Table Editor** and verify tables now exist

---

### Step 3: Test the Connection

After resuming your project and creating tables:

1. **Restart your app completely**:
   - Close the app
   - Stop the development server (Ctrl+C)
   - Clear cache: `npm start -- --clear` or `bun start --clear`
   - Restart your app

2. **Try logging in again**:
   - The "Failed to fetch" error should be gone
   - You should be able to create an account or log in

---

## 🔍 How to Know If It's Working

After the fix, you should see in your console logs:
```
[Supabase] Connection test successful
[Auth] Profile found successfully
```

Instead of:
```
[Auth] fetchProfileByPhone error: TypeError: Failed to fetch
```

---

## 🆘 Still Having Issues?

### Check #1: Is your Supabase URL correct?

Your app is configured to use:
- URL: `https://nizdrhdfhddtrukeemhp.supabase.co`
- This is set in `app.json` under `extra`

If this URL is wrong, you need to:
1. Create a new Supabase project at https://supabase.com
2. Get your project URL and anon key
3. Update `app.json`:
   ```json
   "extra": {
     "NEXT_PUBLIC_SUPABASE_URL": "your-actual-url",
     "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-actual-key"
   }
   ```

### Check #2: Is RLS (Row Level Security) blocking you?

1. Go to **SQL Editor** in Supabase
2. Run this query:
   ```sql
   SELECT tablename, policyname 
   FROM pg_policies 
   WHERE schemaname = 'public';
   ```
3. You should see policies like "Allow all on profiles"
4. If you see nothing, re-run your `database-schema.sql`

### Check #3: Network/Firewall Issues

- Try accessing https://nizdrhdfhddtrukeemhp.supabase.co in your browser
- If it doesn't load or shows error → Project is paused or doesn't exist
- If it loads with a Supabase page → Project is active, check tables

---

## 📋 Quick Checklist

- [ ] Resume Supabase project (if paused)
- [ ] Verify project is active (green status)
- [ ] Run `database-schema.sql` to create tables
- [ ] Verify all 12 tables exist in Table Editor
- [ ] Restart your development server completely
- [ ] Test signup/login in your app
- [ ] Check console logs for "Connection test successful"

---

## 🎯 Expected Behavior After Fix

✅ **Signup**: Should create account and save to Supabase
✅ **Login**: Should find existing account and load profile
✅ **Profile Setup**: Should save and persist data
✅ **Premium Upgrade**: Should work with ArifPay payment
✅ **Messages**: Should send and receive properly

---

**Next**: Once Supabase is working, all features should function properly!
