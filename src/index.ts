import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ChatState } from './durable-objects/chat-state';
import { UserChats } from './durable-objects/user-chats';

// Export Durable Objects at the top level for Cloudflare Workers
export { ChatState, UserChats };

export interface Env {
  AI: any;
  CHAT_STATE: DurableObjectNamespace;
  USER_CHATS: DurableObjectNamespace;
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
            background: #f5f5f5;
            height: 100vh;
            margin: 0;
            padding: 0;
            display: flex;
            overflow: hidden;
        }

        .app-container {
            width: 100%;
            height: 100vh;
            display: flex;
        }

        .sidebar {
            width: 300px;
            background: white;
            border-right: 1px solid #e0e0e0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .sidebar-header {
            padding: 20px;
            background: linear-gradient(135deg, #F48120 0%, #FAAD3F 100%);
            color: white;
        }

        .sidebar-header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
        }

        .new-chat-button {
            margin: 15px;
            padding: 12px 20px;
            background: linear-gradient(135deg, #F48120 0%, #FAAD3F 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .new-chat-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(244, 129, 32, 0.3);
        }

        .chat-list {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }

        .chat-item {
            padding: 12px 15px;
            margin-bottom: 5px;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.2s;
            border: 1px solid transparent;
        }

        .chat-item:hover {
            background: #f5f5f5;
        }

        .chat-item.active {
            background: rgba(244, 129, 32, 0.1);
            border-color: #F48120;
        }

        .chat-item-title {
            font-weight: 600;
            font-size: 14px;
            color: #333;
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .chat-item-preview {
            font-size: 12px;
            color: #666;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .chat-item-time {
            font-size: 11px;
            color: #999;
            margin-top: 4px;
        }

        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: white;
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
    <div class="app-container">
        <div class="sidebar">
            <div class="sidebar-header">
                <h1>🤖 Cloudflare AI</h1>
            </div>
            <button class="new-chat-button" id="newChatButton">+ New Chat</button>
            <div class="chat-list" id="chatList">
                <!-- Chat items will be inserted here -->
            </div>
        </div>
        <div class="chat-container">
            <div class="chat-header">
                <span id="currentChatTitle">New Chat</span>
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
    </div>

    <script>
        class ChatApp {
            constructor() {
                this.apiUrl = window.location.origin.includes('localhost') 
                    ? window.location.origin
                    : window.location.origin;
                this.userId = this.getUserId();
                this.sessionId = null;
                this.currentChat = null;
                this.chats = [];
                this.ws = null;
                this.isConnected = false;
                
                this.chatMessages = document.getElementById('chatMessages');
                this.chatInput = document.getElementById('chatInput');
                this.chatForm = document.getElementById('chatForm');
                this.sendButton = document.getElementById('sendButton');
                this.statusDot = document.getElementById('statusDot');
                this.statusText = document.getElementById('statusText');
                this.typingIndicator = document.getElementById('typingIndicator');
                this.chatList = document.getElementById('chatList');
                this.newChatButton = document.getElementById('newChatButton');
                this.currentChatTitle = document.getElementById('currentChatTitle');

                this.init();
            }

            setSessionId(sessionId) {
                this.sessionId = sessionId;
                sessionStorage.setItem('chatSessionId', sessionId);
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
                this.setupEventListeners();
                await this.loadChats();
                // Create or load first chat
                if (this.chats.length === 0) {
                    await this.createNewChat();
                } else {
                    await this.switchToChat(this.chats[0].sessionId);
                }
            }

            connectWebSocket() {
                if (!this.sessionId) return;
                
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
                            // Only add message if it's not already in the chat (check by timestamp and content)
                            const messageExists = Array.from(this.chatMessages.querySelectorAll('.message')).some(msg => {
                                const timeDiv = msg.querySelector('.message-time');
                                if (timeDiv && data.message.timestamp) {
                                    // Check if message with same timestamp exists
                                    return false; // We'll add it anyway, but check for duplicates
                                }
                                return false;
                            });
                            if (!messageExists) {
                                this.addMessage(data.message);
                            }
                        } else if (data.type === 'history') {
                            // Don't load history via WebSocket if we just loaded it via HTTP
                            // Only load if chat is empty
                            const existingMessages = this.chatMessages.querySelectorAll('.message');
                            if (existingMessages.length <= 1) { // Only welcome message
                                this.loadMessages(data.messages);
                            }
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
                if (!this.chatForm) {
                    console.error('chatForm element not found!');
                    return;
                }
                
                this.newChatButton.addEventListener('click', () => {
                    this.createNewChat();
                });
                
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
                
                // Update chat metadata with user message
                await this.updateChatMetadata(userMsg);

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
                        // Update chat metadata
                        await this.updateChatMetadata(data.assistantMessage);
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

            async loadChats() {
                try {
                    const response = await fetch(this.apiUrl + '/api/chats/list?userId=' + this.userId);
                    const data = await response.json();
                    if (data.chats) {
                        this.chats = data.chats;
                        this.renderChatList();
                    }
                } catch (error) {
                    console.error('Failed to load chats:', error);
                }
            }

            async createNewChat() {
                try {
                    const response = await fetch(this.apiUrl + '/api/chats/create', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId: this.userId,
                        }),
                    });

                    const data = await response.json();
                    if (data.chat) {
                        this.chats.unshift(data.chat);
                        this.renderChatList();
                        await this.switchToChat(data.chat.sessionId);
                    }
                } catch (error) {
                    console.error('Failed to create chat:', error);
                }
            }

            async switchToChat(sessionId) {
                this.setSessionId(sessionId);
                this.currentChat = this.chats.find(c => c.sessionId === sessionId);
                
                if (this.currentChat) {
                    this.currentChatTitle.textContent = this.currentChat.title;
                }
                
                // Close existing WebSocket
                if (this.ws) {
                    this.ws.onmessage = null; // Remove message handler to prevent duplicate messages
                    this.ws.close();
                    this.ws = null;
                    this.isConnected = false;
                }
                
                // Clear messages but keep typing indicator structure
                const typingIndicator = this.typingIndicator.outerHTML;
                this.chatMessages.innerHTML = '';
                this.chatMessages.insertAdjacentHTML('beforeend', typingIndicator);
                this.typingIndicator = document.getElementById('typingIndicator');
                
                // Load history for this chat (don't connect WebSocket - we'll do that after)
                await this.loadHistory();
                
                // Small delay to ensure history is loaded before WebSocket connects
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Connect WebSocket for new session
                this.connectWebSocket();
                
                // Update active chat in sidebar
                this.renderChatList();
            }

            renderChatList() {
                this.chatList.innerHTML = '';
                
                this.chats.forEach(chat => {
                    const chatItem = document.createElement('div');
                    chatItem.className = 'chat-item';
                    if (this.currentChat && chat.sessionId === this.currentChat.sessionId) {
                        chatItem.classList.add('active');
                    }
                    
                    chatItem.addEventListener('click', () => {
                        this.switchToChat(chat.sessionId);
                    });
                    
                    const title = document.createElement('div');
                    title.className = 'chat-item-title';
                    title.textContent = chat.title;
                    
                    const preview = document.createElement('div');
                    preview.className = 'chat-item-preview';
                    preview.textContent = chat.lastMessage || 'No messages yet';
                    
                    const time = document.createElement('div');
                    time.className = 'chat-item-time';
                    if (chat.lastMessageTime) {
                        time.textContent = this.formatTime(chat.lastMessageTime);
                    } else {
                        time.textContent = this.formatTime(chat.createdAt);
                    }
                    
                    chatItem.appendChild(title);
                    chatItem.appendChild(preview);
                    chatItem.appendChild(time);
                    this.chatList.appendChild(chatItem);
                });
            }

            async updateChatMetadata(message) {
                if (!this.currentChat || !message || !message.content) return;
                
                try {
                    const lastMessage = message.content ? message.content.substring(0, 50) : '';
                    await fetch(this.apiUrl + '/api/chats/update?userId=' + this.userId + '&sessionId=' + this.sessionId, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            lastMessage: lastMessage,
                            messageCount: (this.currentChat.messageCount || 0) + 1,
                        }),
                    });
                    
                    // Reload chats to get updated data
                    await this.loadChats();
                } catch (error) {
                    console.error('Failed to update chat metadata:', error);
                }
            }

            async loadHistory() {
                if (!this.sessionId) return;
                
                try {
                    const response = await fetch(this.apiUrl + '/api/chat/history/' + this.sessionId);
                    const data = await response.json();
                    if (data.messages && data.messages.length > 0) {
                        this.loadMessages(data.messages);
                    } else {
                        // Show welcome message if no history
                        const welcomeMsg = document.createElement('div');
                        welcomeMsg.className = 'message assistant';
                        const welcomeContent = document.createElement('div');
                        welcomeContent.textContent = 'Hello! I\\'m your AI assistant powered by Cloudflare Workers AI. How can I help you today?';
                        const welcomeTime = document.createElement('div');
                        welcomeTime.className = 'message-time';
                        welcomeTime.textContent = 'Just now';
                        welcomeMsg.appendChild(welcomeContent);
                        welcomeMsg.appendChild(welcomeTime);
                        this.chatMessages.insertBefore(welcomeMsg, this.typingIndicator);
                    }
                } catch (error) {
                    console.error('Failed to load history:', error);
                }
            }

            loadMessages(messages) {
                // Clear all messages except typing indicator
                const typingIndicator = this.typingIndicator;
                this.chatMessages.innerHTML = '';
                this.chatMessages.appendChild(typingIndicator);
                this.typingIndicator = typingIndicator;

                // Add messages, avoiding duplicates
                const addedTimestamps = new Set();
                messages.forEach(msg => {
                    if (msg.role !== 'system') {
                        // Use timestamp + content as unique key to prevent duplicates
                        const msgKey = msg.timestamp + '_' + msg.content.substring(0, 20);
                        if (!addedTimestamps.has(msgKey)) {
                            addedTimestamps.add(msgKey);
                            this.addMessage(msg, false);
                        }
                    }
                });

                this.scrollToBottom();
            }

            addMessage(message, scroll = true) {
                // Check if message already exists to prevent duplicates
                const existingMessages = this.chatMessages.querySelectorAll('.message');
                for (const existing of existingMessages) {
                    const timeDiv = existing.querySelector('.message-time');
                    const contentDiv = existing.querySelector('div:first-child');
                    if (timeDiv && contentDiv && 
                        contentDiv.textContent === message.content) {
                        const existingTimestamp = parseInt(timeDiv.getAttribute('data-timestamp') || '0');
                        if (Math.abs(existingTimestamp - message.timestamp) < 1000) {
                            // Message already exists, don't add again
                            return;
                        }
                    }
                }
                
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message ' + message.role;
                
                const contentDiv = document.createElement('div');
                contentDiv.textContent = message.content;
                messageDiv.appendChild(contentDiv);

                const timeDiv = document.createElement('div');
                timeDiv.className = 'message-time';
                timeDiv.textContent = this.formatTime(message.timestamp);
                timeDiv.setAttribute('data-timestamp', message.timestamp.toString());
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

// Chat management endpoints
app.get('/api/chats/list', async (c) => {
  try {
    const userId = c.req.query('userId');
    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const id = c.env.USER_CHATS.idFromName(userId);
    const userChats = c.env.USER_CHATS.get(id);

    const response = await userChats.fetch(c.req.raw, {
      method: 'GET',
    });

    return response;
  } catch (error: any) {
    console.error('List chats error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

app.post('/api/chats/create', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, sessionId, title } = body;

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const id = c.env.USER_CHATS.idFromName(userId);
    const userChats = c.env.USER_CHATS.get(id);

    const response = await userChats.fetch(c.req.raw, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, title, userId }),
    });

    return response;
  } catch (error: any) {
    console.error('Create chat error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

app.put('/api/chats/update', async (c) => {
  try {
    const userId = c.req.query('userId');
    const sessionId = c.req.query('sessionId');
    const body = await c.req.json();

    if (!userId || !sessionId) {
      return c.json({ error: 'userId and sessionId are required' }, 400);
    }

    const id = c.env.USER_CHATS.idFromName(userId);
    const userChats = c.env.USER_CHATS.get(id);

    const url = new URL(c.req.url);
    url.searchParams.set('sessionId', sessionId);

    const response = await userChats.fetch(new Request(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }));

    return response;
  } catch (error: any) {
    console.error('Update chat error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

app.delete('/api/chats/delete', async (c) => {
  try {
    const userId = c.req.query('userId');
    const sessionId = c.req.query('sessionId');

    if (!userId || !sessionId) {
      return c.json({ error: 'userId and sessionId are required' }, 400);
    }

    const id = c.env.USER_CHATS.idFromName(userId);
    const userChats = c.env.USER_CHATS.get(id);

    const url = new URL(c.req.url);
    url.searchParams.set('sessionId', sessionId);

    const response = await userChats.fetch(new Request(url.toString(), {
      method: 'DELETE',
    }));

    return response;
  } catch (error: any) {
    console.error('Delete chat error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export default app;