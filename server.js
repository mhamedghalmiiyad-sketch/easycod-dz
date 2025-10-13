#!/usr/bin/env node

/**
 * Custom server script for Render deployment
 * Ensures proper environment variable handling and validation
 */

// CRITICAL: Log environment variables IMMEDIATELY at startup
console.log('=== EARLY ENVIRONMENT VARIABLE DIAGNOSTIC ===');
console.log('Timestamp:', new Date().toISOString());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Current working directory:', process.cwd());
console.log('Process arguments:', process.argv);

// Additional Render-specific debugging
console.log('=== RENDER ENVIRONMENT DEBUGGING ===');
console.log('RENDER environment variable:', process.env.RENDER ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('PORT:', process.env.PORT || 'NOT SET');
console.log('Total environment variables count:', Object.keys(process.env).length);
console.log('Environment variables starting with SHOPIFY:', Object.keys(process.env).filter(key => key.startsWith('SHOPIFY')));
console.log('=====================================');

// Log ALL environment variables (be careful with secrets in production)
console.log('\n=== ALL ENVIRONMENT VARIABLES ===');
Object.keys(process.env).sort().forEach(key => {
  if (key.includes('SHOPIFY') || key.includes('SCOPE') || key.includes('NODE') || key.includes('PORT')) {
    const value = process.env[key];
    if (key.includes('SECRET') || key.includes('KEY')) {
      console.log(`${key}: ${value ? '[PRESENT - ' + value.length + ' chars]' : '[MISSING]'}`);
    } else {
      console.log(`${key}: ${value || '[MISSING]'}`);
    }
  }
});

console.log('\n=== SHOPIFY-SPECIFIC VARIABLES ===');
console.log('SHOPIFY_API_KEY:', process.env.SHOPIFY_API_KEY ? '[PRESENT - ' + process.env.SHOPIFY_API_KEY.length + ' chars]' : '[MISSING]');
console.log('SHOPIFY_API_SECRET:', process.env.SHOPIFY_API_SECRET ? '[PRESENT - ' + process.env.SHOPIFY_API_SECRET.length + ' chars]' : '[MISSING]');
console.log('SHOPIFY_APP_URL:', process.env.SHOPIFY_APP_URL || '[MISSING]');
console.log('SCOPES:', process.env.SCOPES || '[MISSING]');
console.log('SHOP_CUSTOM_DOMAIN:', process.env.SHOP_CUSTOM_DOMAIN || '[NOT SET]');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '[PRESENT]' : '[MISSING]');
console.log('NODE_ENV:', process.env.NODE_ENV || '[NOT SET]');
console.log('PORT:', process.env.PORT || '[NOT SET]');
console.log('==========================================\n');

import { createRequestHandler } from "@remix-run/node";
import { installGlobals } from "@remix-run/node";

installGlobals();

// Environment variable validation
const requiredEnvVars = [
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET', 
  'SHOPIFY_APP_URL',
  'SCOPES',
  'DATABASE_URL'
];

console.log('=== Environment Variable Validation ===');
const missingVars = [];
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingVars.push(varName);
    console.log(`❌ ${varName}: MISSING`);
  } else {
    console.log(`✅ ${varName}: SET`);
  }
});

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please check your Render service environment variables configuration.');
  process.exit(1);
}

const port = process.env.PORT || 8080;
const host = "0.0.0.0";

