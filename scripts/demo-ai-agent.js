#!/usr/bin/env node

import { TkoneAgent } from './tkone-agent-mock.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function demoAIAgent() {
  console.log('🎬 Tkone AI Agent Demo\n');
  
  try {
    const agent = new TkoneAgent();
    
    // Demo 1: Basic question
    console.log('📝 Demo 1: Basic Question');
    console.log('Question: How do I create a Shopify app route?');
    const response1 = await agent.ask('How do I create a Shopify app route?');
    console.log('Answer:', response1.substring(0, 200) + '...\n');
    
    // Demo 2: Code generation
    console.log('💻 Demo 2: Code Generation');
    console.log('Request: Create a React component for a product card');
    const response2 = await agent.generateCode('Create a React component for a product card');
    console.log('Generated Code:', response2.substring(0, 200) + '...\n');
    
    // Demo 3: Code debugging
    console.log('🐛 Demo 3: Code Debugging');
    console.log('Code to debug: const x = 5; x = 10;');
    const response3 = await agent.debugCode('const x = 5; x = 10;');
    console.log('Debug Result:', response3.substring(0, 200) + '...\n');
    
    // Demo 4: File analysis
    console.log('📄 Demo 4: File Analysis');
    console.log('Analyzing: app/routes/app.settings.tsx');
    const response4 = await agent.ask(
      'Analyze this Shopify app settings page and provide suggestions for improvement',
      'This is a settings page for a Shopify app built with Remix and TypeScript'
    );
    console.log('Analysis:', response4.substring(0, 200) + '...\n');
    
    console.log('🎉 Demo completed! The AI agent is ready to use.');
    console.log('\n💡 To start the interactive agent, run: npm run ai-agent');
    console.log('💡 To test the API, run: npm run test-tkone');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

demoAIAgent();
