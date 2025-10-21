#!/usr/bin/env node

/**
 * Verify Session Permissions Script - Production Version
 * 
 * This script checks the session details after reinstallation to verify
 * that the new token has the correct permissions.
 * 
 * Usage: DATABASE_URL="your_database_url" node scripts/verify-session-production.js
 */

import { PrismaClient } from '@prisma/client';

// Use the provided DATABASE_URL or the one from environment
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://easycod_dz_db_user:9K8hnx0GqxEAfh6pDkjTOufnOhd8iXNk@dpg-d3m1uh7diees73a95f2g-a/easycod_dz_db';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

const SHOP_DOMAIN = 'cod-form-builder-dev.myshopify.com';

async function main() {
    console.log('🔍 Session Permissions Verification - Production');
    console.log('===============================================\n');

    try {
        // Check if session exists
        const session = await prisma.session.findUnique({
            where: { shop: SHOP_DOMAIN },
            select: {
                id: true,
                shop: true,
                scope: true,
                expires: true,
                accessToken: true,
                createdAt: true,
                isOnline: true
            }
        });

        if (!session) {
            console.log('❌ No session found for shop:', SHOP_DOMAIN);
            console.log('   Please reinstall the app first.');
            return;
        }

        console.log('📊 Session Details:');
        console.log(`   Shop: ${session.shop}`);
        console.log(`   Session ID: ${session.id}`);
        console.log(`   Is Online: ${session.isOnline}`);
        console.log(`   Created: ${session.createdAt}`);
        console.log(`   Expires: ${session.expires || 'Never'}`);
        console.log(`   Access Token (first 20 chars): ${session.accessToken.substring(0, 20)}...`);

        // Check scope
        console.log('\n🔐 Scope Analysis:');
        if (session.scope) {
            const scopes = session.scope.split(',').map(s => s.trim());
            console.log(`   Total scopes: ${scopes.length}`);
            console.log('   Scopes:');
            scopes.forEach(scope => {
                const isWriteDraftOrders = scope === 'write_draft_orders';
                const icon = isWriteDraftOrders ? '✅' : '📋';
                console.log(`     ${icon} ${scope}`);
            });

            const hasWriteDraftOrders = scopes.includes('write_draft_orders');
            if (hasWriteDraftOrders) {
                console.log('\n✅ SUCCESS: write_draft_orders permission is present!');
                console.log('   Your app should now be able to create draft orders.');
                console.log('   The 401 Unauthorized error should be resolved.');
            } else {
                console.log('\n❌ PROBLEM: write_draft_orders permission is missing!');
                console.log('   The session token does not have the required permission.');
                console.log('   Please check your Partner Dashboard configuration.');
                console.log('   You may need to reinstall the app again.');
            }
        } else {
            console.log('   ❌ No scope information available');
            console.log('   This indicates a problem with the session token.');
        }

        // Check related data
        console.log('\n📋 Related Data:');
        const shopSettings = await prisma.shopSettings.findUnique({
            where: { shopId: SHOP_DOMAIN }
        });

        if (shopSettings) {
            console.log('   ✅ ShopSettings found');
        } else {
            console.log('   ⚠️  ShopSettings not found (this is normal for fresh installs)');
        }

        const appProxy = await prisma.appProxy.findUnique({
            where: { shopId: SHOP_DOMAIN }
        });

        if (appProxy) {
            console.log('   ✅ AppProxy found');
        } else {
            console.log('   ⚠️  AppProxy not found (this is normal for fresh installs)');
        }

        // Test GraphQL access (optional)
        console.log('\n🧪 Testing GraphQL Access:');
        console.log('   To test if the token works, try submitting your COD form.');
        console.log('   If you get a 401 error, the token still lacks permissions.');
        console.log('   If the form submits successfully, the issue is resolved!');

        // Additional troubleshooting info
        if (session.scope && !session.scope.includes('write_draft_orders')) {
            console.log('\n🔧 Troubleshooting Steps:');
            console.log('   1. Go to Partner Dashboard -> Apps -> alma COd');
            console.log('   2. Click "App setup" -> "Admin API access scopes" -> "Edit"');
            console.log('   3. Verify "write_draft_orders" is checked');
            console.log('   4. Click "SAVE"');
            console.log('   5. Reinstall the app completely');
            console.log('   6. Run this verification script again');
        }

    } catch (error) {
        console.error('❌ Error during verification:', error);
        
        if (error.code === 'P1001') {
            console.log('\n💡 Database connection error.');
            console.log('   Check your DATABASE_URL and network connectivity.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
});