console.log(`✅ All required environment variables are present`);
console.log(`🚀 Starting server on ${host}:${port}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

// CRITICAL: Ensure environment variables are available to the built application
console.log('🔧 Setting up environment variables for built application...');
console.log('Environment variables before importing built app:');
console.log(`SHOPIFY_API_KEY: ${process.env.SHOPIFY_API_KEY ? '[PRESENT]' : '[MISSING]'}`);
console.log(`SHOPIFY_API_SECRET: ${process.env.SHOPIFY_API_SECRET ? '[PRESENT]' : '[MISSING]'}`);
console.log(`SHOPIFY_APP_URL: ${process.env.SHOPIFY_APP_URL || '[MISSING]'}`);
console.log(`SCOPES: ${process.env.SCOPES || '[MISSING]'}`);

// CRITICAL: Set environment variables globally before importing the built app
// This ensures they're available when the built application loads
global.process = global.process || process;
if (!global.process.env) {
  global.process.env = {};
}

// Copy all environment variables to global scope
Object.keys(process.env).forEach(key => {
  global.process.env[key] = process.env[key];
});

// CRITICAL: Auto-detect Render URL for proper URL handling
if (!process.env.SHOPIFY_APP_URL && process.env.RENDER_EXTERNAL_URL) {
  process.env.SHOPIFY_APP_URL = process.env.RENDER_EXTERNAL_URL;
  console.log(`🔧 Auto-detected SHOPIFY_APP_URL from RENDER_EXTERNAL_URL: ${process.env.SHOPIFY_APP_URL}`);
}

// --- Migration Verification & Auto-Fix Block ---
console.log('🔍 Starting migration verification and auto-fix...');
try {
  // Import Prisma client for migration verification
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  // Test database connection first
  await prisma.$connect();
  console.log('✅ Database connection established');
  
  // Check for failed or incomplete migrations
  console.log('🔍 Checking Prisma migrations...');
  const failed = await prisma.$queryRaw`
    SELECT migration_name, applied_steps_count, finished_at
    FROM "_prisma_migrations"
    WHERE finished_at IS NULL OR applied_steps_count = 0;
  `;

  if (failed.length > 0) {
    console.warn('⚠️ Found failed migrations:', failed);
    console.log('🧹 Cleaning up failed migration records...');
    
    // Clean up failed migration records
    await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations"
      WHERE finished_at IS NULL OR applied_steps_count = 0;
    `;
    console.log('✅ Cleaned up failed migrations');

    // Re-run migrations after cleanup
    console.log('📦 Re-running migrations...');
    const { execSync } = await import('child_process');
    
    // Generate Prisma client first
    console.log('🔧 Generating Prisma client...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    // Deploy migrations
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log('✅ Re-applied migrations successfully');
  } else {
    console.log('✅ All migrations verified successfully');
  }
  
  // Verify session table exists
  try {
    await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
    console.log('✅ Session table exists');
  } catch (error) {
    console.log('⚠️ Session table not found, running migrations...');
    
    try {
      // Run Prisma migrations
      console.log('📦 Running Prisma migrations...');
      const { execSync } = await import('child_process');
      
      // First, try to generate the Prisma client to ensure schema is up to date
      console.log('🔧 Generating Prisma client...');
      execSync('npx prisma generate', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      
      // Then run migrations
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('✅ Database migrations completed');
      
      // Verify session table exists after migrations
      await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
      console.log('✅ Session table verified after migrations');
    } catch (migrationError) {
      console.error('❌ Database migration failed:', migrationError.message);
      
      // Check if it's a provider mismatch error
      if (migrationError.message.includes('P3019') || migrationError.message.includes('provider')) {
        console.error('🔧 Provider mismatch detected. This usually happens when switching from SQLite to PostgreSQL.');
        console.error('🔧 The migration lock file has been updated to match the PostgreSQL provider.');
        console.error('🔧 Please redeploy the application to apply the changes.');
      }
      
      // Check if it's a syntax error (SQLite vs PostgreSQL)
      if (migrationError.message.includes('AUTOINCREMENT') || migrationError.message.includes('syntax error')) {
        console.error('🔧 SQL syntax error detected. This usually happens when SQLite migrations are applied to PostgreSQL.');
        console.error('🔧 The migration files have been updated to use PostgreSQL-compatible syntax.');
        console.error('🔧 Please redeploy the application to apply the new migrations.');
      }
      
      // Check if it's a migration state error
      if (migrationError.message.includes('P3018') || migrationError.message.includes('migration failed to apply')) {
        console.error('🔧 Migration state error detected. This usually happens when previous migrations failed.');
        console.error('🔧 The migration history has been reset with PostgreSQL-compatible migrations.');
        console.error('🔧 Please redeploy the application to apply the new migrations.');
      }
      
      // Check if it's a failed migration state error (P3009)
      if (migrationError.message.includes('P3009') || migrationError.message.includes('failed migrations in the target database')) {
        console.error('🔧 Failed migration state detected. The database has records of failed migrations.');
        console.error('🔧 Attempting to resolve migration issues...');
        
        try {
          // Use the migration resolution script
          const { execSync } = await import('child_process');
          console.log('🔄 Running migration resolution script...');
          execSync('node scripts/resolve-migration-issues.js', { 
            stdio: 'inherit',
            env: { ...process.env }
          });
          console.log('✅ Migration resolution completed');
          
          // Verify session table exists after migrations
          await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
          console.log('✅ Session table verified after migrations');
          console.log('✅ Migration issues resolved successfully');
          // Continue with normal flow instead of return
        } catch (resetError) {
          console.error('❌ Failed to resolve migration issues:', resetError.message);
          console.error('🔧 Attempting direct database cleanup...');
          
          try {
            // Try to directly clean the migration table
            console.log('🔄 Cleaning migration history table...');
            await prisma.$executeRaw`DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL`;
            console.log('✅ Migration history cleaned');
            
            // Now try to run migrations again
            console.log('🔄 Retrying migrations after cleanup...');
            execSync('npx prisma migrate deploy', { 
              stdio: 'inherit',
              env: { ...process.env }
            });
            console.log('✅ Database migrations completed after cleanup');
            
            // Verify session table exists after migrations
            await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
            console.log('✅ Session table verified after migrations');
            console.log('✅ Migration cleanup and deployment completed successfully');
          } catch (cleanupError) {
            console.error('❌ Database cleanup failed:', cleanupError.message);
            console.error('🔧 Manual database cleanup may be required.');
            console.error('🔧 You may need to drop and recreate the database or manually clean the _prisma_migrations table.');
          }
        }
      }
      
      console.error('🔧 Database setup failed. Please check:');
      console.error('1. DATABASE_URL is set correctly');
      console.error('2. Database is accessible');
      console.error('3. Database user has proper permissions');
      console.error('4. Migration lock file matches the database provider');
      console.error('5. Migration files use PostgreSQL-compatible syntax');
      process.exit(1);
    }
  }
  
  await prisma.$disconnect();
  console.log('✅ Migration verification and auto-fix completed');
} catch (dbError) {
  console.error('❌ Database connection failed:', dbError.message);
  console.error('🔧 Make sure DATABASE_URL is set correctly in your environment variables');
  process.exit(1);
}

// Import the built server
const build = await import("./build/server/index.js");

// Create a URL-safe request handler wrapper
const createUrlSafeRequestHandler = (build, mode) => {
  const originalHandler = createRequestHandler(build, mode);
  
  return async (req, res) => {
    try {
      // Ensure we always have an absolute URL for Remix
      if (!req.url.startsWith('http')) {
        const baseUrl = process.env.SHOPIFY_APP_URL || `https://${req.headers.host}`;
        const fullUrl = new URL(req.url, baseUrl);
        req.url = fullUrl.toString();
      }
      
      return await originalHandler(req, res);
    } catch (error) {
      console.error("URL construction error:", error);
      console.error("Request URL:", req.url);
      console.error("Request headers:", req.headers);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  };
};

const requestHandler = createUrlSafeRequestHandler(build, process.env.NODE_ENV);

// Create a simple HTTP server
import { createServer } from "http";

const server = createServer((req, res) => {
  requestHandler(req, res).catch((error) => {
    console.error("Request handler error:", error);
    res.statusCode = 500;
    res.end("Internal Server Error");
  });
});

server.listen(port, host, () => {
  console.log(`✅ Server is running on http://${host}:${port}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
