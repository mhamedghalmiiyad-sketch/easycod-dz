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
      // Add context if provided
      const fullPrompt = context ? `Context: ${context}\n\nQuestion: ${prompt}` : prompt;
      
      // Add user message
      this.messages.push({
        role: 'user',
        content: fullPrompt
      });

      const response = await axios.post(
        this.apiUrl,
        {
          model: 'gpt-4', // You may need to adjust this based on Tkone's available models
          messages: this.messages,
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      const assistantMessage = response.data.choices[0].message.content;
      
      // Add assistant response to conversation history
      this.messages.push({
        role: 'assistant',
        content: assistantMessage
      });

      return assistantMessage;
    } catch (error) {
      console.error('Tkone API Error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Tkone API Error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw new Error('Failed to communicate with Tkone API');
    }
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
