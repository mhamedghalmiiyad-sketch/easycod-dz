#!/usr/bin/env node

/**
 * Environment Variable Diagnostic Script
 * Run this script to diagnose environment variable issues on Render
 * 
 * Usage:
 *   node scripts/diagnose-env.js
 *   npm run diagnose-env
 */

console.log('🔍 SHOPIFY APP ENVIRONMENT VARIABLE DIAGNOSTIC');
console.log('==============================================');
console.log('Timestamp:', new Date().toISOString());
console.log('Node.js version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('Current working directory:', process.cwd());

// Check if we're in local development
const isLocalDev = !process.env.RENDER && process.env.NODE_ENV !== 'production';
if (isLocalDev) {
  console.log('');
  console.log('🏠 LOCAL DEVELOPMENT MODE DETECTED');
  console.log('==================================');
  console.log('This diagnostic is designed for Render deployment troubleshooting.');
  console.log('For local development, you need to create a .env file with your variables.');
  console.log('');
  console.log('📝 TO SET UP LOCAL DEVELOPMENT:');
  console.log('1. Copy env.example to .env');
  console.log('2. Fill in your actual Shopify app credentials');
  console.log('3. Run: npm run dev');
  console.log('');
  console.log('🚀 FOR RENDER DEPLOYMENT:');
  console.log('1. Set environment variables in Render dashboard');
  console.log('2. Deploy your app');
  console.log('3. Check deployment logs for diagnostic output');
  console.log('');
}
console.log('');

// Check if we're running in a container
console.log('🐳 CONTAINER ENVIRONMENT CHECK');
console.log('Running in Docker:', process.env.DOCKER ? 'YES' : 'NO');
console.log('Running in Render:', process.env.RENDER ? 'YES' : 'NO');
console.log('');

// Required Shopify environment variables
const requiredVars = [
  'SHOPIFY_API_KEY',
  'SHOPIFY_API_SECRET',
  'SHOPIFY_APP_URL',
  'SCOPES'
];

// Optional but important variables
const optionalVars = [
  'SHOP_CUSTOM_DOMAIN',
  'DATABASE_URL',
  'NODE_ENV',
  'PORT'
];

console.log('✅ REQUIRED SHOPIFY VARIABLES');
console.log('=============================');
let missingRequired = [];
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingRequired.push(varName);
    console.log(`❌ ${varName}: MISSING`);
  } else {
    if (varName.includes('SECRET') || varName.includes('KEY')) {
      console.log(`✅ ${varName}: PRESENT (${value.length} characters)`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  }
});

console.log('');
console.log('🔧 OPTIONAL VARIABLES');
console.log('=====================');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚪ ${varName}: NOT SET`);
  } else {
    if (varName.includes('SECRET') || varName.includes('KEY') || varName.includes('URL')) {
      console.log(`✅ ${varName}: PRESENT (${value.length} characters)`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  }
});

console.log('');
console.log('🌍 ALL ENVIRONMENT VARIABLES (FILTERED)');
console.log('=======================================');
const allEnvVars = Object.keys(process.env).sort();
const relevantVars = allEnvVars.filter(key => 
  key.includes('SHOPIFY') || 
  key.includes('SCOPE') || 
  key.includes('NODE') || 
  key.includes('PORT') ||
  key.includes('DATABASE') ||
  key.includes('RENDER')
);

relevantVars.forEach(key => {
  const value = process.env[key];
  if (key.includes('SECRET') || key.includes('KEY')) {
    console.log(`${key}: ${value ? '[PRESENT - ' + value.length + ' chars]' : '[MISSING]'}`);
  } else {
    console.log(`${key}: ${value || '[MISSING]'}`);
  }
});

console.log('');
console.log('📊 DIAGNOSTIC SUMMARY');
console.log('=====================');

if (missingRequired.length === 0) {
  console.log('✅ All required environment variables are present!');
  console.log('✅ Your app should be able to start successfully.');
} else {
  console.log('❌ Missing required environment variables:');
  missingRequired.forEach(varName => console.log(`   - ${varName}`));
  console.log('');
  console.log('🔧 TROUBLESHOOTING STEPS:');
  console.log('1. Go to your Render service dashboard');
  console.log('2. Navigate to the "Environment" tab');
  console.log('3. Add the missing environment variables');
  console.log('4. Make sure there are no trailing spaces or formatting issues');
  console.log('5. Save the changes');
  console.log('6. Trigger a FULL REDEPLOY (not just restart)');
  console.log('7. Check the deployment logs for this diagnostic output');
  console.log('');
  console.log('📋 REQUIRED VARIABLES TO ADD:');
  console.log('   - SHOPIFY_API_KEY: Your Shopify app\'s API key');
  console.log('   - SHOPIFY_API_SECRET: Your Shopify app\'s API secret');
  console.log('   - SHOPIFY_APP_URL: Your app\'s URL (e.g., https://your-app.onrender.com)');
  console.log('   - SCOPES: Comma-separated list of Shopify scopes');
}

console.log('');
console.log('🔍 ADDITIONAL CHECKS');
console.log('=====================');

// Check for common issues
const issues = [];

if (process.env.SHOPIFY_APP_URL && !process.env.SHOPIFY_APP_URL.startsWith('https://')) {
  issues.push('SHOPIFY_APP_URL should start with https://');
}

if (process.env.SCOPES && !process.env.SCOPES.includes(',')) {
  console.log('ℹ️  SCOPES appears to be a single scope (no commas found)');
}

if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
  issues.push('PORT should be a valid number');
}

if (issues.length > 0) {
  console.log('⚠️  Potential issues found:');
  issues.forEach(issue => console.log(`   - ${issue}`));
} else {
  console.log('✅ No obvious configuration issues detected');
}

console.log('');
console.log('📞 NEXT STEPS');
console.log('=============');
if (isLocalDev) {
  console.log('🏠 LOCAL DEVELOPMENT:');
  console.log('1. Create a .env file with your Shopify app credentials');
  console.log('2. Use the env.example file as a template');
  console.log('3. Run: npm run dev to start local development');
  console.log('');
  console.log('🚀 FOR RENDER DEPLOYMENT:');
  console.log('1. Set environment variables in Render dashboard');
  console.log('2. Deploy your service');
  console.log('3. Check deployment logs for diagnostic output');
} else if (missingRequired.length > 0) {
  console.log('1. Fix the missing environment variables in Render dashboard');
  console.log('2. Redeploy your service');
  console.log('3. Check the deployment logs');
  console.log('4. If issues persist, contact Render support with this diagnostic output');
} else {
  console.log('1. If your app is still not working, check the application logs');
  console.log('2. Verify your Shopify app configuration matches these environment variables');
  console.log('3. Test your app\'s authentication flow');
}

console.log('');
console.log('🏁 DIAGNOSTIC COMPLETE');
console.log('======================');
