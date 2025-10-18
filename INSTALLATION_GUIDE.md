# App Installation Guide

## Issue: "App configuration not found for shop" + Login Loop

If you're seeing this error along with a login loop and Firefox "Can't Open This Page" error, it means the app hasn't been properly installed for your shop yet, AND there's an iframe authentication issue.

### Root Cause
The app is trying to redirect to Shopify's login page inside an iframe, which is blocked by the `X-Frame-Options: DENY` header. This creates a login loop where:
1. App loads in iframe
2. Tries to redirect to login inside iframe
3. Browser blocks the redirect
4. Process repeats infinitely

## Step 1: Install the App

1. **Go to your Shopify Admin**
   - Navigate to your Shopify admin panel
   - Go to Apps section

2. **Install the App**
   - Look for "EasyCOD DZ" or your app name
   - Click "Install" or "Add app"
   - Follow the OAuth authorization flow

3. **Alternative Installation URL**
   If you can't find the app in the Apps section, you can install it directly using this URL:
   ```
   https://admin.shopify.com/store/YOUR_STORE_NAME/oauth/install?client_id=78b3b49a43d2ac2ca7e3abaf380e011d
   ```
   Replace `YOUR_STORE_NAME` with your actual store name (without `.myshopify.com`)

4. **Important: Complete Installation in Top-Level Window**
   - When you click the installation link, make sure it opens in a new tab/window
   - Do NOT install from within the iframe
   - Complete the OAuth flow in the main browser window

## Step 2: Verify Installation

After installation, you should be able to:
- Access the app from your Shopify admin
- Use the app proxy functionality
- Submit forms through the app

## Step 3: Debug (if needed)

If you're still having issues, you can run the debug scripts:

```bash
# Verify configuration
node scripts/verify-config.js

# Check all sessions and shop settings (requires DATABASE_URL)
node scripts/debug-sessions.js

# Check specific shop
node scripts/debug-sessions.js cod-form-builder-dev.myshopify.com
```

## Common Issues

### 1. App Not Found in Shopify Admin
- Make sure the app is published in your Shopify Partner Dashboard
- Check that the app URL is correctly configured
- Verify the app is not in draft mode

### 2. OAuth Flow Issues (Login Loop)
- **Clear your browser cache and cookies completely**
- **Try installing in an incognito/private window**
- **Make sure installation happens in top-level window, not iframe**
- Check that your app URL is accessible (not returning errors)
- Verify redirect URL is set to: `https://easycod-dz-1.onrender.com/auth/callback`

### 3. Session Issues
- Sessions expire after a certain time
- If the app was uninstalled and reinstalled, old sessions might be invalid
- Try uninstalling and reinstalling the app

## Technical Details

The app requires:
1. **Session**: Created during OAuth flow, stored in database
2. **Shop Settings**: Created after session exists, contains app configuration
3. **App Proxy**: Configured in Shopify admin to handle form submissions

The error "App configuration not found" occurs when:
- No session exists for the shop (app not installed)
- Session exists but shop settings weren't created (rare initialization issue)

## Support

If you continue to have issues:
1. Check the server logs for more detailed error messages
2. Run the debug script to see the current state
3. Verify your environment variables are correctly set
4. Contact support with the debug output
