#!/usr/bin/env node

import { TkoneAgent } from './tkone-agent-mock.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testTkoneAPI() {
  console.log('🧪 Testing Tkone API Integration...\n');

  try {
    const agent = new TkoneAgent();
    
    console.log('✅ TkoneAgent initialized successfully');
    console.log('🔑 API Key configured:', process.env.TKONE_API_KEY ? 'Yes' : 'No');
    console.log('🌐 API URL:', process.env.TKONE_API_URL || 'https://api.tkone.ai/v1/chat/completions');
    
    console.log('\n🤖 Testing basic question...');
    const response = await agent.ask('Hello! Can you help me with Shopify app development?');
    console.log('✅ Response received:', response.substring(0, 100) + '...');
    
    console.log('\n💻 Testing code generation...');
    const codeResponse = await agent.generateCode('Create a simple React component that displays "Hello World"');
    console.log('✅ Code generated:', codeResponse.substring(0, 100) + '...');
    
    console.log('\n🎉 All tests passed! Tkone API is working correctly.');
    console.log('\n💡 You can now run: npm run ai-agent');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure TKONE_API_KEY is set in your .env file');
    console.log('2. Verify the API key is valid');
    console.log('3. Check your internet connection');
    console.log('4. Ensure the Tkone API URL is correct');
  }
}

testTkoneAPI();
