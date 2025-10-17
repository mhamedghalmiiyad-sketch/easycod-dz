#!/usr/bin/env node

import readline from 'readline';
import { TkoneAgent } from './tkone-agent-mock.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class InteractiveAIAgent {
  constructor() {
    this.agent = new TkoneAgent();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🤖 AI Agent > '
    });
    
    this.setupCommands();
    this.showWelcome();
  }

  setupCommands() {
    this.commands = {
      '/help': () => this.showHelp(),
      '/clear': () => this.clearHistory(),
      '/history': () => this.showHistory(),
      '/code': (args) => this.generateCode(args),
      '/debug': (args) => this.debugCode(args),
      '/explain': (args) => this.explainCode(args),
      '/optimize': (args) => this.optimizeCode(args),
      '/file': (args) => this.analyzeFile(args),
      '/exit': () => this.exit(),
      '/quit': () => this.exit()
    };
  }

  showWelcome() {
    console.log('\n🚀 Welcome to the Tkone AI Coding Agent!');
    console.log('💡 Type your questions or use commands (type /help for available commands)');
    console.log('🔧 Specialized in Shopify apps, React, TypeScript, and Remix development\n');
    this.rl.prompt();
  }

  showHelp() {
    console.log('\n📋 Available Commands:');
    console.log('  /help           - Show this help message');
    console.log('  /clear          - Clear conversation history');
    console.log('  /history        - Show conversation history');
    console.log('  /code <prompt>  - Generate code for a specific task');
    console.log('  /debug <code>   - Debug code or error message');
    console.log('  /explain <code> - Explain how code works');
    console.log('  /optimize <code>- Optimize code for better performance');
    console.log('  /file <path>    - Analyze a file from your project');
    console.log('  /exit or /quit  - Exit the agent');
    console.log('\n💬 Or just type your question directly!\n');
    this.rl.prompt();
  }

  async clearHistory() {
    this.agent.clearHistory();
    console.log('✅ Conversation history cleared!\n');
    this.rl.prompt();
  }

  showHistory() {
    const history = this.agent.getHistory();
    console.log('\n📜 Conversation History:');
    history.forEach((msg, index) => {
      const role = msg.role === 'user' ? '👤 You' : '🤖 AI';
      const content = msg.content.length > 100 
        ? msg.content.substring(0, 100) + '...' 
        : msg.content;
      console.log(`  ${index + 1}. ${role}: ${content}`);
    });
    console.log('');
    this.rl.prompt();
  }

  async generateCode(args) {
    if (!args) {
      console.log('❌ Please provide a code generation prompt. Example: /code "Create a React component for a product card"');
      this.rl.prompt();
      return;
    }
    
    try {
      console.log('🔄 Generating code...');
      const result = await this.agent.generateCode(args);
      console.log('\n💻 Generated Code:\n');
      console.log(result);
      console.log('\n');
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    this.rl.prompt();
  }

  async debugCode(args) {
    if (!args) {
      console.log('❌ Please provide code to debug. Example: /debug "const x = 5; x = 10;"');
      this.rl.prompt();
      return;
    }
    
    try {
      console.log('🔍 Debugging code...');
      const result = await this.agent.debugCode(args);
      console.log('\n🐛 Debug Result:\n');
      console.log(result);
      console.log('\n');
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    this.rl.prompt();
  }

  async explainCode(args) {
    if (!args) {
      console.log('❌ Please provide code to explain. Example: /explain "const x = 5;"');
      this.rl.prompt();
      return;
    }
    
    try {
      console.log('📚 Explaining code...');
      const result = await this.agent.explainCode(args);
      console.log('\n💡 Explanation:\n');
      console.log(result);
      console.log('\n');
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    this.rl.prompt();
  }

  async optimizeCode(args) {
    if (!args) {
      console.log('❌ Please provide code to optimize. Example: /optimize "for(let i=0;i<arr.length;i++){}"');
      this.rl.prompt();
      return;
    }
    
    try {
      console.log('⚡ Optimizing code...');
      const result = await this.agent.optimizeCode(args);
      console.log('\n🚀 Optimized Code:\n');
      console.log(result);
      console.log('\n');
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    this.rl.prompt();
  }

  async analyzeFile(args) {
    if (!args) {
      console.log('❌ Please provide a file path. Example: /file app/routes/app.tsx');
      this.rl.prompt();
      return;
    }
    
    try {
      const filePath = join(process.cwd(), args);
      if (!existsSync(filePath)) {
        console.log(`❌ File not found: ${filePath}`);
        this.rl.prompt();
        return;
      }
      
      const fileContent = readFileSync(filePath, 'utf-8');
      console.log(`📄 Analyzing file: ${args}`);
      
      const result = await this.agent.ask(
        `Analyze this file and provide insights, suggestions for improvements, and identify any potential issues:`,
        `File: ${args}\n\nContent:\n${fileContent}`
      );
      
      console.log('\n🔍 File Analysis:\n');
      console.log(result);
      console.log('\n');
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    this.rl.prompt();
  }

  async processInput(input) {
    const trimmedInput = input.trim();
    
    if (!trimmedInput) {
      this.rl.prompt();
      return;
    }

    // Check if it's a command
    if (trimmedInput.startsWith('/')) {
      const [command, ...args] = trimmedInput.split(' ');
      const commandHandler = this.commands[command];
      
      if (commandHandler) {
        await commandHandler(args.join(' '));
      } else {
        console.log(`❌ Unknown command: ${command}. Type /help for available commands.`);
        this.rl.prompt();
      }
      return;
    }

    // Regular question
    try {
      console.log('🤔 Thinking...');
      const response = await this.agent.ask(trimmedInput);
      console.log('\n🤖 AI Response:\n');
      console.log(response);
      console.log('\n');
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    this.rl.prompt();
  }

  exit() {
    console.log('\n👋 Goodbye! Happy coding!');
    this.rl.close();
    process.exit(0);
  }

  start() {
    this.rl.on('line', (input) => {
      this.processInput(input);
    });

    this.rl.on('close', () => {
      console.log('\n👋 Goodbye! Happy coding!');
      process.exit(0);
    });
  }
}

// Start the agent
try {
  const agent = new InteractiveAIAgent();
  agent.start();
} catch (error) {
  console.error('❌ Failed to start AI Agent:', error.message);
  console.log('\n💡 Make sure you have set the TKONE_API_KEY in your .env file');
  process.exit(1);
}
