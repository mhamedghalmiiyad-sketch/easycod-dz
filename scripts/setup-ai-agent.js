#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), '.env');
const envExamplePath = join(process.cwd(), 'env.example');

console.log('🤖 Setting up Tkone AI Agent...\n');

// Check if .env file exists
if (!existsSync(envPath)) {
  console.log('❌ .env file not found. Creating one from env.example...');
  
  if (existsSync(envExamplePath)) {
    const envExample = readFileSync(envExamplePath, 'utf-8');
    writeFileSync(envPath, envExample);
    console.log('✅ .env file created from env.example');
  } else {
    console.log('❌ env.example file not found either. Please create a .env file manually.');
    process.exit(1);
  }
}

// Read current .env content
let envContent = readFileSync(envPath, 'utf-8');

// Check if Tkone variables already exist
if (envContent.includes('TKONE_API_KEY')) {
  console.log('✅ Tkone API configuration already exists in .env file');
  
  // Check if the API key is set to the actual value
  if (envContent.includes('TKONE_API_KEY=sk-hr286u3eb5axM86yPZiWFNXDAh4lUnYAd8V7AB2rj5USb3QN')) {
    console.log('✅ Tkone API key is already configured');
  } else {
    console.log('⚠️ Tkone API key needs to be updated');
    envContent = envContent.replace(
      /TKONE_API_KEY=.*/,
      'TKONE_API_KEY=sk-hr286u3eb5axM86yPZiWFNXDAh4lUnYAd8V7AB2rj5USb3QN'
    );
    writeFileSync(envPath, envContent);
    console.log('✅ Tkone API key updated');
  }
} else {
  console.log('📝 Adding Tkone API configuration to .env file...');
  
  const tkoneConfig = `
# Tkone AI API Configuration
TKONE_API_KEY=sk-hr286u3eb5axM86yPZiWFNXDAh4lUnYAd8V7AB2rj5USb3QN
TKONE_API_URL=https://api.tkone.ai/v1/chat/completions`;

  envContent += tkoneConfig;
  writeFileSync(envPath, envContent);
  console.log('✅ Tkone API configuration added to .env file');
}

console.log('\n🎉 Setup complete! You can now:');
console.log('1. Run: npm run test-tkone (to test the API)');
console.log('2. Run: npm run ai-agent (to start the interactive agent)');
console.log('\n💡 The AI agent is specialized in Shopify apps, React, TypeScript, and Remix development!');
