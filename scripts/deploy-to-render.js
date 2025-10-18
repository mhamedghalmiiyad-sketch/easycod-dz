#!/usr/bin/env node

/**
 * Deploy script for Render.com
 * This script helps ensure all environment variables are properly set
 */

import { readFileSync } from 'fs';

async function main() {
  console.log('🚀 Starting Render deployment preparation...');

  // Check if we're in the right directory
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    if (packageJson.name !== 'easycod-dz') {
      throw new Error('Not in the correct project directory');
    }
  } catch (error) {
    console.error('❌ Error: Not in the correct project directory');
    process.exit(1);
  }

  console.log('✅ Project directory verified');

  // Environment variables that should be set in Render dashboard
  const requiredEnvVars = [
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET', 
    'SCOPES',
    'DATABASE_URL',
    'SESSION_SECRET'
  ];

  const optionalEnvVars = [
    'SHOPIFY_APP_URL' // Has fallback to https://easycod-dz-1.onrender.com
  ];

  console.log('\n📋 Environment Variables Checklist:');
  console.log('Required variables (must be set in Render dashboard):');
  requiredEnvVars.forEach(envVar => {
    console.log(`  - ${envVar}`);
  });

  console.log('\nOptional variables:');
  optionalEnvVars.forEach(envVar => {
    console.log(`  - ${envVar} (has fallback)`);
  });

  console.log('\n🔧 Render Dashboard Setup:');
  console.log('1. Go to your Render dashboard');
  console.log('2. Navigate to your web service');
  console.log('3. Go to Environment tab');
  console.log('4. Add the required environment variables');
  console.log('5. For SHOPIFY_APP_URL, use: https://easycod-dz-1.onrender.com');
  console.log('\n⚠️ IMPORTANT: Make sure to set the actual values, not empty strings!');
  console.log('   - SHOPIFY_API_KEY should be your app\'s API key from Shopify Partners');
  console.log('   - SHOPIFY_API_SECRET should be your app\'s API secret from Shopify Partners');
  console.log('   - These are found in your Shopify Partners dashboard under your app');

  console.log('\n📝 Example SCOPES value:');
  console.log('read_draft_orders,read_metaobject_definitions,read_metaobjects,read_online_store_pages,read_products,read_orders,write_draft_orders,write_metaobject_definitions,write_metaobjects,write_online_store_pages,write_products,write_orders');

  console.log('\n✅ Deployment preparation complete!');
  console.log('💡 After setting environment variables in Render dashboard, trigger a new deployment.');
}

main().catch(console.error);