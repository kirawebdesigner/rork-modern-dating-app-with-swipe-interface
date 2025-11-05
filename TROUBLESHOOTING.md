# Troubleshooting Guide

## Quick Diagnostics

### 1. Check Backend Connection

Open your app and check the console. You should see:
```
[tRPC] Using base URL: http://localhost:8081 api: http://localhost:8081/api/trpc
```

If you see `https://your-app.com`, update your `env` file.

### 2. Test Backend Directly

In your browser or with curl:
```bash
# Test if backend is running
curl http://localhost:8081/

# Should return: {"status":"ok","message":"API is running"}
```

### 3. Test tRPC Endpoint

```bash
# Test tRPC endpoint
curl http://localhost:8081/api/trpc

# Should return tRPC response (not 404)
```

### 4. Check Phone Number Format

The phone number should be:
- ✅ GOOD: `251912345678`
- ✅ GOOD: `0912345678` (will be converted to 251912345678)
- ❌ BAD: `+251912345678`
- ❌ BAD: `251 912 345 678`

### 5. Test Payment Creation

Add this to your console in the app:
```javascript
// In app/premium.tsx, add before handleUpgrade:
console.log('[Debug] tRPC URL:', apiUrl);
console.log('[Debug] User phone:', userPhone);
console.log('[Debug] Selected tier:', selectedTier);
```

## Common Errors

### Error: "Failed to fetch"

**Cause 1: Backend not running**
```bash
# Solution: Start the backend
npm start
```

**Cause 2: Wrong API URL**
```bash
# Check env file
cat env | grep EXPO_PUBLIC_API_URL

# Should show: EXPO_PUBLIC_API_URL=http://localhost:8081
# NOT: EXPO_PUBLIC_API_URL=https://your-app.com
```

**Cause 3: Network firewall**
```bash
# On Mac/Linux, check if port 8081 is accessible:
lsof -i :8081

# Should show a process running on port 8081
```

**Cause 4: Device can't reach computer**
- For physical devices: Use `--tunnel` flag when starting
- Check that device is on same WiFi network
- Try accessing http://YOUR_COMPUTER_IP:8081 from device browser

### Error: "Unexpected text node: ."

This should be fixed now, but if it persists:

1. **Check for stray text:**
   ```jsx
   // ❌ BAD - This can cause text node errors
   <View>
     Some text here
   </View>

   // ✅ GOOD
   <View>
     <Text>Some text here</Text>
   </View>
   ```

2. **Check conditional rendering:**
   ```jsx
   // ❌ BAD - Can produce text nodes
   {condition && <Component />}

   // ✅ GOOD
   {condition ? <Component /> : null}
   ```

3. **Check for emojis in JSX:**
   ```jsx
   // ❌ BAD - Emojis in JSX can cause issues
   <Text>💳 Payment</Text>

   // ✅ GOOD - Use plain text
   <Text>Payment</Text>
   ```

### Error: Payment URL not opening

**On Web:**
```javascript
// Check browser console for popup blocker
// Allow popups for localhost:8081
```

**On Mobile:**
```javascript
// Check if expo-web-browser is installed
import * as WebBrowser from 'expo-web-browser';

// If error about WebBrowser, install it:
// bun expo install expo-web-browser
```

### Error: Webhook not received

**Local Development:**
```bash
# Use ngrok to expose local server
npx ngrok http 8081

# Update notifyUrl in backend to use ngrok URL
# Example: https://abc123.ngrok.io/webhooks/arifpay
```

**Check Webhook Endpoint:**
```bash
# Test webhook endpoint exists
curl -X POST http://localhost:8081/webhooks/arifpay \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Should return 200 OK (not 404)
```

## Debugging Steps

### Step 1: Enable Verbose Logging

Add to `backend/trpc/routes/membership/upgrade/route.ts`:
```typescript
console.log('[DEBUG] Input:', JSON.stringify(input, null, 2));
console.log('[DEBUG] Context headers:', ctx.req.headers);
console.log('[DEBUG] Base URL:', baseUrl);
```

### Step 2: Check ArifPay Response

The backend logs should show:
```
[Arifpay] Creating CBE direct payment with payload: {...}
[Arifpay] CBE Raw response: {...}
[Arifpay] CBE Parsed response: {...}
```

If you see errors here, check:
- ArifPay API key is correct
- ArifPay account number is correct
- Phone number format is correct

### Step 3: Check Frontend Response

The app console should show:
```
[Premium] Creating payment for tier: gold
[Premium] Phone: 251912345678
[Premium] Payment method: CBE
[Premium] Mutation result: { requiresPayment: true, paymentUrl: "https://..." }
[Premium] Opening payment URL: https://checkout.arifpay.org/...
```

### Step 4: Test Payment Flow

1. Open payment URL manually in browser
2. Check if ArifPay checkout page loads
3. If page loads, issue is with URL opening, not payment creation
4. If page doesn't load, issue is with ArifPay session

## Quick Fixes

### Fix 1: Reset Development Server
```bash
# Stop the server (Ctrl+C)
# Clear Metro cache
rm -rf .expo
rm -rf node_modules/.cache

# Restart
npm start
```

### Fix 2: Update Dependencies
```bash
bun install
```

### Fix 3: Check TypeScript Errors
```bash
bunx expo start
# Look for TypeScript errors in console
```

### Fix 4: Test Backend Separately
```bash
# Create a test file: test-backend.js
const result = await fetch('http://localhost:8081/api/trpc/membership.upgrade', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tier: 'gold',
    phone: '251912345678',
    paymentMethod: 'CBE'
  })
});

console.log(await result.json());
```

## Still Having Issues?

1. **Check the logs:**
   - Backend console logs
   - App console logs (React Native Debugger or browser console)
   - Network tab in browser DevTools

2. **Verify configuration:**
   ```bash
   # Check all environment variables
   cat env
   
   # Verify they're loaded
   # In app, add: console.log(process.env)
   ```

3. **Test components individually:**
   - Test tRPC connection only
   - Test payment creation only
   - Test URL opening only

4. **Ask for help with:**
   - Full error message from console
   - Backend logs
   - Network request/response from DevTools
   - Environment configuration

## Additional Resources

- **ArifPay Docs:** https://developer.arifpay.net/
- **tRPC Docs:** https://trpc.io/docs
- **Expo Router Docs:** https://docs.expo.dev/router/introduction/
- **React Native Web Browser:** https://docs.expo.dev/versions/latest/sdk/webbrowser/
