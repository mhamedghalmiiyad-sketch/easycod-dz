# 401 Unauthorized Error Fix Guide

## Problem Summary
Your Shopify app is experiencing a `401 Unauthorized` error when trying to create draft orders through the App Proxy. The error occurs because the access token stored in your database is invalid, expired, or doesn't have the necessary permissions.

## Root Cause Analysis
The error `❌ GraphQL connection test failed: HttpResponseError: Received an error response (401 Unauthorized) from Shopify` indicates that:

1. **Invalid Access Token**: The token stored in your database for the shop is no longer valid
2. **Missing API Scopes**: The app doesn't have permission to create draft orders
3. **Stale Session**: The app was reinstalled but the database wasn't updated

## ✅ Code Fixes Applied

### 1. Fixed REST API Authentication
**Problem**: The code was using `process.env.SHOPIFY_ADMIN_ACCESS_TOKEN` which is for custom apps, not OAuth apps.

**Solution**: Updated to use the proper session access token from the authenticated admin client:

```typescript
// Before (WRONG)
'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '',

// After (CORRECT)
'X-Shopify-Access-Token': session.accessToken,
```

### 2. Enhanced Error Handling
Added proper session validation and connection testing:

```typescript
const { admin: unauthenticatedAdmin, session: adminSession } = await unauthenticated.admin(shop);
admin = unauthenticatedAdmin;
session = adminSession;

if (!admin || !session) {
  return json({
    success: false,
    error: "Could not authenticate with Shopify. Please ensure the app is properly installed."
  }, { status: 401 });
}

// Test connection before proceeding
const testQuery = `{ shop { name } }`;
const testResponse = await admin.graphql(testQuery);
```

### 3. Verified API Scopes
Confirmed that your `shopify.app.alma-cod.toml` has the correct scopes:
```toml
scopes = "read_draft_orders,read_metaobject_definitions,read_metaobjects,read_online_store_pages,read_products,read_orders,write_draft_orders,write_metaobject_definitions,write_metaobjects,write_online_store_pages,write_products,write_orders"
```

## 🔧 Manual Fix Required: App Reinstallation

**IMPORTANT**: Even with the code fixes, you MUST reinstall the app to get fresh access tokens with the correct permissions.

### Step-by-Step Reinstallation Process:

1. **Stop your development server**
   ```bash
   # Press Ctrl+C to stop npm run dev
   ```

2. **Uninstall the app from your development store**
   - Go to your Shopify Partner Dashboard
   - Navigate to Apps > [Your App Name] > Testing
   - Find your development store (`cod-form-builder-dev.myshopify.com`)
   - Click "Uninstall" to remove the app

3. **Clear the database session**
   ```bash
   # Delete the SQLite database to clear all sessions
   rm dev.sqlite
   
   # Or if you want to keep other data, just delete the Session table entries
   # You can do this through a database tool or by running:
   npx prisma studio
   # Then manually delete the session for your shop
   ```

4. **Restart your development server**
   ```bash
   npm run dev
   ```

5. **Reinstall the app**
   - Follow the installation URL provided in your terminal
   - The app will now request the correct scopes including `write_draft_orders`
   - Approve all permissions when prompted

6. **Test the functionality**
   - Try submitting a form through your app proxy
   - The 401 error should now be resolved

## 🔍 Verification Steps

After reinstalling, verify the fix by checking:

1. **Database Session**: Check that a new session exists in your database with a valid access token
2. **GraphQL Test**: The connection test should now pass
3. **Order Creation**: Both empty cart orders (REST API) and orders with items (GraphQL) should work

## 🚨 Common Issues and Solutions

### Issue: "No access token available for REST API call"
**Solution**: The session wasn't properly retrieved. Ensure the app is installed and the database has a valid session.

### Issue: "Could not authenticate with Shopify"
**Solution**: The app needs to be reinstalled to get fresh tokens with correct permissions.

### Issue: "GraphQL connection test failed"
**Solution**: Usually indicates invalid/expired tokens. Reinstall the app.

## 📋 Testing Checklist

- [ ] App is properly installed on development store
- [ ] Database contains valid session with access token
- [ ] GraphQL connection test passes
- [ ] Empty cart orders work (REST API)
- [ ] Orders with items work (GraphQL API)
- [ ] No 401 errors in console logs

## 🎯 Expected Results

After following this guide:
- ✅ No more 401 Unauthorized errors
- ✅ Draft orders are created successfully
- ✅ Both REST and GraphQL APIs work properly
- ✅ App proxy requests are authenticated correctly

## 📞 Need Help?

If you continue to experience issues after following this guide:
1. Check the console logs for specific error messages
2. Verify the app is properly installed with correct scopes
3. Ensure your development store is active and accessible
4. Check that your environment variables are correctly set
