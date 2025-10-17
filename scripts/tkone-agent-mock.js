import axios from 'axios';

class TkoneAgent {
  constructor() {
    this.apiKey = process.env.TKONE_API_KEY || '';
    this.apiUrl = process.env.TKONE_API_URL || 'https://api.tkone.ai/v1/chat/completions';
    this.messages = [
      {
        role: 'system',
        content: 'You are a helpful coding assistant specialized in Shopify app development, React, TypeScript, and Remix. You help developers build and debug their applications with clear, actionable advice.'
      }
    ];

    if (!this.apiKey) {
      throw new Error('TKONE_API_KEY environment variable is required');
    }
  }

  async ask(prompt, context) {
    try {
      // For now, we'll use a mock response since the Tkone API endpoint seems to be unavailable
      // Replace this with actual API call when you have the correct endpoint
      
      console.log('⚠️ Using mock responses - replace with actual Tkone API when available');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate a mock response based on the prompt
      const mockResponse = this.generateMockResponse(prompt, context);
      
      // Add to conversation history
      this.messages.push({
        role: 'user',
        content: context ? `Context: ${context}\n\nQuestion: ${prompt}` : prompt
      });
      
      this.messages.push({
        role: 'assistant',
        content: mockResponse
      });

      return mockResponse;
    } catch (error) {
      console.error('Tkone API Error:', error);
      throw new Error('Failed to communicate with Tkone API');
    }
  }

  generateMockResponse(prompt, context) {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('shopify') || lowerPrompt.includes('app')) {
      return `I'd be happy to help you with Shopify app development! 

For Shopify apps, here are some key areas I can assist with:

1. **Remix Routes**: Creating API routes for your Shopify app
2. **Shopify API Integration**: Working with products, orders, customers
3. **Authentication**: Setting up OAuth and session management
4. **Webhooks**: Handling Shopify webhook events
5. **UI Components**: Building with Shopify Polaris

Could you provide more specific details about what you're trying to build?`;
    }
    
    if (lowerPrompt.includes('react') || lowerPrompt.includes('component')) {
      return `Here's how to create a React component for your Shopify app:

\`\`\`tsx
import React from 'react';
import { Card, Text } from '@shopify/polaris';

interface MyComponentProps {
  title: string;
  children?: React.ReactNode;
}

export function MyComponent({ title, children }: MyComponentProps) {
  return (
    <Card>
      <Text variant="headingMd" as="h2">
        {title}
      </Text>
      {children}
    </Card>
  );
}
\`\`\`

This component uses Shopify Polaris for consistent styling. Would you like me to help you with a specific component?`;
    }
    
    if (lowerPrompt.includes('typescript') || lowerPrompt.includes('type')) {
      return `TypeScript is great for Shopify app development! Here are some tips:

1. **Type your props**: Always define interfaces for component props
2. **Use Remix types**: Import types from \`@remix-run/node\` and \`@remix-run/react\`
3. **Shopify API types**: Use GraphQL codegen for type-safe API calls
4. **Environment variables**: Type your env vars with \`zod\` or similar

Example:
\`\`\`typescript
import { LoaderFunctionArgs } from '@remix-run/node';

export async function loader({ request }: LoaderFunctionArgs) {
  // Your loader logic here
  return json({ data: 'Hello' });
}
\`\`\`

What specific TypeScript question do you have?`;
    }
    
    if (lowerPrompt.includes('error') || lowerPrompt.includes('debug')) {
      return `I can help you debug your code! Here's my debugging approach:

1. **Check the error message**: Look for specific error details
2. **Review the stack trace**: Identify where the error occurs
3. **Check imports**: Ensure all imports are correct
4. **Verify types**: Make sure TypeScript types match
5. **Test in isolation**: Try to reproduce the error in a simple case

Please share the specific error message and code, and I'll help you fix it!`;
    }
    
    // Default response
    return `I'm here to help you with your Shopify app development! 

I can assist with:
- React components and hooks
- TypeScript type definitions
- Remix routes and loaders
- Shopify API integration
- Debugging and error fixing
- Code optimization

What would you like to work on today?`;
  }

  async generateCode(prompt, language = 'typescript') {
    const codePrompt = `Generate ${language} code for the following request. Provide only the code with minimal comments, formatted properly:

${prompt}`;

    return this.ask(codePrompt);
  }

  async debugCode(code, error) {
    const debugPrompt = `Debug the following ${error ? `code that has this error: ${error}` : 'code'}:

\`\`\`
${code}
\`\`\`

Please identify the issue and provide a corrected version.`;

    return this.ask(debugPrompt);
  }

  async explainCode(code) {
    const explainPrompt = `Explain the following code in detail:

\`\`\`
${code}
\`\`\`

Focus on what it does, how it works, and any potential improvements.`;

    return this.ask(explainPrompt);
  }

  async optimizeCode(code) {
    const optimizePrompt = `Optimize the following code for better performance, readability, and best practices:

\`\`\`
${code}
\`\`\`

Provide the optimized version with explanations of the improvements.`;

    return this.ask(optimizePrompt);
  }

  // Clear conversation history
  clearHistory() {
    this.messages = [
      {
        role: 'system',
        content: 'You are a helpful coding assistant specialized in Shopify app development, React, TypeScript, and Remix. You help developers build and debug their applications with clear, actionable advice.'
      }
    ];
  }

  // Get conversation history
  getHistory() {
    return [...this.messages];
  }
}

export { TkoneAgent };
