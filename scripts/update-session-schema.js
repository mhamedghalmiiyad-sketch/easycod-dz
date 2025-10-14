#!/usr/bin/env node

/**
 * Script to update the Session model in the database
 * This ensures the onlineAccessInfo field is added to existing Session tables
 */

const { PrismaClient } = require('@prisma/client');

async function updateSessionSchema() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Updating Session schema...');
    
    // Check if the onlineAccessInfo column exists
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Session' 
      AND column_name = 'onlineAccessInfo'
    `;
    
    if (result.length === 0) {
      console.log('➕ Adding onlineAccessInfo column to Session table...');
      await prisma.$executeRaw`
        ALTER TABLE "Session" 
        ADD COLUMN "onlineAccessInfo" JSONB
      `;
      console.log('✅ onlineAccessInfo column added successfully');
    } else {
      console.log('✅ onlineAccessInfo column already exists');
    }
    
    console.log('🎉 Session schema update completed');
    
  } catch (error) {
    console.error('❌ Error updating Session schema:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateSessionSchema();
