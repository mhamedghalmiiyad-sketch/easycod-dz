#!/usr/bin/env node

/**
 * Delete Session Script for Render Deployment
 * 
 * This script is designed to be run directly on your Render deployment
 * to delete the old session and force a fresh token generation.
 * 
 * Usage on Render:
 * 1. SSH into your Render deployment
 * 2. Run: node scripts/delete-session-render.js
 * 
 * Or add this as a one-time build command in Render
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SHOP_DOMAIN = 'cod-form-builder-dev.myshopify.com';

async function main() {
    console.log('🔄 Deleting Old Session for Fresh Token Generation');
    console.log('================================================\n');

    try {
        // Check current session
        console.log('📋 Checking current session...');
        const existingSession = await prisma.session.findUnique({
            where: { shop: SHOP_DOMAIN },
            select: {
                id: true,
                shop: true,
                scope: true,
                createdAt: true
            }
        });

        if (!existingSession) {
            console.log('✅ No session found - already clean!');
            return;
        }

        console.log('📊 Current session:');
        console.log(`   Shop: ${existingSession.shop}`);
        console.log(`   Scope: ${existingSession.scope || 'Not set'}`);
        console.log(`   Created: ${existingSession.createdAt}`);

        // Check if write_draft_orders is missing
        const hasWriteDraftOrders = existingSession.scope && existingSession.scope.includes('write_draft_orders');
        if (hasWriteDraftOrders) {
            console.log('✅ Session already has write_draft_orders permission!');
            console.log('   No need to delete - the issue might be elsewhere.');
            return;
        }

        console.log('❌ Session missing write_draft_orders permission');
        console.log('🗑️  Deleting session and related data...');

        // Delete related records first
        await prisma.shopSettings.deleteMany({ where: { shopId: SHOP_DOMAIN } });
        await prisma.appProxy.deleteMany({ where: { shopId: SHOP_DOMAIN } });
        await prisma.orderTracking.deleteMany({ where: { shopId: SHOP_DOMAIN } });
        await prisma.abandonedCart.deleteMany({ where: { shopId: SHOP_DOMAIN } });
        
        // Delete main session
        await prisma.session.delete({ where: { shop: SHOP_DOMAIN } });

        console.log('✅ Session deleted successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Go to Partner Dashboard -> Apps -> alma COd');
        console.log('2. Verify "write_draft_orders" is in Admin API scopes');
        console.log('3. Click "Test on development store" -> "cod-form-builder-dev"');
        console.log('4. Install the app to generate fresh token');
        console.log('5. Test your COD form submission');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
