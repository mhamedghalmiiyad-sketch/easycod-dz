# 🚀 Fly.io Deployment Guide for easycod-dz

This guide provides comprehensive instructions for deploying your Shopify app to Fly.io, including troubleshooting for common issues like MPG region panic and network disconnections.

## 📋 Prerequisites

- [Fly.io account](https://fly.io/app/sign-up)
- [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
- Shopify app credentials
- Node.js 18+ installed locally

## 🔧 Initial Setup

### 1. Install/Update flyctl

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Update to latest version (includes MPG panic fix)
fly version update
```

### 2. Authenticate

```bash
fly auth login
```

### 3. Create App (if not exists)

```bash
fly apps create easycod-dz
```

## 🚀 Deployment Methods

### Method 1: Using Deployment Scripts (Recommended)

#### Linux/macOS:
```bash
chmod +x deploy-fly.sh
./deploy-fly.sh
```

#### Windows PowerShell:
```powershell
.\deploy-fly.ps1
```

### Method 2: Manual Deployment

```bash
# Set secrets
fly secrets set \
    SHOPIFY_API_KEY="78b3b49a43d2ac2ca7e3abaf380e011d" \
    SHOPIFY_API_SECRET="your_secret_here" \
    SHOPIFY_APP_URL="https://easycod-dz.fly.dev" \
    SCOPES="read_draft_orders,read_metaobject_definitions,read_metaobjects,read_online_store_pages,read_products,read_orders,write_draft_orders,write_metaobject_definitions,write_metaobjects,write_online_store_pages,write_products,write_orders"

# Deploy
fly deploy --regions iad --local-only --no-postgres --strategy immediate
```

## 📁 Configuration Files

### fly.toml
```toml
app = "easycod-dz"
primary_region = "iad"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 1024

[processes]
  app = "npx prisma migrate deploy && npm run start"

[deploy]
  release_command = "npx prisma migrate deploy"
  strategy = "immediate"

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  timeout = "5s"
  path = "/ping"
```

### Dockerfile
```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 remix

# Copy the built application
COPY --from=builder --chown=remix:nodejs /app/build ./build
COPY --from=builder --chown=remix:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=remix:nodejs /app/package.json ./package.json
COPY --from=builder --chown=remix:nodejs /app/prisma ./prisma
COPY --from=builder --chown=remix:nodejs /app/public ./public

USER remix

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

# Run database migrations and start the application
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
```

## 🔍 Verification Steps

### 1. Check App Status
```bash
fly status
```

### 2. View Logs
```bash
fly logs --lines 50
```

### 3. Test Health Check
```bash
curl https://easycod-dz.fly.dev/ping
```

### 4. Validate Configuration
```bash
fly config validate
```

## 🩺 Troubleshooting

### Common Issues and Solutions

#### 1. MPG Region Panic
**Error**: `panic: runtime error: invalid memory address or nil pointer dereference`

**Solution**:
- Update flyctl to latest version: `fly version update`
- Use `--regions iad` (not `--region`)
- Add `--no-postgres` flag
- Use `--local-only` builds

#### 2. Network Disconnections
**Error**: `connection forcibly closed` or `remote builder disconnected`

**Solution**:
- Use `--local-only` flag
- Try different region: `--regions cdg` (Paris)
- Use `--no-cache` flag

#### 3. Authentication Issues
**Error**: `You must be authenticated to view this`

**Solution**:
```bash
fly auth login
fly auth whoami  # Verify authentication
```

#### 4. Missing Secrets
**Error**: App fails to start with Shopify API errors

**Solution**:
```bash
fly secrets list  # Check existing secrets
fly secrets set SHOPIFY_API_KEY=... SHOPIFY_API_SECRET=...  # Set missing secrets
```

#### 5. Build Failures
**Error**: Docker build fails

**Solution**:
- Check Dockerfile syntax
- Ensure all dependencies are in package.json
- Use `--verbose` flag for detailed logs
- Try `--no-cache` flag

#### 6. Database Migration Issues
**Error**: Prisma migration fails

**Solution**:
- Check database connection string
- Ensure migrations are up to date
- Use `npx prisma migrate deploy` in release command

### Debug Commands

```bash
# Check app configuration
fly config show

# View detailed logs
fly logs --verbose

# Check machine status
fly machine list

# Restart app
fly apps restart easycod-dz

# Scale app
fly scale count 1

# Check secrets
fly secrets list
```

## 🔄 Deployment Workflow

### Pre-deployment Checklist
- [ ] flyctl updated to latest version
- [ ] Authenticated with Fly.io
- [ ] App exists on Fly.io
- [ ] Secrets configured
- [ ] Configuration validated
- [ ] Local build successful

### Post-deployment Checklist
- [ ] App status shows "running"
- [ ] Health check passes
- [ ] Logs show no errors
- [ ] App accessible via URL
- [ ] Shopify app initializes correctly

## 📊 Monitoring

### Health Checks
The app includes health checks at `/ping` endpoint:
- Grace period: 10 seconds
- Interval: 30 seconds
- Timeout: 5 seconds

### Logs
Monitor logs for:
- Application startup
- Database connections
- Shopify API calls
- Error messages

### Metrics
Track:
- Response times
- Error rates
- Memory usage
- CPU usage

## 🚨 Emergency Procedures

### Rollback
```bash
# List releases
fly releases

# Rollback to previous release
fly releases rollback
```

### Scale Down
```bash
# Scale to zero
fly scale count 0

# Scale back up
fly scale count 1
```

### Restart
```bash
# Restart app
fly apps restart easycod-dz

# Restart specific machine
fly machine restart <machine-id>
```

## 📞 Support

### Fly.io Support
- [Fly.io Documentation](https://fly.io/docs/)
- [Fly.io Community](https://community.fly.io/)
- [Fly.io Status](https://status.fly.io/)

### Shopify Support
- [Shopify App Development](https://shopify.dev/apps)
- [Shopify Community](https://community.shopify.com/)

## 🔗 Useful Links

- [App URL](https://easycod-dz.fly.dev)
- [Fly.io Dashboard](https://fly.io/dashboard)
- [Shopify Partner Dashboard](https://partners.shopify.com/)

---

## 📝 Changelog

### v1.0.0 (Current)
- Initial deployment configuration
- MPG region panic fixes
- Network disconnection solutions
- Comprehensive troubleshooting guide
- Health check implementation
- Automated deployment scripts

---

*Last updated: $(date)*
*For questions or issues, please refer to the troubleshooting section or contact support.*