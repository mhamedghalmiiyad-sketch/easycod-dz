#!/usr/bin/env node

/**
 * Script to verify Shopify app configuration
 * Usage: node scripts/verify-config.js
 */

import { config } from 'dotenv';

// Load environment variables
config();

function verifyConfig() {
  console.log('🔍 Verifying Shopify App Configuration...\n');

  const requiredVars = [
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET', 
    'SHOPIFY_APP_URL',
    'SCOPES',
    'SESSION_SECRET'
  ];

  const missing = [];
  const present = [];

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
    } else {
      present.push(varName);
      // Don't log sensitive values
      if (varName === 'SHOPIFY_API_SECRET' || varName === 'SESSION_SECRET') {
        console.log(`✅ ${varName}: [PRESENT] (${value.length} characters)`);
      } else {
        console.log(`✅ ${varName}: ${value}`);
      }
    }
  });

  if (missing.length > 0) {
    console.log('\n❌ Missing required environment variables:');
    missing.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n🔧 Please set these variables in your environment or .env file');
    return false;
  }

  console.log('\n✅ All required environment variables are present');

  // Verify URL format
  const appUrl = process.env.SHOPIFY_APP_URL;
  if (appUrl && !appUrl.startsWith('https://')) {
    console.log('\n⚠️  Warning: SHOPIFY_APP_URL should start with https://');
  }

  // Verify scopes
  const scopes = process.env.SCOPES;
  if (scopes) {
    const scopeList = scopes.split(',').map(s => s.trim());
    console.log(`\n📋 Configured scopes (${scopeList.length}):`);
    scopeList.forEach(scope => {
      console.log(`   - ${scope}`);
    });
  }

  console.log('\n🔗 Required Shopify Partner Dashboard URLs:');
  console.log(`   App URL: ${appUrl}`);
  console.log(`   Allowed redirection URL(s): ${appUrl}/auth/callback`);

  console.log('\n📝 Next steps:');
  console.log('1. Verify the URLs above match your Shopify Partner Dashboard');
  console.log('2. Make sure your app is published (not in draft mode)');
  console.log('3. Reinstall the app on your development store');
  console.log('4. Clear browser cache and cookies');

  return true;
}

verifyConfig();
