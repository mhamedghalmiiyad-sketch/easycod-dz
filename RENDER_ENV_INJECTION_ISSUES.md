# Render Environment Variable Injection Issues

## Problem: Variables Set in Dashboard But Not Available at Runtime

If your environment variables are set in the Render dashboard but still show as `undefined` in your app logs, this is a common Render deployment issue.

## Immediate Troubleshooting Steps

### 1. Verify Service Type
- **CRITICAL**: Make sure you're using a **Web Service** (not Static Site or Background Worker)
- Web Services properly inject environment variables at runtime
- Other service types may not support environment variable injection

### 2. Check Environment Variable Names
- Ensure variable names match exactly (case-sensitive)
- No trailing spaces or special characters
- Common mistakes:
  - `SHOPIFY_API_KEY` ✅ (correct)
  - `shopify_api_key` ❌ (wrong case)
  - `SHOPIFY_API_KEY ` ❌ (trailing space)

### 3. Verify Service Configuration
- Go to your Render service dashboard
- Check the **"Settings"** tab
- Ensure **"Auto-Deploy"** is enabled
- Verify the **"Build Command"** and **"Start Command** are correct

### 4. Force a Complete Redeploy
- **DO NOT** just restart the service
- Go to **"Manual Deploy"** → **"Deploy latest commit"**
- Or push a new commit to trigger a full redeploy
- Environment variables are injected at build time, not runtime

## Advanced Debugging

### Check Render Service Logs
Look for these indicators in your deployment logs:

```
=== RENDER ENVIRONMENT DEBUGGING ===
RENDER environment variable: SET
NODE_ENV: production
PORT: 10000
Total environment variables count: [should be > 10]
Environment variables starting with SHOPIFY: [should list your variables]
```

### Common Issues and Solutions

#### Issue 1: Wrong Service Type
**Symptoms**: Environment variables never appear in logs
**Solution**: Convert to Web Service or create a new Web Service

#### Issue 2: Build vs Runtime Environment
**Symptoms**: Variables work in build but not runtime
**Solution**: Ensure variables are set for the correct environment (production)

#### Issue 3: Service Configuration Issues
**Symptoms**: Variables appear but app still fails
**Solution**: Check build/start commands and service settings

#### Issue 4: Variable Name Mismatches
**Symptoms**: Some variables work, others don't
**Solution**: Double-check exact variable names and casing

## Render-Specific Considerations

### Environment Variable Limits
- Maximum 100 environment variables per service
- Maximum 32KB total size for all environment variables
- Variable names: 1-100 characters, alphanumeric + underscore
- Variable values: up to 32KB each

### Service Types and Environment Variables
- **Web Service**: ✅ Full environment variable support
- **Static Site**: ❌ No environment variable support
- **Background Worker**: ⚠️ Limited environment variable support
- **Cron Job**: ⚠️ Limited environment variable support

### Build vs Runtime
- Environment variables are available during both build and runtime
- Build-time variables: Available during `npm install` and `npm run build`
- Runtime variables: Available when your app starts

## Step-by-Step Resolution

### Step 1: Verify Service Configuration
1. Go to Render dashboard
2. Select your service
3. Go to **"Settings"** tab
4. Verify:
   - Service type: **Web Service**
   - Build Command: `npm install && npm run build`
   - Start Command: `node server.js`
   - Node Version: `20.11.0`

### Step 2: Check Environment Variables
1. Go to **"Environment"** tab
2. Verify all required variables are present:
   - `SHOPIFY_API_KEY`
   - `SHOPIFY_API_SECRET`
   - `SHOPIFY_APP_URL`
   - `SCOPES`
3. Check for typos, extra spaces, or wrong casing

### Step 3: Force Redeploy
1. Go to **"Manual Deploy"** tab
2. Click **"Deploy latest commit"**
3. Wait for build to complete
4. Check deployment logs for diagnostic output

### Step 4: Verify in Logs
Look for this diagnostic output in your deployment logs:
```
=== RENDER ENVIRONMENT DEBUGGING ===
RENDER environment variable: SET
Total environment variables count: [number > 10]
Environment variables starting with SHOPIFY: SHOPIFY_API_KEY,SHOPIFY_API_SECRET,SHOPIFY_APP_URL
```

## If Issues Persist

### Contact Render Support
If environment variables are still not being injected after following these steps:

1. **Gather Information**:
   - Service type and configuration
   - Environment variable names and values (without sensitive data)
   - Deployment logs showing the diagnostic output
   - Steps you've already tried

2. **Contact Support**:
   - Use Render's support system
   - Include the diagnostic output from your logs
   - Mention that variables are set in dashboard but not injected at runtime

### Alternative Solutions
1. **Create New Service**: Sometimes creating a fresh Web Service resolves injection issues
2. **Check Billing**: Ensure your Render account is in good standing
3. **Regional Issues**: Try deploying to a different region if available

## Prevention
- Always use Web Services for apps requiring environment variables
- Double-check variable names and values before deploying
- Use the diagnostic scripts to verify configuration
- Keep environment variables organized and documented

## Quick Checklist
- [ ] Service type is "Web Service"
- [ ] Environment variables are set in dashboard
- [ ] Variable names match exactly (case-sensitive)
- [ ] No trailing spaces in variable names/values
- [ ] Full redeploy performed (not just restart)
- [ ] Diagnostic logs show variables are present
- [ ] Build and start commands are correct
