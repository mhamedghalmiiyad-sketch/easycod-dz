# 🚀 GitHub Actions CI/CD Setup Guide

This guide walks you through setting up automated deployment to Fly.io using GitHub Actions.

## 📋 Prerequisites

- GitHub repository with your code
- Fly.io account and app created
- Fly.io API token

## 🔑 Required Secrets

You need to add these secrets to your GitHub repository:

### 1. Fly.io API Token

1. Go to [Fly.io Dashboard](https://fly.io/dashboard)
2. Click on your profile → **Access Tokens**
3. Click **Create Token**
4. Give it a name (e.g., "GitHub Actions")
5. Copy the token

### 2. Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `FLY_API_TOKEN` | Your Fly.io API token | ✅ Yes |
| `SHOPIFY_API_KEY` | Your Shopify app API key | ✅ Yes |
| `SHOPIFY_API_SECRET` | Your Shopify app secret | ✅ Yes |
| `SESSION_SECRET` | Remix/Shopify session encryption key | ✅ Yes |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | ❌ Optional |
| `DISCORD_WEBHOOK_URL` | Discord webhook for notifications | ❌ Optional |
| `DATABASE_URL` | Database connection string (if using Prisma) | ❌ Optional |

**Note:** Never commit API tokens or secrets to your code. Always use GitHub Secrets.

## 🔧 Workflow Files

### 1. **Deploy to Production** (`.github/workflows/deploy-fly.yml`)

This workflow:
- ✅ Runs tests before deployment
- ✅ Builds the application
- ✅ Deploys to production Fly.io app
- ✅ Performs health checks with auto-rollback
- ✅ Shows deployment status

**Triggers:**
- Push to `main` branch
- Manual trigger (`workflow_dispatch`)

### 2. **Deploy to Staging** (`.github/workflows/deploy-staging.yml`)

This workflow:
- ✅ Runs tests before deployment
- ✅ Builds the application
- ✅ Deploys to staging Fly.io app
- ✅ Performs health checks with auto-rollback
- ✅ Creates staging app if it doesn't exist
- ✅ Sets staging-specific secrets

**Triggers:**
- Push to `develop` branch
- Manual trigger (`workflow_dispatch`)
- Force deploy option for PRs

### 3. **Test Suite** (`.github/workflows/test.yml`)

This workflow:
- ✅ Runs linting
- ✅ Builds application
- ✅ Type checking
- ✅ Security audit
- ✅ Code quality checks

**Triggers:**
- Push to any branch
- Pull requests
- Daily schedule (2 AM UTC)

### 4. **Rollback Deployment** (`.github/workflows/rollback.yml`)

This workflow:
- ✅ Lists available releases
- ✅ Rolls back to previous or specific release
- ✅ Performs health checks after rollback
- ✅ Sends notifications

**Triggers:**
- Manual trigger only (`workflow_dispatch`)

## 🚀 Usage

### Automatic Deployment

#### Production Deployment
1. **Push to main branch:**
   ```bash
   git add .
   git commit -m "feat: new feature"
   git push origin main
   ```

2. **Monitor deployment:**
   - Go to **Actions** tab in GitHub
   - Click on "Deploy to Fly.io" workflow
   - Watch the deployment progress

#### Staging Deployment
1. **Push to develop branch:**
   ```bash
   git checkout develop
   git add .
   git commit -m "feat: new feature for testing"
   git push origin develop
   ```

2. **Monitor deployment:**
   - Go to **Actions** tab in GitHub
   - Click on "Deploy to Staging" workflow
   - Watch the deployment progress

### Manual Deployment

#### Production
1. Go to **Actions** tab
2. Select **Deploy to Fly.io** workflow
3. Click **Run workflow**
4. Select branch and click **Run workflow**

#### Staging
1. Go to **Actions** tab
2. Select **Deploy to Staging** workflow
3. Click **Run workflow**
4. Optionally check "Force deploy even if tests fail"
5. Click **Run workflow**

### Rollback Deployment

1. Go to **Actions** tab
2. Select **Rollback Deployment** workflow
3. Click **Run workflow**
4. Enter app name:
   - Production: `easycod-dz`
   - Staging: `easycod-dz-staging`
5. Optionally enter specific release number
6. Click **Run workflow**

## 📊 Workflow Status

### Success Indicators
- ✅ All tests pass
- ✅ Build completes successfully
- ✅ Deployment succeeds
- ✅ Health check returns 200
- ✅ App is accessible

### Failure Indicators
- ❌ Tests fail
- ❌ Build errors
- ❌ Deployment fails
- ❌ Health check fails
- ❌ App not accessible

## 🔍 Monitoring

### GitHub Actions
- **Actions** tab shows all workflow runs
- Click on any run to see detailed logs
- Check **Artifacts** for build outputs

### Fly.io Dashboard
- [Fly.io Dashboard](https://fly.io/dashboard)
- Check app status and metrics
- View logs and monitor performance

### App Health
- **Production**: `https://easycod-dz.fly.dev/ping`
- **Staging**: `https://easycod-dz-staging.fly.dev/ping`
- Should return `200 OK`
- Monitored every 30 seconds
- Auto-rollback on health check failures

## 🛠️ Customization

### Environment Variables

Add more secrets for different environments:

```yaml
env:
  FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
  NODE_ENV: production
  SHOPIFY_API_KEY: ${{ secrets.SHOPIFY_API_KEY }}
  SHOPIFY_API_SECRET: ${{ secrets.SHOPIFY_API_SECRET }}
```

### Deployment Branches

The current setup uses:
- **Production**: `main` branch → `easycod-dz` app
- **Staging**: `develop` branch → `easycod-dz-staging` app

To modify triggers:

```yaml
# Production deployment
on:
  push:
    branches: [ main ]

# Staging deployment  
on:
  push:
    branches: [ develop ]
```

### Notification

The workflows include built-in Slack and Discord notifications. To enable:

1. **Slack:**
   - Create a Slack webhook URL
   - Add `SLACK_WEBHOOK_URL` secret to GitHub
   - Notifications will be sent to `#deployments` channel

2. **Discord:**
   - Create a Discord webhook URL
   - Add `DISCORD_WEBHOOK_URL` secret to GitHub
   - Notifications will be sent to the configured channel

3. **Custom notifications:**
   ```yaml
   - name: Custom Notification
     uses: 8398a7/action-slack@v3
     with:
       status: ${{ job.status }}
       channel: '#your-channel'
       webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
   ```

## 🚨 Troubleshooting

### Common Issues

#### 1. **Authentication Failed**
```
Error: You must be authenticated to view this
```

**Solution:**
- Check `FLY_API_TOKEN` secret is set correctly
- Verify token has proper permissions
- Regenerate token if needed

#### 2. **Deployment Failed**
```
Error: Deployment failed
```

**Solution:**
- Check Fly.io app exists
- Verify app configuration
- Check logs for specific errors

#### 3. **Health Check Failed**
```
Error: Health check failed with status: 500
```

**Solution:**
- Check app logs: `fly logs`
- Verify `/ping` endpoint exists
- Check database connections

#### 4. **Build Failed**
```
Error: Build failed
```

**Solution:**
- Check Node.js version compatibility
- Verify all dependencies are in package.json
- Check for TypeScript errors

### Debug Commands

```bash
# Check workflow logs
gh run list
gh run view <run-id>

# Check Fly.io status
fly status
fly logs

# Test health endpoint
curl https://easycod-dz.fly.dev/ping

# Rollback deployment
fly releases rollback

# Or use GitHub Actions workflow
# Go to Actions → Rollback Deployment → Run workflow
```

## 📈 Best Practices

### 1. **Branch Protection**
- Require status checks before merging
- Require reviews for main branch
- Restrict force pushes

### 2. **Secrets Management**
- Use least privilege principle
- Rotate tokens regularly
- Never commit secrets to code

### 3. **Monitoring**
- Set up alerts for failed deployments
- Monitor app performance
- Track deployment frequency

### 4. **Rollback Strategy**
- Keep previous deployments available
- Test rollback procedures
- Document emergency procedures

## 🔗 Useful Links

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Fly.io CLI Documentation](https://fly.io/docs/flyctl/)
- [Shopify App Development](https://shopify.dev/apps)
- [Remix Documentation](https://remix.run/docs)

## 📝 Example Commands

### Local Testing
```bash
# Test the build locally
npm run build

# Test health endpoint locally
npm run dev
curl http://localhost:3000/ping

# Test Fly.io deployment locally
fly deploy --local-only --regions iad --no-postgres
```

### GitHub CLI
```bash
# Install GitHub CLI
gh --version

# View workflow runs
gh run list

# View specific run
gh run view <run-id>

# Rerun failed workflow
gh run rerun <run-id>
```

---

## 🎉 Next Steps

1. **Set up secrets** in GitHub repository
2. **Push code** to trigger first deployment
3. **Monitor** the deployment process
4. **Test** the deployed application
5. **Set up** branch protection rules
6. **Configure** notifications (optional)

---

*For questions or issues, please refer to the troubleshooting section or contact support.*
