#!/usr/bin/env node

/**
 * Migration Resolution Script
 * Automatically detects and resolves failed Prisma migrations
 */

import { execSync } from 'child_process';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

console.log('🔧 Migration Resolution Script Starting...');
console.log('Timestamp:', new Date().toISOString());

async function resolveMigrationIssues() {
  try {
    // Check current migration status
    console.log('📋 Checking migration status...');
    try {
      const statusOutput = execSync('npx prisma migrate status', { 
        encoding: 'utf8',
        env: { ...process.env }
      });
      console.log('Migration status:', statusOutput);
    } catch (statusError) {
      console.log('Migration status check failed:', statusError.message);
    }

    // Get list of available migrations
    const migrationsDir = join(process.cwd(), 'prisma', 'migrations');
    console.log('📁 Checking migrations directory:', migrationsDir);
    
    let availableMigrations = [];
    try {
      const migrationDirs = readdirSync(migrationsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && dirent.name !== 'migration_lock.toml')
        .map(dirent => dirent.name)
        .sort();
      
      availableMigrations = migrationDirs;
      console.log('Available migrations:', availableMigrations);
    } catch (error) {
      console.error('Error reading migrations directory:', error.message);
      return false;
    }

    // Try to resolve any failed migrations
    console.log('🔄 Attempting to resolve failed migrations...');
    
    // First, try to resolve the specific stuck migration
    const stuckMigration = '20250727203118_init';
    console.log(`🔧 Attempting to resolve stuck migration: ${stuckMigration}`);
    
    try {
      // Try as applied first
      execSync(`npx prisma migrate resolve --applied ${stuckMigration}`, { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log(`✅ Successfully resolved migration as applied: ${stuckMigration}`);
    } catch (appliedError) {
      console.log(`⚠️ Could not resolve as applied: ${appliedError.message}`);
      
      try {
        // Try as rolled back
        execSync(`npx prisma migrate resolve --rolled-back ${stuckMigration}`, { 
          stdio: 'inherit',
          env: { ...process.env }
        });
        console.log(`✅ Successfully resolved migration as rolled back: ${stuckMigration}`);
      } catch (rollbackError) {
        console.log(`⚠️ Could not resolve as rolled back: ${rollbackError.message}`);
        console.log(`🔧 Will attempt direct database cleanup for ${stuckMigration}`);
      }
    }
    
    // Then try to resolve any other failed migrations
    for (const migration of availableMigrations) {
      if (migration === stuckMigration) continue; // Already handled above
      
      try {
        console.log(`🔧 Resolving migration: ${migration}`);
        execSync(`npx prisma migrate resolve --rolled-back ${migration}`, { 
          stdio: 'inherit',
          env: { ...process.env }
        });
        console.log(`✅ Successfully resolved migration: ${migration}`);
      } catch (resolveError) {
        console.log(`⚠️ Could not resolve migration ${migration}:`, resolveError.message);
        // This is expected for migrations that aren't in failed state
      }
    }

    // Try to deploy migrations
    console.log('🚀 Deploying migrations...');
    try {
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('✅ Migrations deployed successfully');
      return true;
    } catch (deployError) {
      console.error('❌ Migration deployment failed:', deployError.message);
      
      // If deployment still fails, try to reset the database
      if (deployError.message.includes('P3009') || deployError.message.includes('failed migrations')) {
        console.log('🔄 Attempting database reset...');
        try {
          execSync('npx prisma migrate reset --force', { 
            stdio: 'inherit',
            env: { ...process.env }
          });
          console.log('✅ Database reset successful');
          return true;
        } catch (resetError) {
          console.error('❌ Database reset failed:', resetError.message);
          return false;
        }
      }
      
      return false;
    }

  } catch (error) {
    console.error('❌ Migration resolution failed:', error.message);
    return false;
  }
}

// Run the resolution
resolveMigrationIssues().then(success => {
  if (success) {
    console.log('✅ Migration issues resolved successfully');
    process.exit(0);
  } else {
    console.log('❌ Failed to resolve migration issues');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
