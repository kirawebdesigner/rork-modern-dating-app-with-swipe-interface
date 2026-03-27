# 📱 Build Guide - Generate APK for Testing

## ✅ Test Mode Active

Your app is ready for testing! Here's what's enabled:
- ✅ **Instant upgrades** - Users can test all premium tiers without payment
- ✅ **Full features** - All app features work seamlessly
- ✅ **Profile setup** - Complete onboarding flow
- ✅ **No payment required** - Perfect for gathering user feedback

---

## 🚀 Quick Start: Generate APK

### Step 1: Install EAS CLI

Open your terminal and run:

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

Enter your Expo credentials (create an account at expo.dev if you don't have one).

### Step 3: Build Android APK

```bash
eas build --platform android --profile preview
```

**What happens:**
1. EAS will ask if you want to generate a new keystore → Select **Yes**
2. Build starts on Expo's servers (takes 10-15 minutes)
3. You'll get a download link when it's done
4. APK can be installed on any Android device

### Step 4: Download & Share

Once the build completes:
- 📥 Download the APK from the provided link
- 📤 Share the link with testers via email/messaging
- ⏰ Link is valid for 30 days

---

## 📲 Installing APK on Android

### For Testers:

1. **Download APK** from the link you received
2. **Enable installation from unknown sources**:
   - Go to Settings → Security
   - Enable "Install from Unknown Sources" or "Install Unknown Apps"
3. **Open the APK file** and tap Install
4. **Launch the app** and start testing!

---

## 🍎 Building for iOS (Optional)

### iOS Simulator (Mac only):

```bash
eas build --platform ios --profile preview
```

### iOS Devices (requires Apple Developer account $99/year):

```bash
eas build --platform ios --profile production
```

**Note:** iOS builds are more complex and require:
- Mac computer (for local builds)
- Apple Developer account
- Provisioning profiles setup

---

## 🔍 Checking Build Status

You can monitor your build progress:

1. **In terminal** - Shows real-time progress
2. **On Expo website** - Visit: https://expo.dev/accounts/[your-account]/projects
3. **Via email** - You'll receive notifications

### Common Build Times:
- Android APK: 10-15 minutes
- iOS: 15-20 minutes

---

## 🧪 Testing Your App

### What Testers Can Do:

✅ **Create account** - Full signup/login flow
✅ **Complete profile** - Setup profile with photos, interests
✅ **Discover matches** - Swipe through profiles
✅ **Upgrade tiers** - Test Silver/Gold/VIP (no payment needed)
✅ **Send messages** - Chat functionality
✅ **View likes** - See who liked them
✅ **Change settings** - Filters, preferences, language

### Test Mode Features:

- **Instant upgrades**: Click upgrade → Immediately get premium features
- **No payment forms**: Users never see payment screens
- **All features unlocked**: Can test everything for free
- **Reset anytime**: Uninstall/reinstall to start fresh

---

## 📊 Gathering Feedback

### Key Areas to Test:

1. **Onboarding Flow**
   - Signup/login process
   - Profile setup steps
   - Photo upload

2. **Core Features**
   - Swiping/discovering profiles
   - Matching system
   - Messaging

3. **Premium Features**
   - Upgrade flow (test mode)
   - Advanced filters
   - Unlimited features

4. **Performance**
   - App speed
   - Smooth animations
   - No crashes

### Collecting Bug Reports:

Ask testers to report:
- What they were doing when issue occurred
- Screenshots of errors
- Device model and Android version

---

## ⚙️ Current Configuration

### Test Mode Status:

```
✅ Backend: Test mode enabled
✅ Premium upgrades: Work instantly without payment
✅ Profile setup: Fully functional
✅ All features: Available for testing
```

### Files Modified for Test Mode:

1. **backend/trpc/routes/membership/upgrade/route.ts**
   - Bypasses payment gateway
   - Grants upgrades immediately
   - Updates database correctly

2. **app/premium.tsx**
   - Shows success message after upgrade
   - No payment screens
   - Syncs tier instantly

3. **app/profile-setup.tsx**
   - Fixed navigation issues
   - Confirmation dialogs
   - Success notifications

---

## 🔄 Switching to Production Mode (Later)

### When You're Ready to Accept Real Payments:

**Don't worry about this now!** When you want to enable real payments:

1. **Contact me** and I'll help you:
   - Enable ArifPay integration
   - Set up webhook notifications
   - Configure production environment
   - Test payment flow

2. **Required for production:**
   - ArifPay API key
   - Production Supabase credentials
   - Webhook URL setup
   - Payment testing with real transactions

### Environment Variables (Already Set):

✅ `EXPO_PUBLIC_SUPABASE_URL` - Database connection
✅ `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Database auth
✅ Test mode active - No payment keys needed yet

---

## ⚠️ Troubleshooting Common Issues

### "Build Failed" Error

**Solution:**
```bash
# Check for errors
npx expo-doctor

# Fix dependencies
npm install

# Try building again
eas build --platform android --profile preview
```

### "Can't Install APK" on Android

**Solution:**
1. Go to **Settings** → **Security**
2. Enable **"Install from Unknown Sources"**
3. Or enable for specific app (Chrome, Files, etc.)
4. Try installing again

### "Expired Build Link"

**Solution:**
Links expire after 30 days. Rebuild:
```bash
eas build --platform android --profile preview
```

### "App Crashes on Launch"

**Solution:**
1. Uninstall the app completely
2. Restart device
3. Install latest APK
4. Check if issue persists
5. Send me error logs/screenshots

---

## 📱 App Configuration

Your app settings (in `app.json`):
- **App Name:** See `name` field
- **Version:** See `version` field  
- **Package:** See `android.package`
- **Icons:** Located in `assets/images/`

To update version before building:
1. Open `app.json`
2. Change `"version": "1.0.0"` to `"1.0.1"` (or next version)
3. Build again

---

## 🎯 Next Steps

### Now (Testing Phase):

1. ✅ **Build APK** using steps above
2. ✅ **Share with testers** (friends, beta users)
3. ✅ **Collect feedback** on bugs, UX, features
4. ✅ **Iterate** and improve based on feedback
5. ✅ **Rebuild** as you make changes

### Later (Production Phase):

When you have enough feedback and want to go live:

1. 💰 **Enable real payments** (I'll help you with ArifPay setup)
2. 🏪 **Submit to app stores** (Google Play, Apple App Store)
3. 📈 **Launch and monitor** user signups and payments
4. 🔧 **Maintain and update** based on user needs

---

## 📞 Support & Help

### For Build Issues:
- **Expo Documentation**: https://docs.expo.dev/build/introduction/
- **Check build status**: https://expo.dev (login to see your builds)
- **Expo Discord**: Community support

### For App-Specific Help:
- **Contact me** for assistance with:
  - Payment integration
  - Feature additions
  - Bug fixes
  - Production deployment

---

## ✅ Checklist: You're Ready When...

- [ ] You have an Expo account
- [ ] EAS CLI is installed (`npm install -g eas-cli`)
- [ ] You've run `eas login`
- [ ] You've run `eas build --platform android --profile preview`
- [ ] Build completed successfully
- [ ] You downloaded the APK
- [ ] You tested it on your device
- [ ] You shared it with testers

---

## 🎉 Summary

**Your app is 100% ready for testing!**

✅ **Test mode active** - All premium features work without payment
✅ **Profile setup fixed** - Users can complete onboarding smoothly  
✅ **Build guide ready** - Follow steps above to generate APK
✅ **Production ready** - When you're ready, we'll enable real payments

**Questions?** Reach out anytime for help with building, testing, or going to production!
