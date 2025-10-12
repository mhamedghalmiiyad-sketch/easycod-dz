# Local Development Setup Guide

## Quick Start

### 1. Set Up Environment Variables

Copy the example environment file and fill in your credentials:

```bash
cp env.example .env
```

Then edit `.env` with your actual Shopify app credentials:

```env
# Required Shopify App Configuration
SHOPIFY_API_KEY=your_actual_api_key_here
SHOPIFY_API_SECRET=your_actual_api_secret_here
SHOPIFY_APP_URL=https://your-app.onrender.com
SCOPES=read_products,write_products,read_orders,write_orders

# Optional Configuration
SHOP_CUSTOM_DOMAIN=your-custom-domain.com
DATABASE_URL=your_database_url_here

# Development Settings
NODE_ENV=development
PORT=3000
```

### 2. Start Development Server

```bash
npm run dev
```

## Understanding the Diagnostic Scripts

### For Local Development
The diagnostic scripts are primarily designed for **Render deployment troubleshooting**. When you run them locally without environment variables, they will show "MISSING" - this is expected and normal.

### For Render Deployment
When you deploy to Render and set the environment variables in the dashboard, the diagnostic scripts will help you verify that everything is configured correctly.

## Environment Variables Explained

### Required Variables
- **SHOPIFY_API_KEY**: Your Shopify app's API key (from your Shopify Partner Dashboard)
- **SHOPIFY_API_SECRET**: Your Shopify app's API secret (from your Shopify Partner Dashboard)
- **SHOPIFY_APP_URL**: Your app's URL (e.g., `https://your-app.onrender.com`)
- **SCOPES**: Comma-separated list of Shopify scopes your app needs

### Optional Variables
- **SHOP_CUSTOM_DOMAIN**: If you're using a custom domain for your Shopify app
- **DATABASE_URL**: If you're using an external database (otherwise SQLite is used)
- **NODE_ENV**: Set to `development` for local development, `production` for deployment
- **PORT**: Port number (usually 3000 for local development)

## Getting Your Shopify App Credentials

1. Go to your [Shopify Partner Dashboard](https://partners.shopify.com/)
2. Navigate to your app
3. Go to "App setup" tab
4. Copy the API key and API secret
5. Set up your app URL (for local development, you can use ngrok or similar)

## Troubleshooting

### If you see "MISSING" environment variables locally:
This is normal! The diagnostic scripts are designed for production deployment troubleshooting.

### If you want to test the diagnostic scripts locally:
1. Create a `.env` file with your credentials
2. Run `npm run diagnose-env` - it should now show your variables as "PRESENT"

### For Render deployment issues:
1. Set environment variables in Render dashboard
2. Deploy your app
3. Check deployment logs for diagnostic output
4. Use the troubleshooting guide in `RENDER_ENVIRONMENT_TROUBLESHOOTING.md`

## Next Steps

1. **Local Development**: Set up your `.env` file and run `npm run dev`
2. **Deploy to Render**: Set environment variables in Render dashboard and deploy
3. **Troubleshoot Issues**: Use the diagnostic scripts and troubleshooting guides

The diagnostic tools are working perfectly - they're just designed for production deployment troubleshooting, not local development setup!
