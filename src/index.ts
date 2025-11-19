import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ChatState } from './durable-objects/chat-state';

export interface Env {
  AI: any;
  CHAT_STATE: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/', async (c) => {
  try {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cloudflare AI Chat</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #ffffff;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .chat-container {
            width: 100%;
            max-width: 800px;
            height: 90vh;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(244, 129, 32, 0.3);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .chat-header {
            background: linear-gradient(135deg, #F48120 0%, #FAAD3F 100%);
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 24px;
            font-weight: 600;
        }

        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
            background: #f5f5f5;
        }

        .message {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 18px;
            word-wrap: break-word;
            animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message.user {
            align-self: flex-end;
            background: linear-gradient(135deg, #F48120 0%, #FAAD3F 100%);
            color: white;
            border-bottom-right-radius: 4px;
        }

        .message.assistant {
            align-self: flex-start;
            background: white;
            color: #333;
            border-bottom-left-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .message-time {
            font-size: 11px;
            opacity: 0.7;
            margin-top: 5px;
        }

        .chat-input-container {
            padding: 20px;
            background: white;
            border-top: 1px solid #e0e0e0;
        }

        .chat-input-form {
            display: flex;
            gap: 10px;
        }

        .chat-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 24px;
            font-size: 16px;
            outline: none;
            transition: border-color 0.3s;
        }

        .chat-input:focus {
            border-color: #F48120;
        }

        .send-button {
            padding: 12px 24px;
            background: linear-gradient(135deg, #F48120 0%, #FAAD3F 100%);
            color: white;
            border: none;
            border-radius: 24px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .send-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(244, 129, 32, 0.4);
        }

        .send-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .status-indicator {
            padding: 10px 20px;
            background: #f5f5f5;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #4caf50;
        }

        .status-dot.disconnected {
            background: #f44336;
        }

        .typing-indicator {
            display: none;
            padding: 12px 16px;
            background: white;
            border-radius: 18px;
            align-self: flex-start;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .typing-indicator.active {
            display: block;
        }

        .typing-dots {
            display: flex;
            gap: 4px;
        }

        .typing-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #F48120;
            animation: typing 1.4s infinite;
        }

        .typing-dot:nth-child(2) {
            animation-delay: 0.2s;
        }

        .typing-dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes typing {
            0%, 60%, 100% {
                transform: translateY(0);
                opacity: 0.7;
            }
            30% {
                transform: translateY(-10px);
                opacity: 1;
            }
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            🤖 Cloudflare AI Chat
        </div>
        <div class="chat-messages" id="chatMessages">
            <div class="message assistant">
                <div>Hello! I'm your AI assistant powered by Cloudflare Workers AI. How can I help you today?</div>
                <div class="message-time">Just now</div>
            </div>
            <div class="typing-indicator" id="typingIndicator">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
        <div class="status-indicator">
            <div class="status-dot" id="statusDot"></div>
            <span id="statusText">Connecting...</span>
        </div>
        <div class="chat-input-container">
            <form class="chat-input-form" id="chatForm">
                <input 
                    type="text" 
                    class="chat-input" 
                    id="chatInput" 
                    placeholder="Type your message..."
                    autocomplete="off"
                />
                <button type="submit" class="send-button" id="sendButton">Send</button>
            </form>
        </div>
    </div>

    <script>
        class ChatApp {
            constructor() {
                this.apiUrl = window.location.origin.includes('localhost') 
                    ? window.location.origin
                    : window.location.origin;
                this.sessionId = this.getSessionId();
                this.userId = this.getUserId();
                this.ws = null;
                this.isConnected = false;
                
                this.chatMessages = document.getElementById('chatMessages');
                this.chatInput = document.getElementById('chatInput');
                this.chatForm = document.getElementById('chatForm');
                this.sendButton = document.getElementById('sendButton');
                this.statusDot = document.getElementById('statusDot');
                this.statusText = document.getElementById('statusText');
                this.typingIndicator = document.getElementById('typingIndicator');

                this.init();
            }

            getSessionId() {
                let sessionId = sessionStorage.getItem('chatSessionId');
                if (!sessionId) {
                    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    sessionStorage.setItem('chatSessionId', sessionId);
                }
                return sessionId;
            }

            getUserId() {
                let userId = localStorage.getItem('chatUserId');
                if (!userId) {
                    userId = 'user_' + Math.random().toString(36).substr(2, 9);
                    localStorage.setItem('chatUserId', userId);
                }
                return userId;
            }

            async init() {
                this.connectWebSocket();
                this.setupEventListeners();
                await this.loadHistory();
            }

            connectWebSocket() {
                try {
                    const wsUrl = (this.apiUrl.replace('http', 'ws') || 'ws://localhost:8787') + '/api/ws/' + this.sessionId;
                    this.ws = new WebSocket(wsUrl);

                    this.ws.onopen = () => {
                        this.isConnected = true;
                        this.updateStatus('Connected', true);
                        console.log('WebSocket connected');
                    };

                    this.ws.onmessage = (event) => {
                        const data = JSON.parse(event.data);
                        if (data.type === 'message') {
                            this.addMessage(data.message);
                        } else if (data.type === 'history') {
                            this.loadMessages(data.messages);
                        }
                    };

                    this.ws.onclose = () => {
                        this.isConnected = false;
                        this.updateStatus('Disconnected', false);
                        console.log('WebSocket disconnected');
                        setTimeout(() => this.connectWebSocket(), 3000);
                    };

                    this.ws.onerror = (error) => {
                        console.error('WebSocket error:', error);
                        this.updateStatus('Connection Error', false);
                    };
                } catch (error) {
                    console.error('Failed to connect WebSocket:', error);
                    this.updateStatus('Connection Failed', false);
                }
            }

            setupEventListeners() {
                console.log('Setting up event listeners');
                console.log('chatForm:', this.chatForm);
                console.log('chatInput:', this.chatInput);
                
                if (!this.chatForm) {
                    console.error('chatForm element not found!');
                    return;
                }
                
                this.chatForm.addEventListener('submit', async (e) => {
                    console.log('Form submitted');
                    e.preventDefault();
                    const message = this.chatInput.value.trim();
                    console.log('Message from input:', message);
                    if (message) {
                        
                        this.chatInput.value = '';
                        this.chatInput.disabled = true;
                        this.sendButton.disabled = true;
                        
                        try {
                            await this.sendMessage(message);
                        } finally {
                            this.chatInput.disabled = false;
                            this.sendButton.disabled = false;
                            this.chatInput.focus();
                        }
                    } else {
                        console.log('Empty message, not sending');
                    }
                });

                this.chatInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        console.log('Enter key pressed');
                        e.preventDefault();
                        this.chatForm.dispatchEvent(new Event('submit'));
                    }
                });
                
                console.log('Event listeners set up');
            }

            async sendMessage(message) {
                console.log('=== sendMessage START ===');
                console.log('sendMessage called with:', message);
                console.log('this.isConnected:', this.isConnected);
                console.log('this.ws:', this.ws);
                console.log('this.ws?.readyState:', this.ws?.readyState);
                
                const userMsg = {
                    role: 'user',
                    content: message,
                    timestamp: Date.now(),
                    userId: this.userId,
                };
                this.addMessage(userMsg);
                this.showTypingIndicator();

                console.log('Using HTTP API (WebSocket disabled for debugging)');
                try {
                    const url = this.apiUrl + '/api/chat';
                    console.log('Fetching:', url);
                    console.log('Request body:', JSON.stringify({
                        message: message,
                        userId: this.userId,
                        sessionId: this.sessionId,
                    }));
                    
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: message,
                            userId: this.userId,
                            sessionId: this.sessionId,
                        }),
                    });

                    console.log('Response status:', response.status);
                    console.log('Response ok:', response.ok);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Response error:', errorText);
                        throw new Error('HTTP ' + response.status + ': ' + errorText);
                    }
                    
