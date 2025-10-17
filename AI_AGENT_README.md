# 🤖 Tkone AI Coding Agent Integration

This project now includes a powerful AI coding agent powered by the Tkone API, designed to help you with Shopify app development, React, TypeScript, and Remix.

## 🚀 Quick Start

### 1. Set up Environment Variables

Add these lines to your `.env` file:

```bash
# Tkone AI API Configuration
TKONE_API_KEY=sk-hr286u3eb5axM86yPZiWFNXDAh4lUnYAd8V7AB2rj5USb3QN
TKONE_API_URL=https://api.tkone.ai/v1/chat/completions
```

### 2. Test the Integration

```bash
npm run test-tkone
```

### 3. Start the AI Agent

```bash
npm run ai-agent
```

## 🎯 Features

### Interactive Terminal Agent
- **Real-time chat** with the AI assistant
- **Specialized knowledge** in Shopify apps, React, TypeScript, and Remix
- **Command-based interface** for specific tasks
- **File analysis** capabilities
- **Code generation, debugging, and optimization**

### Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/help` | Show all available commands | `/help` |
| `/clear` | Clear conversation history | `/clear` |
| `/history` | Show conversation history | `/history` |
| `/code <prompt>` | Generate code for a task | `/code "Create a React component for a product card"` |
| `/debug <code>` | Debug code or error | `/debug "const x = 5; x = 10;"` |
| `/explain <code>` | Explain how code works | `/explain "const x = 5;"` |
| `/optimize <code>` | Optimize code performance | `/optimize "for(let i=0;i<arr.length;i++){}"` |
| `/file <path>` | Analyze a project file | `/file app/routes/app.tsx` |
| `/exit` or `/quit` | Exit the agent | `/exit` |

## 🛠️ VS Code Integration

### Using Tasks
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select "Start AI Agent" or "Test Tkone API"

### Using Debug Configuration
1. Go to the Debug panel (`Ctrl+Shift+D`)
2. Select "Debug AI Agent" or "Test Tkone API"
3. Press F5 to start debugging

## 📁 Project Structure

```
├── app/services/tkone.server.ts    # Core AI agent service
├── scripts/ai-agent.js             # Interactive terminal agent
├── scripts/test-tkone.js           # API integration test
├── .vscode/tasks.json              # VS Code tasks
├── .vscode/launch.json             # VS Code debug config
└── AI_AGENT_README.md              # This file
```

## 🔧 API Service Usage

You can also use the TkoneAgent directly in your code:

```typescript
import { TkoneAgent } from '~/services/tkone.server';

const agent = new TkoneAgent();

// Ask a question
const response = await agent.ask('How do I create a Shopify webhook?');

// Generate code
const code = await agent.generateCode('Create a React hook for managing form state');

// Debug code
const debugResult = await agent.debugCode('const x = 5; x = 10;');

// Explain code
const explanation = await agent.explainCode('const [state, setState] = useState(0);');

// Optimize code
const optimized = await agent.optimizeCode('for(let i=0;i<arr.length;i++){}');
```

## 🎨 Example Use Cases

### 1. Code Generation
```
🤖 AI Agent > /code "Create a Shopify app route that fetches product data"

💻 Generated Code:
// ... AI generates a complete Remix route with Shopify API integration
```

### 2. File Analysis
```
🤖 AI Agent > /file app/routes/app.settings.tsx

🔍 File Analysis:
// ... AI analyzes your settings page and provides suggestions
```

### 3. Debugging
```
🤖 AI Agent > /debug "Error: Cannot read property 'id' of undefined"

🐛 Debug Result:
// ... AI helps identify and fix the issue
```

### 4. Code Explanation
```
🤖 AI Agent > /explain "const { data } = useLoaderData<typeof loader>();"

💡 Explanation:
// ... AI explains how Remix loaders work
```

## 🔒 Security Notes

- Your API key is stored in the `.env` file (which should be in `.gitignore`)
- The agent runs locally and doesn't send your code to external services except Tkone
- Conversation history is kept in memory and cleared when you restart

## 🐛 Troubleshooting

### Common Issues

1. **"TKONE_API_KEY environment variable is required"**
   - Make sure you've added the API key to your `.env` file
   - Restart your terminal/VS Code after adding the environment variable

2. **"Tkone API Error: 401 Unauthorized"**
   - Check that your API key is correct
   - Verify the API key has the necessary permissions

3. **"Failed to communicate with Tkone API"**
   - Check your internet connection
   - Verify the API URL is correct
   - Try running `npm run test-tkone` to diagnose the issue

### Getting Help

- Run `npm run test-tkone` to verify your setup
- Check the console output for detailed error messages
- Make sure all dependencies are installed: `npm install`

## 🚀 Advanced Usage

### Custom System Prompts
You can modify the system prompt in `app/services/tkone.server.ts` to customize the AI's behavior:

```typescript
this.messages = [
  {
    role: 'system',
    content: 'You are a helpful coding assistant specialized in [YOUR_SPECIALIZATION].'
  }
];
```

### Integration with Your App
You can integrate the AI agent into your Shopify app's UI by creating API routes that use the TkoneAgent service.

## 📝 License

This integration is part of your Shopify app project and follows the same license terms.

---

Happy coding with your new AI assistant! 🎉
