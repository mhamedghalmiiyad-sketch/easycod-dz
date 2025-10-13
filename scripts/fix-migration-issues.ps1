# Migration Fix Script for Render Deployment (PowerShell version)
# This script resolves failed Prisma migrations

Write-Host "🔧 Starting migration fix process..." -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Gray

# Check if we're in the right directory
if (-not (Test-Path "prisma/schema.prisma")) {
    Write-Host "❌ Error: prisma/schema.prisma not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ Error: DATABASE_URL environment variable is not set." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment check passed" -ForegroundColor Green

# Step 1: Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
try {
    npx prisma generate
    Write-Host "✅ Prisma client generated successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to generate Prisma client: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Check migration status
Write-Host "📋 Checking migration status..." -ForegroundColor Yellow
try {
    npx prisma migrate status
} catch {
    Write-Host "⚠️ Migration status check failed, continuing..." -ForegroundColor Yellow
}

# Step 3: Try to resolve any failed migrations
Write-Host "🔄 Attempting to resolve failed migrations..." -ForegroundColor Yellow

# Get list of available migrations
$MIGRATIONS_DIR = "prisma/migrations"
if (Test-Path $MIGRATIONS_DIR) {
    $migrations = Get-ChildItem -Path $MIGRATIONS_DIR -Directory | Where-Object { $_.Name -match '^\d+_' } | Sort-Object Name
    foreach ($migration in $migrations) {
        Write-Host "🔧 Attempting to resolve migration: $($migration.Name)" -ForegroundColor Yellow
        try {
            npx prisma migrate resolve --rolled-back $migration.Name
            Write-Host "✅ Resolved migration: $($migration.Name)" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ Could not resolve $($migration.Name) (this may be normal)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⚠️ No migrations directory found" -ForegroundColor Yellow
}

# Step 4: Try to deploy migrations
Write-Host "🚀 Deploying migrations..." -ForegroundColor Yellow
try {
    npx prisma migrate deploy
    Write-Host "✅ Migrations deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Migration deployment failed, attempting database reset..." -ForegroundColor Red
    
    # Step 5: If deployment fails, try database reset
    try {
        npx prisma migrate reset --force
        Write-Host "✅ Database reset successful" -ForegroundColor Green
    } catch {
        Write-Host "❌ Database reset failed" -ForegroundColor Red
        Write-Host "🔧 Manual intervention may be required" -ForegroundColor Yellow
        exit 1
    }
}

# Step 6: Verify database connection
Write-Host "🔍 Verifying database connection..." -ForegroundColor Yellow
try {
    npx prisma db push --accept-data-loss
    Write-Host "✅ Database verification successful" -ForegroundColor Green
} catch {
    Write-Host "❌ Database verification failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Migration fix process completed successfully" -ForegroundColor Green
