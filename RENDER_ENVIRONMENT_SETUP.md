# Render Environment Variables Setup Guide

This guide will help you properly configure environment variables for your Shopify app on Render to fix the "environment variables not detected" error.

## 🚨 Critical Steps to Fix Environment Variable Issues

### 1. Remove Hardcoded Values from render.yaml
✅ **COMPLETED**: The `render.yaml` file has been updated to remove hardcoded sensitive values. Environment variables should now be set in the Render dashboard only.

### 2. Set Environment Variables in Render Dashboard

1. **Go to your Render service dashboard**
2. **Navigate to the "Environment" tab**
3. **Add the following environment variables** (without quotes):

```
SHOPIFY_API_KEY=78b3b49a43d2ac2ca7e3abaf380e011d
SHOPIFY_API_SECRET=cf24bd7dc35faadf8b645cdee12803f3
SHOPIFY_APP_URL=https://easycod-dz-1.onrender.com
SCOPES=read_draft_orders,read_metaobject_definitions,read_metaobjects,read_online_store_pages,read_orders,read_products,write_draft_orders,write_metaobject_definitions,write_metaobjects,write_online_store_pages,write_orders,write_products
```

### 3. Important Environment Variable Rules

- ❌ **DO NOT** use quotes around values in Render dashboard
- ❌ **DO NOT** use `dotenv` in production (Render handles this automatically)
- ✅ **DO** ensure exact spelling and capitalization
- ✅ **DO** redeploy after adding/editing environment variables

### 4. Environment Variable Validation

The app now includes comprehensive validation that will:
- ✅ Check all required variables at startup
- ✅ Provide clear error messages if variables are missing
- ✅ Show exactly which variables need to be set
- ✅ Exit gracefully with helpful instructions

### 5. Docker Configuration

✅ **COMPLETED**: The Dockerfile has been updated to:
- Remove hardcoded `NODE_ENV` and `PORT` that could override Render's settings
- Add comprehensive environment variable logging
- Let Render inject all environment variables at runtime

### 6. Deployment Steps

1. **Set environment variables** in Render dashboard (see step 2)
2. **Commit and push** your changes to trigger a new deployment
3. **Monitor the deployment logs** for environment variable validation messages
4. **Verify** the app starts successfully with all required variables

## 🔍 Troubleshooting

### If you still see "environment variables not detected":

1. **Check Render Dashboard**: Ensure variables are set in the correct service
2. **Verify Spelling**: Environment variable names are case-sensitive
3. **Remove Quotes**: Don't wrap values in quotes in Render dashboard
4. **Redeploy**: Variables only take effect after a new deployment
5. **Check Logs**: Look for the environment variable validation messages

### Expected Log Output (Success):
```
=== Environment Variable Check ===
NODE_ENV: production
PORT: 8080
SHOPIFY_API_KEY: SET
SHOPIFY_API_SECRET: SET
SHOPIFY_APP_URL: https://easycod-dz-1.onrender.com
SCOPES: SET
=================================
✅ All required environment variables are present
🚀 Starting server on 0.0.0.0:8080
```

### Expected Log Output (Failure):
```
❌ SHOPIFY_API_KEY: MISSING
❌ SHOPIFY_API_SECRET: MISSING
❌ Missing required environment variables: SHOPIFY_API_KEY, SHOPIFY_API_SECRET
Please check your Render service environment variables configuration.
```

## 📋 Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `SHOPIFY_API_KEY` | Your Shopify app's API key | `78b3b49a43d2ac2ca7e3abaf380e011d` |
| `SHOPIFY_API_SECRET` | Your Shopify app's API secret | `cf24bd7dc35faadf8b645cdee12803f3` |
| `SHOPIFY_APP_URL` | Your app's public URL | `https://easycod-dz-1.onrender.com` |
| `SCOPES` | Comma-separated Shopify scopes | `read_orders,write_orders,read_products` |
| `NODE_ENV` | Environment mode | `production` (set by Render) |
| `PORT` | Server port | `8080` (set by Render) |

## 🚀 Next Steps

After setting up the environment variables:

1. **Deploy** your updated code
2. **Test** your Shopify app installation
3. **Verify** all functionality works correctly
4. **Monitor** logs for any remaining issues

The app will now provide clear feedback about environment variable status and fail fast with helpful error messages if anything is misconfigured.
