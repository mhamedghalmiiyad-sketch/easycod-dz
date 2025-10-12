# Render Deployment Fix Guide

## Problem Summary
The deployment was failing because:
1. **Missing DATABASE_URL**: The `render.yaml` file didn't include a database service
2. **Missing Session Table**: Prisma couldn't find the session table because the database wasn't properly set up

## Solution Applied

### 1. Updated `render.yaml`
- Added a PostgreSQL database service (`easycod-dz-db`)
- Configured automatic `DATABASE_URL` injection from the database service
- Updated build command to include Prisma client generation

### 2. Environment Variables Setup
You need to set these environment variables in your Render dashboard:

#### Required Environment Variables:
1. **SHOPIFY_API_KEY**: Your Shopify app's API key (32 characters)
2. **SHOPIFY_API_SECRET**: Your Shopify app's API secret (32 characters)  
3. **SHOPIFY_APP_URL**: Your app's URL (e.g., `https://your-app.onrender.com`)
4. **SCOPES**: Comma-separated list of Shopify scopes

#### Automatically Set:
- **DATABASE_URL**: Automatically set from the database service

## Deployment Steps

### 1. Deploy to Render
1. Push your changes to your Git repository
2. In Render dashboard, create a new "Blueprint" deployment
3. Connect your repository
4. Render will automatically detect the `render.yaml` file

### 2. Set Environment Variables
In the Render dashboard for your web service:

1. Go to your web service settings
2. Navigate to "Environment" tab
3. Add these environment variables:

```
SHOPIFY_API_KEY=your_shopify_api_key_here
SHOPIFY_API_SECRET=your_shopify_api_secret_here
SHOPIFY_APP_URL=https://your-app-name.onrender.com
SCOPES=read_draft_orders,read_metaobject_definitions,read_metaobjects,read_online_store_pages,read_orders,read_products,write_draft_orders,write_metaobject_definitions,write_metaobjects,write_online_store_pages,write_orders,write_products
DATABASE_URL=postgres://username:password@host:port/database
```

### 3. Get DATABASE_URL from Database Service
1. Go to your database service (`easycod-dz-db`) in Render dashboard
2. Copy the **Internal Database URL** from the database service details
3. Paste this URL as the `DATABASE_URL` environment variable in your web service

### 4. Verify Deployment
After deployment, check the logs to ensure:
- ✅ Database connection established
- ✅ Session table exists
- ✅ All environment variables are present
- ✅ Server starts successfully

## Build Process
The build process now includes:
1. `npm install` - Install dependencies
2. `npx prisma generate` - Generate Prisma client
3. `npm run build` - Build the application
4. `npm run setup-db` - Set up database tables

## Troubleshooting

### If DATABASE_URL is still missing:
1. **Manual Setup Required**: The automatic injection might not work, so you need to set it manually:
   - Go to your database service (`easycod-dz-db`) in Render dashboard
   - Copy the **Internal Database URL** (starts with `postgres://`)
   - Go to your web service environment variables
   - Add `DATABASE_URL` with the copied URL as the value
2. Check that the database service is created successfully
3. Verify the database service name matches in `render.yaml`
4. Ensure both services are in the same Render account/team

### If Session table doesn't exist:
1. Check the build logs for migration errors
2. Verify Prisma schema is correct
3. Ensure database user has proper permissions

### If environment variables are missing:
1. Double-check all variables are set in Render dashboard
2. Ensure no typos in variable names
3. Verify the web service is using the correct environment

## Database Schema
The app uses these main tables:
- `Session` - Shopify session storage
- `ShopSettings` - App configuration per shop
- `AppProxy` - App proxy settings
- `OrderTracking` - Order tracking data
- `AbandonedCart` - Abandoned cart recovery
- `AlgeriaCities` - Location data

All tables are automatically created during the `setup-db` step.
