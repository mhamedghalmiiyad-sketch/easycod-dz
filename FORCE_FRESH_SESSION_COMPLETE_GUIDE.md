# Force Fresh Session - Complete Guide

This guide provides multiple approaches to resolve the persistent 401 Unauthorized error by forcing Shopify to generate a completely fresh access token with the correct permissions.

## The Problem

Your app is getting a 401 error when trying to create draft orders because the old session token in your database doesn't have the `write_draft_orders` permission, even after updating scopes in the Partner Dashboard.

## Solution Approaches

### Approach 1: Direct Database Access (Recommended)

If you have access to your Render PostgreSQL database:

1. **Connect to your database** using a tool like:
   - TablePlus
   - DBeaver
   - pgAdmin
   - Or command line: `psql "postgresql://easycod_dz_db_user:9K8hnx0GqxEAfh6pDkjTOufnOhd8iXNk@dpg-d3m1uh7diees73a95f2g-a/easycod_dz_db"`

2. **Run these SQL commands**:
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

### Approach 2: Render Console Access

If you can access your Render deployment console:

1. **SSH into your Render deployment**
2. **Run the deletion script**:
```bash
node scripts/delete-session-render.js
```

### Approach 3: Local Script with Database URL

If you can connect to your production database from your local machine:

```bash
DATABASE_URL="postgresql://easycod_dz_db_user:9K8hnx0GqxEAfh6pDkjTOufnOhd8iXNk@dpg-d3m1uh7diees73a95f2g-a/easycod_dz_db" node scripts/force-fresh-session-production.js
```

## Step-by-Step Process (After Deleting Session)

### Step 1: Verify Partner Dashboard Configuration

1. Go to [Partner Dashboard](https://partners.shopify.com/)
2. Navigate to **Apps** → **alma COd**
3. Click **App setup** → **Admin API access scopes** → **Edit**
4. **CRITICAL**: Verify that `write_draft_orders` is checked
5. Click **SAVE** (even if it looks correct)

### Step 2: Reinstall the App

1. Go back to **Apps** → **alma COd**
2. Click **"Test on development store"**
3. Select **`cod-form-builder-dev`**
4. **CRITICAL**: On the installation consent screen, verify it shows:
   - "Create and modify draft orders" (or similar wording for `write_draft_orders`)
   - If this permission is missing, the Partner Dashboard configuration is not synced correctly
5. Click **"Install app"**

### Step 3: Verify the New Session

**Option A: Using the verification script**:
```bash
DATABASE_URL="postgresql://easycod_dz_db_user:9K8hnx0GqxEAfh6pDkjTOufnOhd8iXNk@dpg-d3m1uh7diees73a95f2g-a/easycod_dz_db" node scripts/verify-session-production.js
```

**Option B: Direct database query**:
```sql
SELECT "shop", "scope", "createdAt" FROM "Session" WHERE "shop" = 'cod-form-builder-dev.myshopify.com';
```

Look for:
- ✅ `write_draft_orders` in the scope field
- ✅ Recent `createdAt` timestamp

### Step 4: Test Form Submission

1. Go to your storefront
2. Submit the COD form
3. Check the logs for success or failure

## Expected Results

### Success Indicators
- ✅ No 401 Unauthorized errors in logs
- ✅ Draft order created successfully
- ✅ Form submission completes without errors
- ✅ `write_draft_orders` appears in the session scope

### Failure Indicators
- ❌ Still getting 401 Unauthorized errors
- ❌ `write_draft_orders` not in the scope field
- ❌ Installation screen doesn't show draft order permissions

## Troubleshooting

### If Database Connection Fails
- Check if your database allows external connections
- Verify the connection string is correct
- Try using a database client tool instead

### If Partner Dashboard Won't Save Scopes
- Try refreshing the page and saving again
- Clear browser cache and try again
- Contact Shopify Partner Support

### If Reinstallation Still Shows 401
- Verify the new session has `write_draft_orders` in scope
- Check that you're using the correct shop domain
- Contact Shopify Developer Support with Request ID: `842602ef-a4a0-4fef-9845-6fa0d61e0fd1-1760985774`

## Why This Works

1. **Deleting the session** removes any possibility of using an old token
2. **Reinstalling** forces Shopify to issue a brand new offline token
3. **The new token** will have the current scopes from your Partner Dashboard
4. **Your app** will fetch this fresh token from the database

## Scripts Created

- `scripts/force-fresh-session-production.js` - Deletes old session (requires DATABASE_URL)
- `scripts/verify-session-production.js` - Verifies new session has correct permissions
- `scripts/delete-session-render.js` - Simple script for Render deployment

## Quick Start

**If you have database access:**
1. Run the SQL commands above
2. Verify Partner Dashboard scopes
3. Reinstall the app
4. Test form submission

**If you don't have database access:**
1. Try the Render console approach
2. Or contact your hosting provider for database access
3. Follow the same verification and reinstallation steps

This approach should definitively resolve the 401 Unauthorized error by ensuring a completely fresh token with the correct permissions.
