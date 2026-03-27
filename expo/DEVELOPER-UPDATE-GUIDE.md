# 🚀 Zewijuna App Update Guide

This guide explains how to send updates to your users. There are two ways to do this:

## 1. Fast Updates (Over-The-Air / OTA) ⚡
Use this for JS-only changes (fixing bugs, changing text, updating styles). **Users get the fix automatically** when they restart the app or after a few minutes of usage. No new APK download required!

### How to send an OTA update:
Run this command in your terminal:
```bash
eas update --branch production --message "Fixed swipe limits and chat bugs"
```

---

## 2. Full App Updates (New APK) 📦
Use this for major changes or when you update high-level app settings (permissions, app name, icons, splash screen).

### Step A: Bump the Version
I already bumped your version to `1.0.1` in `app.json`. For future updates, increment this number (e.g., `1.0.2`).

### Step B: Build the APK
I have already started a build for you. To build again in the future:
```bash
# For a preview/test APK
eas build --platform android --profile preview

# Or for the production APK
eas build --platform android --profile production
```

### Step C: Host on Your Website (Professional Link) 🌐
Instead of giving users the ugly Expo link, you can host it on your own server:
1. **Download** the APK from the Expo dashboard once it finishes.
2. **Rename** it to something clean like `zewijuna_v1.0.1.apk`.
3. **Upload** it to your website's public folder (e.g., using FTP or your cPanel).
4. Your new professional link will look like: `https://yourwebsite.com/zewijuna_v1.0.1.apk`.

### Step D: Notify Users in the App
Once you have your professional URL:
1. Go to your **Supabase Dashboard**.
2. Go to the `app_versions` table.
3. Insert a new row:
   - `version`: `1.0.1`
   - `apk_url`: `https://yourwebsite.com/zewijuna_v1.0.1.apk` (Your new link!)
   - `release_notes`: "Improved matching and fixed swipe limits!"
   - `force_update`: `false`


---

## 💡 Pro Tip
Check your build status anytime by running:
```bash
eas build:list
```
Or visiting: https://expo.dev/accounts/zewijuna/projects/zewijuna-halal-muslim-dating-app/builds
