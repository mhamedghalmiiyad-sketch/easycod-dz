#!/usr/bin/env node

/**
 * Force Fresh Session Script
 * 
 * This script helps resolve persistent 401 errors by:
 * 1. Deleting the old session from the database
 * 2. Verifying the deletion
 * 3. Providing instructions for reinstalling the app
 * 
 * Usage: node scripts/force-fresh-session.js
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();

const SHOP_DOMAIN = 'cod-form-builder-dev.myshopify.com';

async function main() {
    console.log('🔄 Force Fresh Session Script');
    console.log('=============================\n');

    try {
        // Step 1: Check if session exists
        console.log('📋 Step 1: Checking current session...');
        const existingSession = await prisma.session.findUnique({
            where: { shop: SHOP_DOMAIN },
            select: {
                id: true,
                shop: true,
                scope: true,
                expires: true,
                accessToken: true,
                createdAt: true
            }
        });

        if (!existingSession) {
            console.log('❌ No session found for shop:', SHOP_DOMAIN);
            console.log('✅ This means the session is already clean or the app was never installed.');
            return;
        }

        console.log('📊 Current session details:');
        console.log(`   Shop: ${existingSession.shop}`);
        console.log(`   Session ID: ${existingSession.id}`);
        console.log(`   Scope: ${existingSession.scope || 'Not set'}`);
        console.log(`   Expires: ${existingSession.expires || 'Never'}`);
        console.log(`   Created: ${existingSession.createdAt}`);
        console.log(`   Access Token (first 20 chars): ${existingSession.accessToken.substring(0, 20)}...`);

        // Step 2: Delete the session
        console.log('\n🗑️  Step 2: Deleting old session...');
        
        // Delete related records first (due to foreign key constraints)
        console.log('   Deleting related ShopSettings...');
        await prisma.shopSettings.deleteMany({
            where: { shopId: SHOP_DOMAIN }
        });

        console.log('   Deleting related AppProxy...');
        await prisma.appProxy.deleteMany({
            where: { shopId: SHOP_DOMAIN }
        });

        console.log('   Deleting related OrderTrackings...');
        await prisma.orderTracking.deleteMany({
            where: { shopId: SHOP_DOMAIN }
        });

        console.log('   Deleting related AbandonedCarts...');
        await prisma.abandonedCart.deleteMany({
            where: { shopId: SHOP_DOMAIN }
        });

        console.log('   Deleting main Session...');
        await prisma.session.delete({
            where: { shop: SHOP_DOMAIN }
        });

        console.log('✅ Session and all related data deleted successfully!');

        // Step 3: Verify deletion
        console.log('\n🔍 Step 3: Verifying deletion...');
        const deletedSession = await prisma.session.findUnique({
            where: { shop: SHOP_DOMAIN }
        });

        if (deletedSession) {
            console.log('❌ ERROR: Session still exists after deletion!');
            console.log('   This indicates a database constraint issue.');
            return;
        }

        console.log('✅ Verification successful - session completely removed');

        // Step 4: Provide next steps
        console.log('\n📋 Next Steps:');
        console.log('==============');
        console.log('1. Go to Partner Dashboard -> Apps -> alma COd');
        console.log('2. Click "App setup" -> "Admin API access scopes" -> "Edit"');
        console.log('3. Verify "write_draft_orders" is checked');
        console.log('4. Click "SAVE"');
        console.log('5. Go back to Apps -> alma COd');
        console.log('6. Click "Test on development store"');
        console.log('7. Select "cod-form-builder-dev"');
        console.log('8. On the installation screen, verify it shows "Create and modify draft orders" permission');
        console.log('9. Click "Install app"');
        console.log('10. Test your COD form submission immediately');

        console.log('\n🎯 Expected Result:');
        console.log('   A completely fresh session token will be generated with the correct permissions.');
        console.log('   The 401 Unauthorized error should be resolved.');

    } catch (error) {
        console.error('❌ Error during session deletion:', error);
        
        if (error.code === 'P2002') {
            console.log('\n💡 This error suggests a unique constraint violation.');
            console.log('   Try running the script again, or manually check your database.');
        } else if (error.code === 'P2025') {
            console.log('\n💡 This error suggests the record was already deleted.');
            console.log('   The session may have been cleaned up already.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the script
main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
});
