# Database Migration Guide

## Fresh Installation

If this is a new project, simply run `database-schema.sql` in your Supabase SQL Editor.

## Migrating from Phone-Based Auth

If you have an existing database with phone-based authentication, follow these steps:

### Step 1: Backup Your Data

```sql
-- Backup existing profiles
CREATE TABLE profiles_backup AS SELECT * FROM profiles;

-- Backup existing memberships
CREATE TABLE memberships_backup AS SELECT * FROM memberships;
```

### Step 2: Update Profile Structure

```sql
-- Add email column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Link profiles to auth.users
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_pkey CASCADE,
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (id),
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### Step 3: Migrate Existing Users

For each existing user:

1. Create auth user via Supabase Dashboard or Auth API
2. Update profile with new UUID and email
3. Update membership with new user_id

```sql
-- Example migration for a single user
UPDATE profiles 
SET id = '(new-auth-uuid)', email = 'user@example.com'
WHERE phone = '251912345678';

UPDATE memberships
SET user_id = '(new-auth-uuid)', email = 'user@example.com'
WHERE phone_number = '251912345678';
```

### Step 4: Clean Up

```sql
-- Remove backup tables after verifying migration
DROP TABLE IF EXISTS profiles_backup;
DROP TABLE IF EXISTS memberships_backup;
```

## Key Changes

1. **Profile ID**: Now references `auth.users(id)` instead of auto-generated UUID
2. **Email Field**: Primary identifier (phone is optional)
3. **Authentication**: Handled by Supabase Auth
4. **Triggers**: Automatically create profile/membership on signup

## Verification

After migration, verify:

```sql
-- Check profiles are linked to auth
SELECT p.id, p.email, p.name, au.email as auth_email
FROM profiles p
JOIN auth.users au ON p.id = au.id
LIMIT 10;

-- Check memberships are correct
SELECT m.user_id, m.email, m.tier, p.name
FROM memberships m
JOIN profiles p ON m.user_id = p.id
LIMIT 10;

-- Test new user creation
-- Sign up via app, then check:
SELECT * FROM profiles WHERE email = 'test@example.com';
SELECT * FROM memberships WHERE email = 'test@example.com';
```