                    const data = await response.json();
                    console.log('Response data:', data);
                    
                    if (data.assistantMessage) {
                        console.log('Got assistant message:', data.assistantMessage.content);
                        this.hideTypingIndicator();
                        this.addMessage(data.assistantMessage);
                    } else if (data.error) {
                        console.error('Response contains error:', data.error);
                        this.hideTypingIndicator();
                        this.addMessage({
                            role: 'assistant',
                            content: 'Error: ' + data.error,
                            timestamp: Date.now(),
                        });
                    } else {
                        console.warn('Unexpected response format:', data);
                        this.hideTypingIndicator();
                        this.addMessage({
                            role: 'assistant',
                            content: 'Unexpected response format. Check console.',
                            timestamp: Date.now(),
                        });
                    }
                } catch (error) {
                    console.error('=== FETCH ERROR ===');
                    console.error('Error type:', error.constructor.name);
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    this.hideTypingIndicator();
                    this.addMessage({
                        role: 'assistant',
                        content: 'Sorry, I encountered an error. Please try again. Error: ' + (error.message || 'Unknown error'),
                        timestamp: Date.now(),
                    });
                }
                console.log('=== sendMessage END ===');
            }

            async loadHistory() {
                try {
                    const response = await fetch(this.apiUrl + '/api/chat/history/' + this.sessionId);
                    const data = await response.json();
                    if (data.messages && data.messages.length > 0) {
                        this.loadMessages(data.messages);
                    }
                } catch (error) {
                    console.error('Failed to load history:', error);
                }
            }

            loadMessages(messages) {
                const existingMessages = this.chatMessages.querySelectorAll('.message:not(.assistant)');
                existingMessages.forEach(msg => msg.remove());

                messages.forEach(msg => {
                    if (msg.role !== 'system') {
                        this.addMessage(msg, false);
                    }
                });

                this.scrollToBottom();
            }

            addMessage(message, scroll = true) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ' + message.role;
                
                const contentDiv = document.createElement('div');
                contentDiv.textContent = message.content;
                messageDiv.appendChild(contentDiv);

                const timeDiv = document.createElement('div');
                timeDiv.className = 'message-time';
                timeDiv.textContent = this.formatTime(message.timestamp);
                messageDiv.appendChild(timeDiv);

                this.hideTypingIndicator();
                this.chatMessages.insertBefore(messageDiv, this.typingIndicator);
                
                if (scroll) {
                    this.scrollToBottom();
                }
            }

            showTypingIndicator() {
                this.typingIndicator.classList.add('active');
                this.scrollToBottom();
            }

            hideTypingIndicator() {
                this.typingIndicator.classList.remove('active');
            }

            updateStatus(text, connected) {
                this.statusText.textContent = text;
                if (connected) {
                    this.statusDot.classList.remove('disconnected');
                } else {
                    this.statusDot.classList.add('disconnected');
                }
            }

            formatTime(timestamp) {
                const date = new Date(timestamp);
                const now = new Date();
                const diff = now - date;

                if (diff < 60000) {
                    return 'Just now';
                } else if (diff < 3600000) {
                    return Math.floor(diff / 60000) + ' minutes ago';
                } else if (diff < 86400000) {
                    return Math.floor(diff / 3600000) + ' hours ago';
                } else {
                    return date.toLocaleDateString();
                }
            }

            scrollToBottom() {
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM loaded, initializing ChatApp');
            try {
                new ChatApp();
                console.log('ChatApp initialized');
            } catch (error) {
                console.error('Error initializing ChatApp:', error);
            }
        });
    </script>
