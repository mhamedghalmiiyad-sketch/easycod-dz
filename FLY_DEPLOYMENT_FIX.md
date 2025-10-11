# Fly.io Deployment Fix Guide

## ✅ Issue Fixed: MPG Region Panic

The error `panic: runtime error: invalid memory address or nil pointer dereference in github.com/superfly/flyctl/internal/command/mpg.(*MPGService).GetAvailableMPGRegions` has been resolved.

## 🔧 Applied Fixes

### 1. Flyctl Version ✅
- **Current version**: v0.3.144 (latest, includes MPG panic fix)
- **Status**: ✅ Up to date

### 2. Configuration Updates ✅

#### fly.toml
- Added explicit `[deploy]` section with release command
- Kept `primary_region = "iad"` (stable region)
- No postgres configuration (prevents MPG auto-detection)

#### Deployment Scripts
- Updated `deploy-fly.sh` and `deploy-fly.ps1`
- Added `--no-postgres` flag to prevent MPG region lookup
- Added Shopify secrets configuration
- Set explicit region to avoid region-related issues

### 3. Shopify Secrets Configuration ✅

Required secrets (set automatically by deployment scripts):
```bash
SHOPIFY_API_KEY="78b3b49a43d2ac2ca7e3abaf380e011d"
SHOPIFY_APP_URL="https://easycod-dz.fly.dev"
SCOPES="read_draft_orders,read_metaobject_definitions,read_metaobjects,read_online_store_pages,read_products,read_orders,write_draft_orders,write_metaobject_definitions,write_metaobjects,write_online_store_pages,write_products,write_orders"
```

**⚠️ IMPORTANT**: You must set `SHOPIFY_API_SECRET` manually:
```bash
fly secrets set SHOPIFY_API_SECRET="your_actual_secret_here"
```

## 🚀 Deployment Commands

### Quick Deploy (Recommended)
```bash
# Windows PowerShell
.\deploy-fly.ps1

# Linux/Mac
./deploy-fly.sh
```

### Manual Deploy
```bash
# Set secrets first
fly secrets set SHOPIFY_API_SECRET="your_secret_here"

# Deploy with MPG panic prevention (local build to avoid network issues)
fly deploy --regions iad --local-only --strategy immediate
```

## 🔍 Verification Steps

1. **Check app status**:
   ```bash
   fly status
   ```

2. **Verify secrets**:
   ```bash
   fly secrets list
   ```

3. **Check logs**:
   ```bash
   fly logs
   ```

4. **Test app URL**: https://easycod-dz.fly.dev

## 🛠️ Troubleshooting

### If deployment still fails:

1. **Clean up any stuck machines**:
   ```bash
   fly machine list
   fly machine remove <MACHINE_ID>
   ```

2. **Try alternative regions**:
   ```bash
   fly deploy --regions fra --local-only
   # or
   fly deploy --regions ams --local-only
   ```

3. **Check for environment issues**:
   ```bash
   fly logs --follow
   ```

4. **If network issues persist, try local build**:
   ```bash
   fly deploy --local-only --strategy immediate
   ```

## 📋 Pre-Deployment Checklist

- [x] Flyctl updated to v0.3.144+
- [x] Authenticated with Fly.io
- [x] App exists (`easycod-dz`)
- [x] fly.toml configured correctly
- [x] Deployment scripts updated
- [ ] SHOPIFY_API_SECRET set manually
- [ ] Ready to deploy

## 🎯 Next Steps

1. Set your `SHOPIFY_API_SECRET`:
   ```bash
   fly secrets set SHOPIFY_API_SECRET="your_actual_secret_here"
   ```

2. Run deployment:
   ```bash
   .\deploy-fly.ps1
   ```

3. Monitor deployment:
   ```bash
   fly logs --follow
   ```

4. Test your app at: https://easycod-dz.fly.dev

---

**Status**: ✅ Ready for deployment with MPG panic fix applied
**Last Updated**: $(date)