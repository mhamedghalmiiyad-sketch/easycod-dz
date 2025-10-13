#!/usr/bin/env node

/**
 * Fix Stuck Migration Script
 * Specifically handles the stuck migration 20250727203118_init
 * This script can be run locally or on Render to resolve the P3009 error
 */

import { execSync } from 'child_process';

console.log('🔧 Fix Stuck Migration Script Starting...');
console.log('Timestamp:', new Date().toISOString());
console.log('Target migration: 20250727203118_init');

async function fixStuckMigration() {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable is not set');
      console.error('Please set DATABASE_URL before running this script');
      process.exit(1);
    }

    console.log('✅ DATABASE_URL is set');
    console.log('Database URL:', process.env.DATABASE_URL.replace(/\/\/.*@/, '//***:***@'));

    // Method 1: Try to resolve the migration as applied
    console.log('\n🔄 Method 1: Resolving migration as applied...');
    try {
      execSync('npx prisma migrate resolve --applied 20250727203118_init', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('✅ Successfully resolved migration as applied');
      
      // Now try to deploy migrations
      console.log('\n🚀 Deploying remaining migrations...');
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('✅ All migrations deployed successfully');
      return true;
      
    } catch (resolveError) {
      console.log('⚠️ Method 1 failed:', resolveError.message);
      
      // Method 2: Try to resolve as rolled back
      console.log('\n🔄 Method 2: Resolving migration as rolled back...');
      try {
        execSync('npx prisma migrate resolve --rolled-back 20250727203118_init', { 
          stdio: 'inherit',
          env: { ...process.env }
        });
        console.log('✅ Successfully resolved migration as rolled back');
        
        // Now try to deploy migrations
        console.log('\n🚀 Deploying remaining migrations...');
        execSync('npx prisma migrate deploy', { 
          stdio: 'inherit',
          env: { ...process.env }
        });
        console.log('✅ All migrations deployed successfully');
        return true;
        
      } catch (rollbackError) {
        console.log('⚠️ Method 2 failed:', rollbackError.message);
        
        // Method 3: Direct database cleanup
        console.log('\n🔄 Method 3: Direct database cleanup...');
        try {
          // Import Prisma client for direct database access
          const { PrismaClient } = await import("@prisma/client");
          const prisma = new PrismaClient();
          
          console.log('🔗 Connecting to database...');
          await prisma.$connect();
          
          // Check if the failed migration exists
          console.log('🔍 Checking for failed migration...');
          const failedMigrations = await prisma.$queryRaw`
            SELECT migration_name, applied_steps_count, finished_at, started_at 
            FROM "_prisma_migrations" 
            WHERE migration_name = '20250727203118_init'
          `;
          
          console.log('Found failed migrations:', failedMigrations);
          
          if (failedMigrations.length > 0) {
            console.log('🗑️ Deleting failed migration record...');
            await prisma.$executeRaw`
              DELETE FROM "_prisma_migrations" 
              WHERE migration_name = '20250727203118_init'
            `;
            console.log('✅ Failed migration record deleted');
          } else {
            console.log('ℹ️ No failed migration record found');
          }
          
          // Also clean up any other failed migrations
          console.log('🧹 Cleaning up any other failed migrations...');
          const deletedCount = await prisma.$executeRaw`
            DELETE FROM "_prisma_migrations" 
            WHERE finished_at IS NULL AND applied_steps_count = 0
          `;
          console.log(`✅ Cleaned up ${deletedCount} failed migration records`);
          
          await prisma.$disconnect();
          
          // Now try to deploy migrations
          console.log('\n🚀 Deploying migrations after cleanup...');
          execSync('npx prisma migrate deploy', { 
            stdio: 'inherit',
            env: { ...process.env }
          });
          console.log('✅ All migrations deployed successfully after cleanup');
          return true;
          
        } catch (cleanupError) {
          console.error('❌ Method 3 failed:', cleanupError.message);
          return false;
        }
      }
    }

  } catch (error) {
    console.error('❌ Fix stuck migration failed:', error.message);
    return false;
  }
}

// Run the fix
fixStuckMigration().then(success => {
  if (success) {
    console.log('\n✅ Stuck migration fixed successfully!');
    console.log('🎉 Your database is now ready for deployment');
    process.exit(0);
  } else {
    console.log('\n❌ Failed to fix stuck migration');
    console.log('🔧 You may need to manually clean the database');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
