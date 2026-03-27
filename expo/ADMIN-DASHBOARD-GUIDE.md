# 💕 Zewijuna Admin Dashboard — Client Guide

## What is the Admin Dashboard?

The Admin Dashboard is a tool that lets you see **real-time analytics** about your Zewijuna dating app — directly from your database. No extra software needed.

You can see:
- ✅ How many users signed up
- ✅ How many are **free** vs **paid** (Silver, Gold, VIP)
- ✅ Total revenue collected
- ✅ Daily/weekly/monthly signup trends
- ✅ User engagement (swipes, matches, messages)
- ✅ Top cities where users are located
- ✅ Revenue breakdown by subscription tier
- ✅ List of recent signups with all their details

---

## 📁 Files You Received

| File | What It Does |
|------|-------------|
| `admin-analytics.sql` | SQL script to set up analytics views in Supabase (run once) |
| `admin-dashboard.html` | The visual dashboard you open in your browser |

---

### Step 1: Open the Dashboard

1. Find the file `admin-dashboard.html` on your computer
2. **Double-click** it — it will open in your web browser (Chrome, Edge, Firefox, etc.)
3. Enter your **Supabase URL**: `https://nizdrhdfhddtrukeemhp.supabase.co`
4. Enter your **Service Role Key** : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pemRyaGRmaGRkdHJ1a2VlbWhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY0MjY1OSwiZXhwIjoyMDcwMjE4NjU5fQ.7tGF3AIDkN6bRuGH_yqfHD5FgLqyh8t-9cpCiPRH8LE'
5. Click **Connect to Dashboard**
6. 🎉 **Done!** You'll see all your app analytics

> The dashboard saves your credentials in your browser, so next time you just double-click the file and it loads automatically.

---

## 📊 What You'll See

### Overview Section
| Metric | Description |
|--------|-------------|
| **Total Users** | Total number of users who signed up |
| **Free Users** | Users on the free tier (percentage shown) |
| **Paid Users** | Users on Silver, Gold, or VIP (conversion rate shown) |
| **Silver / Gold / VIP** | Count of users on each paid tier |
| **Total Revenue** | Total money collected from payments (in ETB) |
| **This Week / Month** | New signups this week and month |
| **Active (24h)** | Users who were active in the last 24 hours |

### Charts
- **Membership Distribution** — Pie chart showing free vs Silver vs Gold vs VIP
- **Gender Distribution** — Pie chart showing male vs female users
- **Daily Signups** — Line chart of signups over the last 30 days
- **Daily Revenue** — Bar chart of revenue over the last 30 days
- **Top Cities** — Horizontal bar chart of where your users are
- **Revenue by Tier** — Bar chart comparing revenue from Silver, Gold, and VIP

### Engagement Section
| Metric | Description |
|--------|-------------|
| **Total Swipes** | Total swipes made by all users |
| **Super Likes** | Total super likes sent |
| **Matches** | Total matches created |
| **Messages** | Total messages sent across all conversations |
| **Profile Views** | Total profile views |
| **Referrals** | Total referral invites used |

### Recent Signups Table
Shows the last 50 users who signed up, with:
- Name, Email, Gender, Age, City
- Membership tier (Free/Silver/Gold/VIP)
- Profile status (Complete/Incomplete)
- Join date

---

## 🔄 How to Refresh Data

- Click the **🔄 Refresh** button in the top-right corner of the dashboard
- The dashboard will reload all data from Supabase

---

## 🔒 Security Notes

1. **Service Role Key is Private** — Don't share it with anyone or post it online
2. **The dashboard is local** — It runs on YOUR computer only, data is fetched directly from Supabase
3. **No data is stored** — The dashboard only reads data, it never modifies anything
4. **Logout clears credentials** — Click "Logout" to clear saved credentials from your browser

---

## ❓ Quick SQL Queries (Optional)

If you prefer, you can also check stats directly in the **Supabase SQL Editor**:

```sql
-- See all stats at a glance
SELECT * FROM public.admin_analytics;

-- Daily signups (last 30 days)
SELECT * FROM public.admin_daily_signups;

-- Revenue by tier
SELECT * FROM public.admin_revenue_by_tier;

-- Recent signups with details
SELECT * FROM public.admin_recent_signups;

-- Top cities
SELECT * FROM public.admin_top_cities;

-- Monthly signup trends
SELECT * FROM public.admin_monthly_signups;
```

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection failed" error | Make sure you're using the **Service Role Key** (not the anon key) |
| Dashboard shows all zeros | Make sure you ran the `admin-analytics.sql` script first |
| Charts not showing | Try refreshing the page (Ctrl+F5) or using Chrome |
| Dashboard won't open | Right-click the file → Open with → Google Chrome |
| Forgot credentials | Click "Logout", then re-enter your URL and key |

---

## 📱 Access from Phone

You can also open this dashboard on your phone:
1. Upload `admin-dashboard.html` to Google Drive
2. Open it in Google Chrome on your phone
3. Enter credentials and view your stats

---

*Dashboard built for Zewijuna Dating App • Last updated: March 2026*
