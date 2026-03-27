# APK & iOS Build Guide for Dating App

This comprehensive guide will walk you through building Android APK and iOS IPA files for your dating app using Expo.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Test Mode Configuration](#test-mode-configuration)
3. [Building for Android (APK)](#building-for-android-apk)
4. [Building for iOS](#building-for-ios)
5. [Testing Your Build](#testing-your-build)
6. [Distribution](#distribution)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **Expo CLI**
   ```bash
   npm install -g expo-cli
   ```

3. **EAS CLI** (Expo Application Services)
   ```bash
   npm install -g eas-cli
   ```

4. **Expo Account**
   - Sign up at: https://expo.dev/signup
   - Login: `eas login`

### Project Setup

Ensure all dependencies are installed:
```bash
npm install
# or
bun install
```

---

## Test Mode Configuration

The app is currently configured in **TEST MODE**, which means:
- ✅ All premium features work without payment
- ✅ Unlimited messages, swipes, and profile views
- ✅ All filters and incognito mode enabled for free tier
- ✅ Perfect for testing and getting user feedback

### Switching Between Test and Production Mode

**Location:** `hooks/membership-context.tsx`

**Line 8:**
```typescript
const TEST_MODE = true;  // Change to false for production
```

**Test Mode (Current - for user testing):**
```typescript
const TEST_MODE = true;
```

**Production Mode (When ready to charge users):**
```typescript
const TEST_MODE = false;
```

### What Changes Between Modes?

| Feature | Test Mode | Production Mode |
|---------|-----------|-----------------|
| Free Tier Messages | 99,999/day | 5/day |
| Free Tier Swipes | Unlimited | 50/day |
| Free Tier Views | Unlimited | 10/day |
| Incognito (Free) | ✅ Enabled | ❌ Disabled |
| Advanced Filters (Free) | ✅ Enabled | ❌ Disabled |

---

## Building for Android (APK)

### Step 1: Configure app.json

Ensure your `app.json` has proper Android configuration:

```json
{
  "expo": {
    "name": "YourAppName",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "android": {
      "package": "com.yourcompany.appname",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "CAMERA",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION"
      ]
    }
  }
}
```

### Step 2: Configure EAS Build

Create `eas.json` in your project root:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Step 3: Initialize EAS

Run this command once:

```bash
eas build:configure
```

This will:
- Create/update `eas.json`
- Link your project to your Expo account
- Generate necessary credentials

### Step 4: Build APK

**For Preview/Testing Build:**
```bash
eas build --platform android --profile preview
```

**For Production Build:**
```bash
eas build --platform android --profile production
```

### Step 5: Wait for Build

- The build happens on Expo's servers (no local Android Studio needed!)
- You'll see progress in the terminal
- Typical build time: 10-20 minutes
- You can close the terminal - build continues in the cloud

### Step 6: Download APK

Once complete, you'll get:
- A download link in the terminal
- An email notification
- Access via: https://expo.dev/accounts/[your-account]/projects/[your-project]/builds

**Download the APK file** and you're done!

---

## Building for iOS

### Prerequisites for iOS

- **Apple Developer Account** ($99/year)
  - Sign up: https://developer.apple.com/programs/
- **EAS CLI** installed (already done above)

### Step 1: Configure app.json for iOS

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.appname",
      "buildNumber": "1",
      "supportsTablet": true
    }
  }
}
```

### Step 2: Build iOS App

**For Internal Testing (Ad Hoc):**
```bash
eas build --platform ios --profile preview
```

**For App Store Submission:**
```bash
eas build --platform ios --profile production
```

### Step 3: Manage Credentials

EAS will prompt you to:
- Create/select signing certificates
- Create/select provisioning profiles
- Register devices (for Ad Hoc builds)

Choose "Let Expo handle it" for easiest setup.

### Step 4: Download IPA

Once complete:
- Download the `.ipa` file
- Install via TestFlight (for App Store builds)
- Install via Apple Configurator (for Ad Hoc builds)

---

## Testing Your Build

### Android Testing

**Method 1: Direct Install**
1. Transfer APK to Android device
2. Enable "Install from Unknown Sources" in Settings
3. Tap APK file to install
4. Open and test!

**Method 2: Share via Link**
```bash
eas build --platform android --profile preview --auto-submit
```
- Generates a shareable link
- Users can install directly from browser

### iOS Testing

**Method 1: TestFlight (Recommended)**
1. Submit build to TestFlight
2. Invite testers via email
3. Testers install TestFlight app
4. They download your app from TestFlight

**Method 2: Ad Hoc (Limited devices)**
1. Register device UDIDs in Apple Developer
2. Build with preview profile
3. Install via Apple Configurator or Xcode

---

## Distribution

### Android Distribution Options

**1. Google Play Store (Recommended)**
```bash
eas submit --platform android
```

**2. Direct APK Distribution**
- Upload APK to your website
- Share via email/messaging
- Use Firebase App Distribution

**3. Alternative Stores**
- Amazon Appstore
- Samsung Galaxy Store
- Huawei AppGallery

### iOS Distribution Options

**1. Apple App Store (Recommended)**
```bash
eas submit --platform ios
```

**2. TestFlight (Beta Testing)**
- Automatic with App Store builds
- Support up to 10,000 testers

**3. Enterprise Distribution**
- Requires Apple Enterprise account ($299/year)
- Distribute to unlimited internal users

---

## Troubleshooting

### Common Android Issues

**Issue: "Build failed with gradle error"**
```bash
# Clear cache and rebuild
eas build --platform android --profile preview --clear-cache
```

**Issue: "Package name already exists"**
- Change `android.package` in app.json to unique value
- Format: `com.yourcompany.uniquename`

**Issue: "APK won't install"**
- Enable "Install from Unknown Sources"
- Check Android version compatibility
- Ensure enough storage space

### Common iOS Issues

**Issue: "No provisioning profile found"**
```bash
# Revoke and regenerate credentials
eas credentials
```

**Issue: "Build requires Apple Developer membership"**
- You must have an active Apple Developer account ($99/year)
- Cannot be bypassed for iOS builds

**Issue: "Device not registered"**
- Add device UDID in Apple Developer Portal
- Rebuild with updated provisioning profile

### General Build Issues

**Issue: "Out of memory during build"**
```json
// Add to eas.json
{
  "build": {
    "production": {
      "node": "18.0.0",
      "resourceClass": "large"
    }
  }
}
```

**Issue: "Dependencies failing to install"**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

**Issue: "Environment variables not working"**
```bash
# Add secrets via EAS
eas secret:create --name SECRET_NAME --value "secret_value"
```

---

## Quick Commands Cheat Sheet

```bash
# Login to Expo
eas login

# Configure EAS for first time
eas build:configure

# Build Android APK (Preview)
eas build --platform android --profile preview

# Build Android APK (Production)
eas build --platform android --profile production

# Build iOS (Preview)
eas build --platform ios --profile preview

# Build both platforms
eas build --platform all --profile production

# Check build status
eas build:list

# Submit to stores
eas submit --platform android
eas submit --platform ios

# View credentials
eas credentials

# Clear cache and rebuild
eas build --clear-cache
```

---

## Important Notes

### Before Building

- ✅ Test thoroughly on Expo Go app first
- ✅ Update version numbers in app.json
- ✅ Configure proper app icons and splash screens
- ✅ Set up environment variables
- ✅ Test on both Android and iOS devices
- ✅ Decide if you want TEST_MODE enabled or disabled

### After Building

- ✅ Test the APK/IPA on multiple devices
- ✅ Check all features work (payments, camera, location, etc.)
- ✅ Verify push notifications work
- ✅ Test deep linking and share functionality
- ✅ Get feedback from beta testers
- ✅ When ready, switch TEST_MODE to false for production

### Cost Summary

**Free:**
- Building with EAS (limited builds per month)
- Google Play Console first year

**Paid:**
- Apple Developer Account: $99/year
- Google Play Console: $25 one-time
- EAS Pro (unlimited builds): $29/month (optional)

---

## Next Steps

1. **Build Preview APK**: Test on real Android devices
2. **Build iOS TestFlight**: Test on real iPhones
3. **Gather User Feedback**: Keep TEST_MODE enabled
4. **Iterate & Improve**: Based on feedback
5. **Switch to Production**: Change TEST_MODE to false
6. **Submit to Stores**: Use `eas submit`

---

## Support Resources

- **Expo Documentation**: https://docs.expo.dev/
- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Expo Forums**: https://forums.expo.dev/
- **Discord Community**: https://chat.expo.dev/

---

## Success Checklist

Before submitting to app stores:

- [ ] Tested in TEST_MODE with real users
- [ ] Collected and implemented feedback
- [ ] Switched TEST_MODE to false
- [ ] Configured payment processing (ArifPay)
- [ ] Added privacy policy and terms of service
- [ ] Configured app icons and splash screens
- [ ] Set up push notifications
- [ ] Tested all premium features work correctly
- [ ] Verified payment flow works end-to-end
- [ ] Created app store screenshots and descriptions
- [ ] Increased version number in app.json
- [ ] Built and tested final APK/IPA
- [ ] Ready to submit! 🚀

---

**Good luck with your app launch! 🎉**
