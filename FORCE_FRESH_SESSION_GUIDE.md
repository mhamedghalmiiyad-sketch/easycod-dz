# Force Fresh Session - Complete Guide

This guide will help you resolve the persistent 401 Unauthorized error by forcing Shopify to generate a completely fresh access token with the correct permissions.

## The Problem

Your app is getting a 401 error when trying to create draft orders, even after updating scopes in the Partner Dashboard. This happens because:

1. The old session token in your database doesn't have the `write_draft_orders` permission
2. Reinstalling the app sometimes doesn't clear the old token completely
3. The `unauthenticated.admin` client is still using the old token

## The Solution

We need to manually delete the old session from your database and force a complete reinstallation to generate a fresh token.

## Step-by-Step Process

### Step 1: Delete the Old Session

**Option A: Using the Script (Recommended)**
```bash
node scripts/force-fresh-session.js
```

**Option B: Manual Database Deletion**
1. Connect to your Render PostgreSQL database using your connection string
2. Run these SQL commands:
```sql
-- Delete related records first (due to foreign key constraints)
DELETE FROM "ShopSettings" WHERE "shopId" = 'cod-form-builder-dev.myshopify.com';
DELETE FROM "AppProxy" WHERE "shopId" = 'cod-form-builder-dev.myshopify.com';
DELETE FROM "OrderTracking" WHERE "shopId" = 'cod-form-builder-dev.myshopify.com';
DELETE FROM "AbandonedCart" WHERE "shopId" = 'cod-form-builder-dev.myshopify.com';

-- Delete the main session
DELETE FROM "Session" WHERE "shop" = 'cod-form-builder-dev.myshopify.com';

-- Verify deletion
SELECT * FROM "Session" WHERE "shop" = 'cod-form-builder-dev.myshopify.com';
```

### Step 2: Verify Partner Dashboard Configuration

1. Go to [Partner Dashboard](https://partners.shopify.com/)
2. Navigate to **Apps** → **alma COd**
3. Click **App setup** → **Admin API access scopes** → **Edit**
4. **CRITICAL**: Verify that `write_draft_orders` is checked
5. Click **SAVE** (even if it looks correct)

### Step 3: Reinstall the App

1. Go back to **Apps** → **alma COd**
2. Click **"Test on development store"**
3. Select **`cod-form-builder-dev`**
4. **CRITICAL**: On the installation consent screen, verify it shows:
   - "Create and modify draft orders" (or similar wording for `write_draft_orders`)
   - If this permission is missing, the Partner Dashboard configuration is not synced correctly
5. Click **"Install app"**

### Step 4: Verify the New Session

**Option A: Using the Script (Recommended)**
```bash
node scripts/verify-session-permissions.js
```

**Option B: Manual Database Check**
```sql
SELECT "shop", "scope", "createdAt" FROM "Session" WHERE "shop" = 'cod-form-builder-dev.myshopify.com';
```

Look for:
- ✅ `write_draft_orders` in the scope field
- ✅ Recent `createdAt` timestamp

### Step 5: Test Form Submission

1. Go to your storefront
2. Submit the COD form
3. Check the logs for success or failure

## Expected Results

### Success Indicators
- ✅ No 401 Unauthorized errors in logs
- ✅ Draft order created successfully
- ✅ Form submission completes without errors

### Failure Indicators
- ❌ Still getting 401 Unauthorized errors
- ❌ `write_draft_orders` not in the scope field
- ❌ Installation screen doesn't show draft order permissions

## Troubleshooting

### If Step 1 Fails
- Check your database connection
- Verify the shop domain is correct
- Try manual SQL deletion instead

### If Step 3 Fails
- Double-check Partner Dashboard scopes
- Try saving the scopes again
- Contact Shopify Partner Support if scopes won't save

### If Step 5 Still Shows 401
- Verify the new session has `write_draft_orders` in scope
- Check that you're using the correct shop domain
- Contact Shopify Developer Support with the Request ID from error logs

## Why This Works

1. **Deleting the session** removes any possibility of using an old token
2. **Reinstalling** forces Shopify to issue a brand new offline token
3. **The new token** will have the current scopes from your Partner Dashboard
4. **Your app** will fetch this fresh token from the database

## Request ID for Support

If you need to contact Shopify Developer Support, use this Request ID from your error logs:
`842602ef-a4a0-4fef-9845-6fa0d61e0fd1-1760985774`

## Scripts Created

- `scripts/force-fresh-session.js` - Deletes old session and related data
- `scripts/verify-session-permissions.js` - Verifies new session has correct permissions

Both scripts are safe to run multiple times and will provide clear feedback on what they're doing.
