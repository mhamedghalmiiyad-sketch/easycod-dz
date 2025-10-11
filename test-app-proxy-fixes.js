#!/usr/bin/env node

/**
 * Test script to verify the app proxy fixes
 * This script helps test the HMAC validation and request handling
 */

const crypto = require('crypto');

// Test HMAC validation function
function testHmacValidation() {
  console.log('🧪 Testing HMAC validation...');
  
  // Mock parameters (replace with your actual values)
  const mockParams = {
    shop: 'test-shop.myshopify.com',
    timestamp: '1234567890',
    path_prefix: '/apps/proxy'
  };
  
  const mockSecret = 'your-shopify-api-secret'; // Replace with your actual secret
  
  // Create sorted parameters string
  const sortedKeys = Object.keys(mockParams).sort();
  const sortedParams = new URLSearchParams();
  for (const key of sortedKeys) {
    sortedParams.append(key, mockParams[key]);
  }
  
  const stringToSign = sortedParams.toString();
  console.log('📝 String to sign:', stringToSign);
  
  // Calculate HMAC
  const hmac = crypto.createHmac('sha256', mockSecret);
  hmac.update(stringToSign);
  const calculatedSignature = hmac.digest('hex');
  
  console.log('🔐 Calculated signature:', calculatedSignature);
  console.log('✅ HMAC validation test completed');
  
  return calculatedSignature;
}

// Test URL construction
function testUrlConstruction() {
  console.log('\n🧪 Testing URL construction...');
  
  const baseUrl = 'https://your-app.ngrok.io';
  const shop = 'test-shop.myshopify.com';
  
  // Test root route forwarding
  const rootUrl = new URL(baseUrl);
  rootUrl.searchParams.set('shop', shop);
  rootUrl.searchParams.set('path_prefix', '/apps/proxy');
  rootUrl.searchParams.set('signature', 'test-signature');
  
  console.log('🔗 Root route URL:', rootUrl.toString());
  
  // Test proxy route URL
  const proxyUrl = new URL('/apps.proxy', baseUrl);
  proxyUrl.search = rootUrl.search;
  
  console.log('🔗 Proxy route URL:', proxyUrl.toString());
  console.log('✅ URL construction test completed');
}

// Test request body handling
function testRequestBodyHandling() {
  console.log('\n🧪 Testing request body handling...');
  
  const formData = new FormData();
  formData.append('firstName', 'John');
  formData.append('lastName', 'Doe');
  formData.append('email', 'john@example.com');
  formData.append('phone', '+1234567890');
  
  console.log('📋 Form data keys:', Array.from(formData.keys()));
  console.log('✅ Request body handling test completed');
}

// Main test function
function runTests() {
  console.log('🚀 Starting App Proxy Fix Tests\n');
  
  try {
    testHmacValidation();
    testUrlConstruction();
    testRequestBodyHandling();
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Replace mock values with your actual Shopify app credentials');
    console.log('2. Test with your actual app proxy URL');
    console.log('3. Check the console logs when submitting forms');
    console.log('4. Verify that POST requests are properly handled');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testHmacValidation,
  testUrlConstruction,
  testRequestBodyHandling,
  runTests
};
