import { Message, ChatHistory } from '../types';

export class ChatState {
  private state: DurableObjectState;
  private env: any;
  private chatHistory: Message[] = [];
  private websockets: WebSocket[] = [];

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    this.loadHistoryFromStorage();
  }

  private async loadHistoryFromStorage() {
    try {
      const history = await this.state.storage.get<Message[]>('chatHistory');
      if (history && Array.isArray(history)) {
        this.chatHistory = history;
        console.log(`Loaded ${history.length} messages from storage`);
      } else {
        console.log('No chat history found in storage, starting fresh');
      }
    } catch (error) {
      console.error('Error loading chat history from storage:', error);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    if (request.method === 'POST') {
      return this.handleChatMessage(request);
    } else if (request.method === 'GET') {
      return this.handleGetHistory(request);
    }

    return new Response('Method not allowed', { status: 405 });
  }

  private async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.state.acceptWebSocket(server);
    this.websockets.push(server);

    server.addEventListener('message', async (event: MessageEvent) => {
      try {
        console.log('WebSocket message received:', event.data);
        const data = JSON.parse(event.data as string) as { type?: string; message?: string; userId?: string };
        console.log('Parsed WebSocket data:', data);
        
        if (data.type === 'chat' && data.message) {
          console.log('Processing chat message via WebSocket:', data.message);
          const result = await this.processChatMessage(data.message, data.userId || 'anonymous');
          console.log('Chat message processed, result:', result);
        } else {
          console.log('Unknown message type or missing message:', data);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        try {
          server.send(JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          }));
        } catch (sendError) {
          console.error('Failed to send error to WebSocket:', sendError);
        }
      }
    });

    // Don't send history on connection - client will load it via HTTP
    // This prevents duplicate messages when switching chats

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleChatMessage(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { message?: string; userId?: string };
      const { message, userId } = body;
      if (!message) {
        return new Response(JSON.stringify({ error: 'Message is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const response = await this.processChatMessage(message, userId || 'anonymous');
      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleGetHistory(request: Request): Promise<Response> {
    if (this.chatHistory.length === 0) {
      await this.loadHistoryFromStorage();
    }
    
    return new Response(JSON.stringify({
      messages: this.chatHistory,
      count: this.chatHistory.length,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async processChatMessage(userMessage: string, userId: string) {
    if (this.chatHistory.length === 0) {
      await this.loadHistoryFromStorage();
    }
    
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
      userId,
    };
    this.chatHistory.push(userMsg);

    const recentMessages = this.chatHistory.slice(-10);
    const conversationContext = recentMessages
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const systemPrompt = `You are a helpful AI assistant. You are having a conversation with a user. 
Be concise, friendly, and helpful. Use the conversation history to provide context-aware responses.

Conversation history:
${conversationContext}

User: ${userMessage}
Assistant:`;

    let aiResponse: string;
    try {
      console.log('Calling Workers AI for message:', userMessage);
      
      let response: any;
      let modelError: any = null;
      
      const modelName = '@cf/meta/llama-3-8b-instruct';
      
      console.log(`Calling model: ${modelName}`);
      
      let promptText = 'You are a helpful AI assistant.\n\n';
      if (recentMessages.length > 0) {
        promptText += 'Conversation history:\n' + conversationContext + '\n\n';
      }
      promptText += `User: ${userMessage}\nAssistant:`;
      
      response = await this.env.AI.run(modelName, {
        prompt: promptText,
        max_tokens: 256,
        temperature: 0.7,
      });
      
      console.log('AI response received:', JSON.stringify(response, null, 2));

      if (response) {
        if (response.response && typeof response.response === 'string') {
          aiResponse = response.response.trim();
        } else if (typeof response === 'string') {
          aiResponse = response.trim();
        } else if (response.description) {
          aiResponse = response.description.trim();
        } else if (response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content) {
          aiResponse = response.choices[0].message.content.trim();
        } else {
          console.warn('Unexpected response format:', JSON.stringify(response, null, 2));
          aiResponse = JSON.stringify(response);
        }
        
        console.log('Extracted AI response:', aiResponse);
      } else {
        throw new Error('No response received from AI');
      }
      
      if (!aiResponse || aiResponse.trim() === '') {
        console.warn('Empty response, using fallback');
        aiResponse = 'I apologize, but I could not generate a response. Please try rephrasing your question.';
      }
    } catch (error: any) {
      console.error('AI API error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      if (error.message && error.message.includes('not available')) {
        aiResponse = 'Sorry, the AI model is currently not available. Please ensure Workers AI is enabled in your Cloudflare account.';
      } else if (error.message && error.message.includes('timeout')) {
        aiResponse = 'The AI request timed out. Please try again with a shorter message.';
      } else {
        aiResponse = `I encountered an error: ${error.message || 'Unknown error'}. Please check the console for details.`;
      }
    }

    const assistantMsg: Message = {
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now(),
    };
    this.chatHistory.push(assistantMsg);

    await this.state.storage.put('chatHistory', this.chatHistory);

    console.log(`Broadcasting to ${this.websockets.length} WebSocket connections`);
    const broadcastMessage = JSON.stringify({
      type: 'message',
      message: userMsg,
    });
    const assistantBroadcast = JSON.stringify({
      type: 'message',
      message: assistantMsg,
    });

    this.websockets = this.websockets.filter((ws) => {
      try {
        console.log('Sending user message to WebSocket');
        ws.send(broadcastMessage);
        console.log('Sending assistant message to WebSocket');
        ws.send(assistantBroadcast);
        console.log('Messages sent successfully');
        return true;
      } catch (error) {
        console.error('Error sending to WebSocket:', error);
        return false;
      }
    });
    console.log(`After broadcast, ${this.websockets.length} WebSocket connections remain`);

    return {
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      history: this.chatHistory,
    };
  }

  async alarm() {
    if (this.chatHistory.length > 100) {
      this.chatHistory = this.chatHistory.slice(-50);
      await this.state.storage.put('chatHistory', this.chatHistory);
    }
  }
}