</body>
</html>`;
    return c.html(html);
  } catch (error) {
    return c.json({ error: 'Failed to serve frontend' }, 500);
  }
});

app.get('/api', (c) => {
  return c.json({ status: 'ok', message: 'Cloudflare AI App API' });
});

app.get('/api/test-ai', async (c) => {
  try {
    console.log('Testing Workers AI...');
    
    const response = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      prompt: 'Say "Hello, I am working!" in one sentence.',
      max_tokens: 50,
    });
    
    console.log('AI test response:', response);
    
    return c.json({ 
      status: 'success', 
      response: response,
      raw: JSON.stringify(response)
    });
  } catch (error: any) {
    console.error('AI test error:', error);
    return c.json({ 
      status: 'error', 
      error: error.message,
      details: JSON.stringify(error, null, 2)
    }, 500);
  }
});

app.post('/api/chat', async (c) => {
  try {
    const { message, userId, sessionId } = await c.req.json();

    if (!message || !userId) {
      return c.json({ error: 'Message and userId are required' }, 400);
    }

    const id = c.env.CHAT_STATE.idFromName(sessionId || userId);
    const chatState = c.env.CHAT_STATE.get(id);

    const response = await chatState.fetch(c.req.raw, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, userId }),
    });

    return response;
  } catch (error: any) {
    console.error('Chat error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

app.get('/api/chat/history/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    if (!sessionId) {
      return c.json({ error: 'sessionId is required' }, 400);
    }

    const id = c.env.CHAT_STATE.idFromName(sessionId);
    const chatState = c.env.CHAT_STATE.get(id);

    const response = await chatState.fetch(c.req.raw, {
      method: 'GET',
    });

    return response;
  } catch (error: any) {
    console.error('Get history error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

app.get('/api/ws/:sessionId', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    if (!sessionId) {
      return new Response('sessionId is required', { status: 400 });
    }

    const upgradeHeader = c.req.header('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const id = c.env.CHAT_STATE.idFromName(sessionId);
    const chatState = c.env.CHAT_STATE.get(id);

    return chatState.fetch(c.req.raw);
  } catch (error: any) {
    console.error('WebSocket error:', error);
    return new Response(error.message || 'Internal server error', { status: 500 });
  }
});

export default app;

export { ChatState };