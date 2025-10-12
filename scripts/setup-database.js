#!/usr/bin/env node

/**
 * Database setup script for production deployment
 * Ensures database is properly initialized with all required tables
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

async function setupDatabase() {
  console.log('🔧 Setting up database...');
  
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('✅ DATABASE_URL is configured');
    
    // Create Prisma client
    const prisma = new PrismaClient();
    
    // Test database connection
    console.log('🔌 Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection established');
    
    // Check if session table exists
    console.log('🔍 Checking for session table...');
    try {
      await prisma.$queryRaw`SELECT 1 FROM "Session" LIMIT 1`;
      console.log('✅ Session table exists');
    } catch (error) {
      console.log('⚠️ Session table not found, running migrations...');
      
      // Run Prisma migrations
      console.log('📦 Running Prisma migrations...');
      execSync('npx prisma migrate deploy', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      console.log('✅ Database migrations completed');
    }
    
    // Check if ShopSettings table exists
    console.log('🔍 Checking for ShopSettings table...');
    try {
      await prisma.$queryRaw`SELECT 1 FROM "ShopSettings" LIMIT 1`;
      console.log('✅ ShopSettings table exists');
    } catch (error) {
      console.log('⚠️ ShopSettings table not found');
      throw new Error('ShopSettings table is missing after migrations');
    }
    
    // Generate Prisma client
    console.log('🔧 Generating Prisma client...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      env: { ...process.env }
    });
    console.log('✅ Prisma client generated');
    
    await prisma.$disconnect();
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Verify DATABASE_URL is set correctly');
    console.error('2. Ensure database is accessible from deployment environment');
    console.error('3. Check that database user has proper permissions');
    console.error('4. Verify Prisma schema is up to date');
    process.exit(1);
  }
}

// Run the setup
setupDatabase();
