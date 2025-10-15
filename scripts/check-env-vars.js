#!/usr/bin/env node

/**
 * Environment Variables Checker
 * This script helps diagnose environment variable issues
 */

import { readFileSync } from 'fs';

async function main() {
  console.log('🔍 Environment Variables Diagnostic Tool');
  console.log('=====================================\n');

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

  const requiredEnvVars = [
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'SCOPES',
    'DATABASE_URL',
    'SESSION_SECRET'
  ];

  const optionalEnvVars = [
    'SHOPIFY_APP_URL'
  ];

  console.log('📋 Environment Variables Status:');
  console.log('================================\n');

  // Check required variables
  console.log('Required Variables:');
  let hasIssues = false;
  
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (!value) {
      console.log(`  ❌ ${envVar}: NOT SET`);
      hasIssues = true;
    } else if (value.trim() === '') {
      console.log(`  ❌ ${envVar}: EMPTY STRING`);
      hasIssues = true;
    } else if (envVar === 'SHOPIFY_API_KEY' && value.length < 10) {
      console.log(`  ❌ ${envVar}: TOO SHORT (${value.length} chars)`);
      hasIssues = true;
    } else if (envVar === 'SHOPIFY_API_SECRET' && value.length < 10) {
      console.log(`  ❌ ${envVar}: TOO SHORT (${value.length} chars)`);
      hasIssues = true;
    } else {
      // Show first 8 characters for security
      const displayValue = value.length > 8 ? `${value.substring(0, 8)}...` : value;
      console.log(`  ✅ ${envVar}: ${displayValue}`);
    }
  });

  console.log('\nOptional Variables:');
  optionalEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (!value) {
      console.log(`  ⚠️  ${envVar}: NOT SET (will use fallback)`);
    } else {
      console.log(`  ✅ ${envVar}: ${value}`);
    }
  });

  if (hasIssues) {
    console.log('\n❌ Issues Found:');
    console.log('================');
    console.log('1. Make sure all required environment variables are set in Render dashboard');
    console.log('2. Check that values are not empty strings');
    console.log('3. Verify SHOPIFY_API_KEY and SHOPIFY_API_SECRET are from your Shopify Partners dashboard');
    console.log('4. Redeploy after setting environment variables');
  } else {
    console.log('\n✅ All environment variables look good!');
  }

  console.log('\n📖 How to get Shopify credentials:');
  console.log('===================================');
  console.log('1. Go to https://partners.shopify.com/');
  console.log('2. Navigate to your app');
  console.log('3. Go to "App setup" tab');
  console.log('4. Copy the "Client ID" (this is your SHOPIFY_API_KEY)');
  console.log('5. Copy the "Client secret" (this is your SHOPIFY_API_SECRET)');
}

main().catch(console.error);
