# 🚀 Deploy easycod-dz to Render - Complete Guide

This guide will help you deploy your Shopify Remix app (`easycod-dz`) to Render for free.

## 📋 Prerequisites

- GitHub account
- Render account (free)
- Shopify Partner account
- Your app working locally

## 🛠️ Step 1: Prepare Your App

### 1.1 Test Locally
```bash
npm run dev
```
Make sure your app runs without errors.

### 1.2 Build Production Version
```bash
npm run build
```
This creates the optimized output for production.

### 1.3 Initialize Git (if not already done)
```bash
git init
git add .
git commit -m "Initial commit"
```

## 🌐 Step 2: Create GitHub Repository

### 2.1 Create New Repo on GitHub
1. Go to [GitHub](https://github.com)
2. Click "New repository"
3. Name it `easycod-dz`
4. Make it public (required for free Render)
5. Don't initialize with README

### 2.2 Push Your Code
```bash
git remote add origin https://github.com/<your-username>/easycod-dz.git
git branch -M main
git push -u origin main
```

## 🚀 Step 3: Deploy to Render

### 3.1 Create Render Account
1. Go to [Render.com](https://render.com)
2. Sign up with GitHub
3. Authorize Render to access your repositories

### 3.2 Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub account if not already connected
3. Select your `easycod-dz` repository
4. Click **"Connect"**

### 3.3 Configure Service
Fill in the following details:

**Basic Settings:**
- **Name**: `easycod-app` (or any name you prefer)
- **Environment**: `Node`
- **Region**: Choose closest to Algeria (Frankfurt/London recommended)
- **Branch**: `main`
- **Root Directory**: Leave empty (uses root)

**Build & Deploy:**
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`

**Advanced Settings:**
- **Health Check Path**: `/ping`
- **Auto-Deploy**: ✅ Enabled

### 3.4 Add Environment Variables
Click **"Environment"** tab and add:

| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `SHOPIFY_API_KEY` | `your_api_key` | From Shopify Partner Dashboard |
| `SHOPIFY_API_SECRET` | `your_secret_key` | From Shopify Partner Dashboard |
| `SCOPES` | `read_products,write_orders,read_orders,write_checkouts,read_checkouts` | App permissions |
| `HOST` | `https://your-app-name.onrender.com` | Your Render URL (update after deployment) |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string (see Step 4) |
| `SESSION_SECRET` | `auto-generated` | Click "Generate" button |

### 3.5 Deploy
1. Click **"Create Web Service"**
2. Wait for build to complete (5-10 minutes)
3. Note your app URL: `https://your-app-name.onrender.com`

## 🗄️ Step 4: Set Up Database (Optional but Recommended)

### 4.1 Create PostgreSQL Database
1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Name: `easycod-postgres`
3. Plan: **Free**
4. Click **"Create Database"**

### 4.2 Get Connection String
1. Click on your database
2. Go to **"Connect"** tab
3. Copy the **"External Database URL"**

### 4.3 Update Environment Variables
1. Go back to your web service
2. **Environment** tab
3. Update `DATABASE_URL` with the PostgreSQL connection string

### 4.4 Update Prisma Schema (if using SQLite)
If your `prisma/schema.prisma` uses SQLite, update it:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 4.5 Run Migrations
```bash
npx prisma migrate deploy
npx prisma generate
```

Then commit and push:
```bash
git add .
git commit -m "Update database to PostgreSQL"
git push
```

## 🔧 Step 5: Update Shopify App Configuration

### 5.1 Update Partner Dashboard
1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Find your app
3. Update URLs:

**App URL:**
```
https://your-app-name.onrender.com
```

**Allowed redirection URL(s):**
```
https://your-app-name.onrender.com/auth/callback
```

### 5.2 Test Installation
1. Visit your app URL
2. Try installing the app in a development store
3. Test the main functionality

## 🔄 Step 6: Enable Auto-Deploy

Auto-deploy is already enabled, but verify:
1. Go to your Render service
2. **Settings** tab
3. **Build & Deploy** section
4. Ensure **"Auto-Deploy"** is enabled

Now every push to `main` branch will automatically deploy!

## 🐛 Troubleshooting

### Common Issues:

**Build Fails:**
- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

**App Doesn't Load:**
- Check environment variables are set correctly
- Verify `HOST` variable matches your Render URL
- Check health check endpoint `/ping`

**Database Issues:**
- Ensure `DATABASE_URL` is correct
- Run migrations: `npx prisma migrate deploy`
- Check database connection in logs

**Shopify Authentication Issues:**
- Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`
- Check app URLs in Partner Dashboard
- Ensure `SCOPES` match your app requirements

### Useful Commands:
```bash
# Check build locally
npm run build

# Run production build locally
npm run start

# Check database connection
npx prisma db pull

# View logs in Render
# Go to Render dashboard → Your service → Logs tab
```

## 📊 Monitoring

### Render Dashboard Features:
- **Logs**: Real-time application logs
- **Metrics**: CPU, memory, and response time
- **Deploys**: Deployment history and status
- **Environment**: Manage environment variables

### Health Check:
Your app includes a `/ping` endpoint for health monitoring.

## 💡 Pro Tips

1. **Free Plan Limits:**
   - Sleeps after 15 minutes of inactivity
   - Wakes automatically on first request
   - 750 hours per month included

2. **Custom Domain:**
   - Go to **Settings** → **Custom Domains**
   - Add your domain and configure DNS

3. **Environment Variables:**
   - Use Render's "Generate" feature for secrets
   - Keep sensitive data out of your code

4. **Database:**
   - PostgreSQL is more reliable than SQLite for production
   - Free PostgreSQL has 1GB storage limit

5. **Performance:**
   - Enable gzip compression
   - Use CDN for static assets
   - Monitor response times

## 🎉 Success!

Your Shopify Remix app is now deployed on Render! 

**Next Steps:**
- Test all app functionality
- Set up monitoring
- Consider upgrading to paid plan for production use
- Add custom domain if needed

**Your App URL:** `https://your-app-name.onrender.com`

---

## 📞 Support

If you encounter issues:
1. Check Render logs first
2. Verify environment variables
3. Test locally to isolate issues
4. Check Shopify Partner Dashboard configuration

Happy deploying! 🚀
