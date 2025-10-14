#!/usr/bin/env node

/**
 * Debug script to check session and shop settings status
 * Usage: node scripts/debug-sessions.js [shop-domain]
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();

async function debugSessions(shopDomain = null) {
  try {
    console.log('🔍 Debugging sessions and shop settings...\n');

    // Get all sessions
    const sessions = await prisma.session.findMany({
      select: {
        id: true,
        shop: true,
        isOnline: true,
        expires: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${sessions.length} sessions:`);
    sessions.forEach(session => {
      console.log(`  - ${session.shop} (ID: ${session.id}, Online: ${session.isOnline}, Expires: ${session.expires})`);
    });

    // Get all shop settings
    const shopSettings = await prisma.shopSettings.findMany({
      select: {
        id: true,
        shopId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n📊 Found ${shopSettings.length} shop settings:`);
    shopSettings.forEach(settings => {
      console.log(`  - ${settings.shopId} (ID: ${settings.id}, Created: ${settings.createdAt})`);
    });

    // Check for specific shop if provided
    if (shopDomain) {
      console.log(`\n🔍 Checking specific shop: ${shopDomain}`);
      
      const session = await prisma.session.findUnique({
        where: { shop: shopDomain }
      });

      const settings = await prisma.shopSettings.findUnique({
        where: { shopId: shopDomain }
      });

      console.log(`  Session exists: ${!!session}`);
      if (session) {
        console.log(`    - ID: ${session.id}`);
        console.log(`    - Online: ${session.isOnline}`);
        console.log(`    - Expires: ${session.expires}`);
        console.log(`    - Created: ${session.createdAt}`);
      }

      console.log(`  Shop settings exist: ${!!settings}`);
      if (settings) {
        console.log(`    - ID: ${settings.id}`);
        console.log(`    - Created: ${settings.createdAt}`);
        console.log(`    - Updated: ${settings.updatedAt}`);
      }

      if (!session) {
        console.log(`\n❌ No session found for ${shopDomain}`);
        console.log(`   This means the app hasn't been installed/authorized yet.`);
        console.log(`   The shop needs to go through the OAuth flow first.`);
      } else if (!settings) {
        console.log(`\n⚠️ Session exists but no shop settings found for ${shopDomain}`);
        console.log(`   This might indicate an issue with the shop settings initialization.`);
      } else {
        console.log(`\n✅ Both session and shop settings exist for ${shopDomain}`);
      }
    }

    // Check for orphaned records
    const orphanedSettings = await prisma.shopSettings.findMany({
      where: {
        Session: null
      }
    });

    if (orphanedSettings.length > 0) {
      console.log(`\n⚠️ Found ${orphanedSettings.length} orphaned shop settings (no corresponding session):`);
      orphanedSettings.forEach(settings => {
        console.log(`  - ${settings.shopId} (ID: ${settings.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error debugging sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get shop domain from command line arguments
const shopDomain = process.argv[2];

debugSessions(shopDomain);
