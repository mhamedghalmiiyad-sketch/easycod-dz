#!/usr/bin/env node

/**
 * Generate a secure session secret for Shopify app
 * Run this script to get a new SESSION_SECRET for your Render environment
 */

import crypto from 'crypto';

function generateSessionSecret() {
  // Generate a 32-byte (256-bit) random string
  const secret = crypto.randomBytes(32).toString('hex');
  
  console.log('🔐 Generated SESSION_SECRET:');
  console.log('');
  console.log(secret);
  console.log('');
  console.log('📋 Copy this value and add it to your Render environment variables:');
  console.log('   Key: SESSION_SECRET');
  console.log('   Value: ' + secret);
  console.log('');
  console.log('✅ This secret is cryptographically secure and ready for production use.');
}

generateSessionSecret();
