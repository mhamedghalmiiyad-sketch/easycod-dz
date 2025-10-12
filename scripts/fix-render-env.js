#!/usr/bin/env node

/**
 * Render Environment Variable Fix Script
 * This script helps diagnose and fix common Render environment variable injection issues
 */

console.log('🔧 RENDER ENVIRONMENT VARIABLE FIX SCRIPT');
console.log('==========================================');
console.log('Timestamp:', new Date().toISOString());
console.log('');

// Check current environment
const isRender = !!process.env.RENDER;
const isProduction = process.env.NODE_ENV === 'production';

console.log('🌍 ENVIRONMENT CHECK');
console.log('===================');
console.log('Running on Render:', isRender ? 'YES' : 'NO');
console.log('Production mode:', isProduction ? 'YES' : 'NO');
console.log('Total env vars:', Object.keys(process.env).length);
console.log('');

// Check for common issues
console.log('🔍 DIAGNOSTIC CHECKS');
console.log('====================');

const issues = [];
const warnings = [];

// Check if we're on Render but missing the RENDER env var
if (isProduction && !isRender) {
  issues.push('Running in production but RENDER environment variable not set');
}

// Check for Shopify variables
const shopifyVars = ['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET', 'SHOPIFY_APP_URL', 'SCOPES'];
const missingShopifyVars = shopifyVars.filter(varName => !process.env[varName]);

if (missingShopifyVars.length > 0) {
  issues.push(`Missing Shopify environment variables: ${missingShopifyVars.join(', ')}`);
}

// Check for common Render issues
if (isRender) {
  if (!process.env.PORT) {
    issues.push('PORT environment variable not set (required for Render)');
  }
  
  if (process.env.NODE_ENV !== 'production') {
    warnings.push('NODE_ENV should be set to production on Render');
  }
  
  // Check if we have very few environment variables (might indicate injection issue)
  if (Object.keys(process.env).length < 10) {
    issues.push('Very few environment variables detected - possible injection issue');
  }
}

// Report issues
if (issues.length > 0) {
  console.log('❌ CRITICAL ISSUES FOUND:');
  issues.forEach(issue => console.log(`   - ${issue}`));
  console.log('');
}

if (warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  warnings.forEach(warning => console.log(`   - ${warning}`));
  console.log('');
}

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ No issues detected');
  console.log('');
}

// Provide solutions
console.log('🔧 SOLUTIONS');
console.log('============');

if (issues.length > 0) {
  console.log('1. **REMOVE envVars from render.yaml** (if present)');
  console.log('   - The render.yaml file should NOT contain envVars section');
  console.log('   - This can conflict with dashboard environment variables');
  console.log('');
  
  console.log('2. **Verify Service Type**');
  console.log('   - Make sure you\'re using a "Web Service" (not Static Site)');
  console.log('   - Web Services properly inject environment variables');
  console.log('');
  
  console.log('3. **Check Environment Variables in Dashboard**');
  console.log('   - Go to your Render service dashboard');
  console.log('   - Navigate to "Environment" tab');
  console.log('   - Verify all required variables are present:');
  shopifyVars.forEach(varName => {
    console.log(`     - ${varName}`);
  });
  console.log('');
  
  console.log('4. **Force Complete Redeploy**');
  console.log('   - Go to "Manual Deploy" → "Deploy latest commit"');
  console.log('   - DO NOT just restart the service');
  console.log('   - Environment variables are injected at build time');
  console.log('');
  
  console.log('5. **Check Variable Names and Values**');
  console.log('   - Ensure exact case: SHOPIFY_API_KEY (not shopify_api_key)');
  console.log('   - No trailing spaces in names or values');
  console.log('   - Values should not be empty');
  console.log('');
  
  if (isRender) {
    console.log('6. **Contact Render Support**');
    console.log('   - If variables are set in dashboard but not injected');
    console.log('   - Include this diagnostic output in your support request');
    console.log('   - Mention: "Environment variables not being injected at runtime"');
  }
} else {
  console.log('✅ Your environment variables are properly configured!');
  console.log('');
  console.log('If you\'re still experiencing issues:');
  console.log('1. Check your application code for environment variable usage');
  console.log('2. Verify your Shopify app configuration');
  console.log('3. Test your app\'s authentication flow');
}

console.log('');
console.log('📋 QUICK CHECKLIST');
console.log('==================');
console.log('□ Service type is "Web Service"');
console.log('□ Environment variables set in dashboard (not render.yaml)');
console.log('□ Variable names match exactly (case-sensitive)');
console.log('□ No trailing spaces in variable names/values');
console.log('□ Full redeploy performed (not just restart)');
console.log('□ Diagnostic logs show variables are present');

console.log('');
console.log('🏁 DIAGNOSTIC COMPLETE');
console.log('======================');
