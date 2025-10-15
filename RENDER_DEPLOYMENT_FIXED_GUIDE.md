# Render Deployment Fix Guide

## Issues Fixed
The deployment was failing with multiple errors:

1. **Empty appUrl configuration:**
```
ShopifyError: Detected an empty appUrl configuration, please make sure to set the necessary environment variables.
```

2. **Missing API credentials:**
```
ShopifyError: Cannot initialize Shopify API Library. Missing values for: apiSecretKey, apiKey
```

## Root Causes
1. The `SHOPIFY_APP_URL` environment variable was not set in the Render deployment
2. The `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` environment variables were either missing or set to empty values
3. Environment variable validation was not catching empty string values

## Solution Applied

### 1. Updated `app/shopify.server.ts`
- Added fallback value for `appUrl`: `"https://easycod-dz.onrender.com"`
- Added explicit validation for required environment variables
- Now throws clear errors if API credentials are missing

### 2. Updated `server.js`
- Enhanced environment variable validation to catch empty strings
- Added specific validation for `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` length
- Added detailed logging of environment variable status
- Removed `SHOPIFY_APP_URL` from required environment variables

### 3. Updated `render.yaml`
- Marked `SHOPIFY_APP_URL` as optional in comments
- Added note about fallback value

### 4. Created Deployment Scripts
- Added `scripts/deploy-to-render.js` for deployment preparation
- Added `scripts/check-env-vars.js` for environment variable diagnostics
- Added `npm run deploy-prep` and `npm run check-env` scripts to package.json

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

Check your environment variables:
```bash
npm run check-env
```

These scripts will show you the environment variables checklist and help diagnose any issues.

## Files Modified

1. `app/shopify.server.ts` - Added fallback for appUrl and environment validation
2. `server.js` - Enhanced environment validation and made SHOPIFY_APP_URL optional
3. `render.yaml` - Updated comments
4. `package.json` - Added deploy-prep and check-env scripts
5. `scripts/deploy-to-render.js` - New deployment helper script
6. `scripts/check-env-vars.js` - New environment variable diagnostic script

## Next Steps

1. Commit these changes
2. Push to your repository
3. Trigger a new deployment in Render
4. The app should now start successfully

The deployment should now work without the empty appUrl error!