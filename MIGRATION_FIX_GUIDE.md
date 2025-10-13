# Migration Fix Guide

This guide explains how to fix the P3009 "failed migrations in the target database" error that can occur during deployment.

## Problem Description

The error occurs when:
- A previous migration failed during deployment
- The database has records of failed migrations in the `_prisma_migrations` table
- New migrations cannot be applied because of the failed state

## Error Message
```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20250727203118_init` migration started at 2025-10-12 22:01:49.198017 UTC failed
```

## Automatic Fix (Server.js)

The `server.js` file has been updated with automatic migration resolution:

1. **Primary Fix**: Runs the migration resolution script
2. **Fallback Fix**: Directly cleans the migration table
3. **Verification**: Ensures the Session table exists after fixes

## Manual Fix Scripts

### Option 1: Node.js Script
```bash
node scripts/resolve-migration-issues.js
```

### Option 2: Bash Script (Linux/Mac)
```bash
chmod +x scripts/fix-migration-issues.sh
./scripts/fix-migration-issues.sh
```

### Option 3: PowerShell Script (Windows)
```powershell
.\scripts\fix-migration-issues.ps1
```

## Manual Database Cleanup

If all automated methods fail, you can manually clean the database:

### Method 1: Reset Migration State
```bash
npx prisma migrate resolve --rolled-back 20250101000000_init
npx prisma migrate deploy
```

### Method 2: Clean Migration Table
```sql
DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL;
```

### Method 3: Database Reset (⚠️ Data Loss)
```bash
npx prisma migrate reset --force
```

## Prevention

To prevent this issue in the future:

1. **Always test migrations locally** before deploying
2. **Use staging environment** to test migrations
3. **Monitor deployment logs** for migration failures
4. **Keep migration files in sync** between environments

## Environment Variables Required

Make sure these environment variables are set:
- `DATABASE_URL`: PostgreSQL connection string
- `SHOPIFY_API_KEY`: Shopify app API key
- `SHOPIFY_API_SECRET`: Shopify app secret
- `SHOPIFY_APP_URL`: App URL
- `SCOPES`: Required Shopify scopes

## Troubleshooting

### If migrations still fail:
1. Check database connectivity
2. Verify user permissions
3. Check for syntax errors in migration files
4. Ensure migration lock file matches database provider

### If Session table is missing:
1. Run `npx prisma db push` to sync schema
2. Check if all required tables are created
3. Verify foreign key constraints

## Support

If you continue to experience issues:
1. Check the deployment logs for specific error messages
2. Verify all environment variables are set correctly
3. Test database connectivity manually
4. Consider recreating the database if corruption is suspected
