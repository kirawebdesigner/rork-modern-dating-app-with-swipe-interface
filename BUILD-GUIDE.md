# Build Guide - Generate APK & iOS Builds

## Current Status: Test Mode Active ✅

Your app is currently in **TEST MODE** for payments:
- Users can upgrade to any tier instantly without payment
- No ArifPay integration required for testing
- Perfect for gathering user feedback

---

## Building Your App

### Prerequisites

1. **Install EAS CLI** (if not already installed)
```bash
npm install -g eas-cli
```

2. **Login to Expo**
```bash
eas login
```

---

## Option 1: Development Build (Recommended for Testing)

Development builds include developer tools and can be installed on any device for testing.

### For Android (APK)

```bash
# Build an APK for Android
eas build --platform android --profile preview
```

**What happens:**
- Builds a development APK
- Can be shared with testers
- Includes all features for testing
- Download link provided after build completes

### For iOS

```bash
# Build for iOS Simulator (Mac only)
eas build --platform ios --profile preview

# Build for iOS devices (requires Apple Developer account)
eas build --platform ios --profile preview --local
```

---

## Option 2: Production Build (For App Stores)

### Android Production APK/AAB

```bash
# Generate production Android build
eas build --platform android --profile production
```

### iOS Production Build

```bash
# Generate production iOS build
eas build --platform ios --profile production
```

**Note:** Production builds require:
- Proper signing credentials
- App Store/Play Store accounts
- Configured app identifiers

---

## Quick Testing Method (Expo Go)

For the fastest testing without building:

1. Make sure your app works with Expo Go
2. Users scan QR code from:
```bash
npx expo start
```

**Limitations:**
- Can't use custom native modules
- Internet connection required
- Limited to Expo Go supported features

---

## Sharing Your APK

After building, you'll receive:
- Direct download link (valid for 30 days)
- QR code for easy installation
- Can share link via email/messaging

### Installing APK on Android:
1. Download APK from EAS link
2. Enable "Install from Unknown Sources" in Android settings
3. Open APK file and install

---

## Important Notes

### Test Mode vs Production Mode

**Current Setup (Test Mode):**
```typescript
// backend/trpc/routes/membership/upgrade/route.ts
// Lines 24-55: Direct upgrade without payment
return {
  success: true,
  newTier: input.tier,
  requiresPayment: false,
  testMode: true,
};
```

**For Production:**
You'll need to:
1. Remove the test mode logic (lines 33-55)
2. Uncomment the payment code (lines 58-169)
3. Configure ArifPay credentials
4. Set up webhook endpoints

### Environment Variables

Make sure these are set in your Expo project:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_ARIFPAY_API_KEY` (for production)

---

## Build Configuration

Your builds use settings from `app.json`:
- **Package name:** Check `android.package` and `ios.bundleIdentifier`
- **App name:** Set in `name` field
- **Version:** Update `version` field
- **Icons:** Located in `assets/images/`

---

## Troubleshooting

### Build Fails
- Check that all dependencies are installed
- Verify app.json is valid JSON
- Ensure no TypeScript errors: `npx expo-doctor`

### Can't Install APK
- Enable "Unknown Sources" in Android settings
- Make sure APK architecture matches device (arm64-v8a recommended)

### iOS Build Issues
- Requires Mac for local builds
- Need Apple Developer account ($99/year)
- Must configure provisioning profiles

---

## Getting User Feedback

With test mode active:
1. Build and share your APK/iOS build
2. Users can test all premium features for free
3. Collect feedback on UX, bugs, performance
4. Iterate based on feedback
5. Enable production mode when ready to monetize

---

## Next Steps: Switching to Production

When ready to go live:

1. **Contact me to enable production mode**
   - I'll update the payment integration
   - Enable real ArifPay flow
   - Set up proper webhook handling

2. **Test Payment Flow**
   - Use ArifPay test credentials
   - Verify webhook notifications
   - Confirm tier upgrades work

3. **Deploy to Stores**
   - Submit to Google Play Store
   - Submit to Apple App Store
   - Monitor payment transactions

---

## Support

For build-related issues:
- Check Expo documentation: https://docs.expo.dev/build/introduction/
- EAS Build status: https://expo.dev/accounts/[your-account]/projects/[your-project]/builds

For app-specific issues:
- Contact me for assistance
- Check console logs for errors
- Test on multiple devices

---

**Current Status Summary:**
✅ Test mode enabled - upgrades work instantly
✅ Ready for APK/iOS build generation
✅ Perfect for user testing and feedback
🔄 Switch to production mode when ready to monetize
