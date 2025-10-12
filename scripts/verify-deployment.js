#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Run this after deploying to verify your app is properly configured
 */

console.log('🚀 SHOPIFY APP DEPLOYMENT VERIFICATION');
console.log('=====================================');
console.log('Timestamp:', new Date().toISOString());
console.log('');

// Check if we're running in production
const isProduction = process.env.NODE_ENV === 'production';
const isRender = !!process.env.RENDER;

console.log('🌍 ENVIRONMENT CHECK');
console.log('===================');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Running on Render:', isRender ? 'YES' : 'NO');
console.log('Production mode:', isProduction ? 'YES' : 'NO');
console.log('');

// Verify all required environment variables
const requiredVars = {
  'SHOPIFY_API_KEY': process.env.SHOPIFY_API_KEY,
  'SHOPIFY_API_SECRET': process.env.SHOPIFY_API_SECRET,
  'SHOPIFY_APP_URL': process.env.SHOPIFY_APP_URL,
  'SCOPES': process.env.SCOPES
};

console.log('✅ ENVIRONMENT VARIABLES VERIFICATION');
console.log('=====================================');

let allPresent = true;
Object.entries(requiredVars).forEach(([key, value]) => {
  if (!value) {
    allPresent = false;
    console.log(`❌ ${key}: MISSING`);
  } else {
    if (key.includes('SECRET') || key.includes('KEY')) {
      console.log(`✅ ${key}: PRESENT (${value.length} chars)`);
    } else {
      console.log(`✅ ${key}: ${value}`);
    }
  }
});

console.log('');

// Validate specific values
console.log('🔍 VALUE VALIDATION');
console.log('===================');

if (process.env.SHOPIFY_APP_URL) {
  const isValidUrl = process.env.SHOPIFY_APP_URL.startsWith('https://');
  console.log(`SHOPIFY_APP_URL format: ${isValidUrl ? '✅ Valid HTTPS URL' : '❌ Should start with https://'}`);
}

if (process.env.SCOPES) {
  const hasMultipleScopes = process.env.SCOPES.includes(',');
  console.log(`SCOPES format: ${hasMultipleScopes ? '✅ Multiple scopes detected' : 'ℹ️  Single scope (may be valid)'}`);
}

if (process.env.PORT) {
  const isValidPort = !isNaN(parseInt(process.env.PORT));
  console.log(`PORT format: ${isValidPort ? '✅ Valid number' : '❌ Should be a number'}`);
}

console.log('');

// Check for common deployment issues
console.log('🔧 DEPLOYMENT HEALTH CHECK');
console.log('==========================');

const issues = [];
const warnings = [];

// Check for development vs production issues
if (isProduction && process.env.SHOPIFY_APP_URL && process.env.SHOPIFY_APP_URL.includes('localhost')) {
  issues.push('SHOPIFY_APP_URL contains localhost in production');
}

if (isProduction && process.env.NODE_ENV !== 'production') {
  warnings.push('NODE_ENV is not set to production in production environment');
}

// Check for Render-specific issues
if (isRender && !process.env.PORT) {
  issues.push('PORT environment variable not set (required for Render)');
}

if (isRender && process.env.NODE_ENV !== 'production') {
  warnings.push('NODE_ENV should be set to production on Render');
}

// Report issues and warnings
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
  console.log('✅ No deployment issues detected');
  console.log('');
}

// Final status
console.log('📊 DEPLOYMENT STATUS');
console.log('====================');

if (!allPresent) {
  console.log('❌ DEPLOYMENT FAILED: Missing required environment variables');
  console.log('');
  console.log('🔧 NEXT STEPS:');
  console.log('1. Add missing environment variables to Render dashboard');
  console.log('2. Redeploy your service');
  console.log('3. Run this verification script again');
} else if (issues.length > 0) {
  console.log('❌ DEPLOYMENT ISSUES: Critical problems detected');
  console.log('');
  console.log('🔧 NEXT STEPS:');
  console.log('1. Fix the critical issues listed above');
  console.log('2. Redeploy your service');
  console.log('3. Run this verification script again');
} else {
  console.log('✅ DEPLOYMENT SUCCESSFUL: App is properly configured');
  console.log('');
  console.log('🎉 Your Shopify app should be working correctly!');
  console.log('');
  console.log('🔍 FINAL CHECKS:');
  console.log('1. Test your app\'s authentication flow');
  console.log('2. Verify webhook endpoints are working');
  console.log('3. Check that your app appears in the Shopify admin');
  
  if (warnings.length > 0) {
    console.log('4. Consider addressing the warnings above for optimal performance');
  }
}

console.log('');
console.log('🏁 VERIFICATION COMPLETE');
console.log('=========================');
