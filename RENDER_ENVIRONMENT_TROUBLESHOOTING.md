# Render Environment Variables Troubleshooting Guide

## Quick Diagnosis

If your Shopify app on Render shows missing environment variables error despite the variables being correctly set in the Render dashboard, follow these steps:

### 1. Run the Diagnostic Script

```bash
npm run diagnose-env
```

This will show you exactly which environment variables are missing and provide specific troubleshooting steps.

### 2. Check Your Render Service Configuration

#### Verify You're Editing the Correct Service
- Make sure you are editing the environment variables in the **exact Render service** you are deploying
- Some users have multiple services and modify the wrong one
- Double-check the service name matches your deployment

#### Confirm Environment Variables Are Saved
- Go to your Render service dashboard
- Navigate to the "Environment" tab
- Verify all required variables are present:
  - `SHOPIFY_API_KEY`
  - `SHOPIFY_API_SECRET`
  - `SHOPIFY_APP_URL`
  - `SCOPES`
- Check for trailing spaces or formatting issues
- Save the changes

### 3. Redeploy After Every Change

**CRITICAL**: After modifying environment variables, always trigger a **full redeploy** on Render (not just restart).

Environment variables are injected at build time, so a redeploy is required for the new variables to take effect.

### 4. Check for Configuration Conflicts

#### Dockerfile Issues
Your current Dockerfile is properly configured and does NOT override environment variables. It correctly:
- Lets Render handle `NODE_ENV` and `PORT`
- Includes diagnostic logging in the startup script
- Doesn't set any conflicting environment variables

#### render.yaml Issues
Your `render.yaml` is properly configured and does NOT hardcode sensitive values. It correctly:
- Uses the dashboard for environment variables
- Only sets non-sensitive defaults like `NODE_VERSION`

### 5. Advanced Diagnostic Logging

Your app already includes comprehensive diagnostic logging:

#### Early Startup Logging (server.js)
- Logs environment variables immediately at startup
- Shows Node.js version, platform, and architecture
- Lists all relevant environment variables with their status

#### Shopify Configuration Logging (shopify.server.ts)
- Logs the processed Shopify configuration
- Validates all required variables
- Provides clear error messages with troubleshooting steps

### 6. Check Build Commands and Runtime

Your current configuration:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `node server.js`
- **Node Version**: 20.11.0

These are correctly configured for Render deployment.

### 7. Render-Specific Considerations

#### Environment Variable Limits
- Render enforces max size and quotas for environment variables
- Ensure your values are not excessively long
- Check if any values violate these limits

#### Service Type
- Make sure you're using a **Web Service** (not Static Site or Background Worker)
- Web services properly inject environment variables at runtime

### 8. Common Issues and Solutions

#### Issue: Variables show as "MISSING" in logs
**Solution**: 
1. Verify variables are set in the correct Render service
2. Check for typos in variable names
3. Ensure no trailing spaces
4. Redeploy the service

#### Issue: Variables are set but app still fails
**Solution**:
1. Check the diagnostic logs for validation errors
2. Verify variable values are correct (especially URLs and scopes)
3. Ensure `SHOPIFY_APP_URL` starts with `https://`
4. Check that `SCOPES` is comma-separated

#### Issue: App works locally but not on Render
**Solution**:
1. Compare local `.env` file with Render environment variables
2. Ensure all required variables are set in Render
3. Check for differences in variable names or values

### 9. Verification Steps

After making changes:

1. **Check the deployment logs** for the diagnostic output
2. **Look for the early environment variable diagnostic** section
3. **Verify all required variables show as "PRESENT"**
4. **Test the app's authentication flow**

### 10. Contact Render Support

If all else fails:
1. Run `npm run diagnose-env` and save the output
2. Take screenshots of your Render environment variables
3. Contact Render support with:
   - The diagnostic output
   - Your service configuration
   - Description of the issue
   - Steps you've already tried

## Required Environment Variables

Make sure these are set in your Render service:

```
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_URL=https://your-app.onrender.com
SCOPES=read_products,write_products,read_orders,write_orders
```

Optional but recommended:
```
SHOP_CUSTOM_DOMAIN=your-custom-domain.com (if using custom domain)
DATABASE_URL=your_database_url (if using external database)
NODE_ENV=production
```

## Testing Your Configuration

1. Deploy your app with the diagnostic logging
2. Check the deployment logs for the diagnostic output
3. Verify all variables are present
4. Test your app's functionality
5. If issues persist, use the diagnostic script output to contact support

## Additional Resources

- [Render Environment Variables Documentation](https://render.com/docs/environment-variables)
- [Shopify App Development Guide](https://shopify.dev/docs/apps)
- [Render Web Service Configuration](https://render.com/docs/web-services)
