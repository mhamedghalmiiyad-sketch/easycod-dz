# Render Deployment Fix Guide

## Issue Fixed
The deployment was failing with the error:
```
ShopifyError: Detected an empty appUrl configuration, please make sure to set the necessary environment variables.
```

## Root Cause
The `SHOPIFY_APP_URL` environment variable was not set in the Render deployment, causing the Shopify app configuration to fail.

## Solution Applied

### 1. Updated `app/shopify.server.ts`
- Added fallback value for `appUrl`: `"https://easycod-dz.onrender.com"`
- Now uses: `appUrl: process.env.SHOPIFY_APP_URL || "https://easycod-dz.onrender.com"`

### 2. Updated `server.js`
- Removed `SHOPIFY_APP_URL` from required environment variables
- Added warning message when `SHOPIFY_APP_URL` is not set
- Added informational message when it is set

### 3. Updated `render.yaml`
- Marked `SHOPIFY_APP_URL` as optional in comments
- Added note about fallback value

### 4. Created Deployment Script
- Added `scripts/deploy-to-render.js` for deployment preparation
- Added `npm run deploy-prep` script to package.json

## Environment Variables Required in Render Dashboard

### Required Variables:
- `SHOPIFY_API_KEY`: Your Shopify app's API key
- `SHOPIFY_API_SECRET`: Your Shopify app's API secret  
- `SCOPES`: Comma-separated list of Shopify scopes
- `DATABASE_URL`: PostgreSQL database URL (from database service)
- `SESSION_SECRET`: A long, random string for session security

### Optional Variables:
- `SHOPIFY_APP_URL`: Your app's URL (defaults to `https://easycod-dz.onrender.com`)

## Example SCOPES Value:
```
read_draft_orders,read_metaobject_definitions,read_metaobjects,read_online_store_pages,read_products,read_orders,write_draft_orders,write_metaobject_definitions,write_metaobjects,write_online_store_pages,write_products,write_orders
```

## Deployment Steps

1. **Set Environment Variables in Render Dashboard:**
   - Go to your Render dashboard
   - Navigate to your web service
   - Go to Environment tab
   - Add all required environment variables
   - Optionally add `SHOPIFY_APP_URL` if different from default

2. **Deploy:**
   - The app will now start successfully even without `SHOPIFY_APP_URL` set
   - The fallback URL `https://easycod-dz.onrender.com` will be used

3. **Verify Deployment:**
   - Check the health endpoint: `https://easycod-dz.onrender.com/health`
   - Check wilaya data: `https://easycod-dz.onrender.com/health/wilaya`

## Testing the Fix

Run the deployment preparation script locally:
```bash
npm run deploy-prep
```

This will show you the environment variables checklist and setup instructions.

## Files Modified

1. `app/shopify.server.ts` - Added fallback for appUrl
2. `server.js` - Made SHOPIFY_APP_URL optional
3. `render.yaml` - Updated comments
4. `package.json` - Added deploy-prep script
5. `scripts/deploy-to-render.js` - New deployment helper script

## Next Steps

1. Commit these changes
2. Push to your repository
3. Trigger a new deployment in Render
4. The app should now start successfully

The deployment should now work without the empty appUrl error!