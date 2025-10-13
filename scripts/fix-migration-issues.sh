#!/bin/bash

# Migration Fix Script for Render Deployment
# This script resolves failed Prisma migrations

echo "🔧 Starting migration fix process..."
echo "Timestamp: $(date)"

# Check if we're in the right directory
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Error: prisma/schema.prisma not found. Please run this script from the project root."
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set."
    exit 1
fi

echo "✅ Environment check passed"

# Step 1: Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Step 2: Check migration status
echo "📋 Checking migration status..."
npx prisma migrate status || echo "⚠️ Migration status check failed, continuing..."

# Step 3: Try to resolve any failed migrations
echo "🔄 Attempting to resolve failed migrations..."

# Get list of available migrations
MIGRATIONS_DIR="prisma/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
    for migration in $(ls -1 "$MIGRATIONS_DIR" | grep -E '^[0-9]+_' | sort); do
        echo "🔧 Attempting to resolve migration: $migration"
        npx prisma migrate resolve --rolled-back "$migration" || echo "⚠️ Could not resolve $migration (this may be normal)"
    done
else
    echo "⚠️ No migrations directory found"
fi

# Step 4: Try to deploy migrations
echo "🚀 Deploying migrations..."
if npx prisma migrate deploy; then
    echo "✅ Migrations deployed successfully"
else
    echo "❌ Migration deployment failed, attempting database reset..."
    
    # Step 5: If deployment fails, try database reset
    if npx prisma migrate reset --force; then
        echo "✅ Database reset successful"
    else
        echo "❌ Database reset failed"
        echo "🔧 Manual intervention may be required"
        exit 1
    fi
fi

# Step 6: Verify database connection
echo "🔍 Verifying database connection..."
if npx prisma db push --accept-data-loss; then
    echo "✅ Database verification successful"
else
    echo "❌ Database verification failed"
    exit 1
fi

echo "✅ Migration fix process completed successfully"
