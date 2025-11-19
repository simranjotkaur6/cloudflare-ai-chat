# Cloudflare AI Chat Application

A complete AI-powered chat application built on Cloudflare's edge platform, featuring Llama 3.3, Durable Objects for state management, and realtime WebSocket communication.

## Architecture

This application includes all required components:

1. **LLM**: Uses Llama 3.3 via Cloudflare Workers AI (`@cf/meta/llama-3.3-8b-instruct`)
2. **Workflow/Coordination**: Cloudflare Workers with Hono framework
3. **User Input**: Cloudflare Pages frontend with realtime WebSocket chat interface
4. **Memory/State**: Durable Objects for persistent chat history and session management

## Project Structure

```
cloudflare/
├── src/
│   ├── index.ts                 # Main Worker entry point
│   ├── durable-objects/
│   │   ├── chat-state.ts        # Durable Object for chat state management
│   │   └── user-chats.ts        # Durable Object for managing user's chat list
│   └── types.ts                 # TypeScript type definitions
├── public/
│   └── index.html               # Frontend chat UI
├── wrangler.toml                # Cloudflare Workers configuration
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## Features

- ✅ **Multiple Chat Sessions** - Create and manage multiple chat conversations
- ✅ **Chat Sidebar** - View all your chats in a convenient sidebar with previews
- ✅ **Real-time chat interface** with WebSocket support
- ✅ **Persistent chat history** using Durable Objects
- ✅ **Session management** and user tracking
- ✅ **Beautiful, responsive UI** with Cloudflare orange theme
- ✅ **Typing indicators** for better UX
- ✅ **Fallback HTTP API** when WebSocket is unavailable
- ✅ **Automatic reconnection** on connection loss
- ✅ **Message history loading** per chat session
- ✅ **Duplicate message prevention** when switching between chats

## Setup and Deployment

### Prerequisites

1. Node.js 18+ installed
2. Cloudflare account with Workers AI enabled
3. Wrangler CLI installed globally (or via npx)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Cloudflare:**
   - Update `wrangler.toml` with your project name
   - Ensure Workers AI is enabled in your Cloudflare dashboard

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Open `http://localhost:8787` in your browser (frontend is served at root)
   - The app features a sidebar with chat list and main chat area
   - Click "+ New Chat" to create your first conversation

### Deployment

1. **Deploy to Cloudflare:**
   ```bash
   npm run deploy
   ```

2. **Deploy Pages (for frontend):**
   ```bash
   wrangler pages deploy public
   ```

   Or connect your repository to Cloudflare Pages in the dashboard.

### Configuration

Update `wrangler.toml` to customize:
- Worker name
- Routes
- Environment variables
- Durable Object settings

## API Endpoints

### POST `/api/chat`
Send a chat message and get AI response.

**Request:**
```json
{
  "message": "Hello, how are you?",
  "userId": "user123",
  "sessionId": "session123" // optional
}
```

**Response:**
```json
{
  "userMessage": { ... },
  "assistantMessage": { ... },
  "history": [ ... ]
}
```

### GET `/api/chat/history/:sessionId`
Get chat history for a session.

**Response:**
```json
{
  "messages": [ ... ],
  "count": 10
}
```

### GET `/api/chats/list?userId=:userId`
Get list of all chats for a user.

**Response:**
```json
{
  "chats": [
    {
      "sessionId": "chat_123...",
      "title": "New Chat",
      "lastMessage": "Hello!",
      "lastMessageTime": 1234567890,
      "createdAt": 1234567890,
      "messageCount": 5
    }
  ],
  "count": 1
}
```

### POST `/api/chats/create`
Create a new chat session.

**Request:**
```json
{
  "userId": "user123",
  "sessionId": "chat_123..." // optional, auto-generated if not provided
  "title": "New Chat" // optional, defaults to "New Chat"
}
```

**Response:**
```json
{
  "chat": { ... },
  "success": true
}
```

### PUT `/api/chats/update?userId=:userId&sessionId=:sessionId`
Update chat metadata (title, last message, etc.).

**Request:**
```json
{
  "title": "Updated Title", // optional
  "lastMessage": "Last message preview", // optional
  "messageCount": 10 // optional
}
```

### DELETE `/api/chats/delete?userId=:userId&sessionId=:sessionId`
Delete a chat session.

**Response:**
```json
{
  "success": true,
  "message": "Chat deleted"
}
```

### WebSocket `/api/ws/:sessionId`
Connect to realtime chat via WebSocket.

**Messages:**
- Send: `{ "type": "chat", "message": "...", "userId": "..." }`
- Receive: `{ "type": "message", "message": { ... } }`

## Components Explained

### Durable Objects

#### ChatState
- Manages chat history for each session
- Handles WebSocket connections
- Persists state to durable storage
- Coordinates AI responses
- One instance per chat session

#### UserChats
- Manages list of all chats for a user
- Stores chat metadata (title, last message, timestamps)
- Handles chat creation, updates, and deletion
- One instance per user

### Workers AI Integration
- Uses Llama 3.3 8B Instruct model (`@cf/meta/llama-3-8b-instruct`)
- Maintains conversation context (last 10 messages)
- Configurable temperature and max tokens
- Automatic fallback to different model versions if needed

### Frontend
- **Sidebar Navigation** - View and switch between multiple chats
- **Chat Management** - Create new chats, see chat previews
- **Real-time Updates** - WebSocket communication for instant messages
- **Automatic Reconnection** - Handles connection drops gracefully
- **Session Persistence** - Chat history saved per session
- **Duplicate Prevention** - Smart message deduplication when switching chats
- **Cloudflare Branding** - Orange theme matching Cloudflare's design
- Vanilla JavaScript (no framework required)

## Development Notes

### Multiple Chats Feature
- Users can create unlimited chat sessions
- Each chat has its own isolated conversation history
- Chat list is stored per user in a separate Durable Object (`UserChats`)
- Chat metadata (title, last message, timestamps) is automatically updated
- Switching between chats loads the appropriate history without duplicates

### Session Management
- The application automatically creates session IDs for new chats
- Chat history is stored per session in Durable Objects (`ChatState`)
- User ID is stored in browser localStorage for persistence
- Session IDs are stored in sessionStorage (cleared on browser close)

### WebSocket & HTTP
- WebSocket connections are managed by Durable Objects for scalability
- Falls back to HTTP API if WebSocket connection fails
- History is loaded via HTTP to prevent duplicate messages
- Real-time messages are delivered via WebSocket when available

### Performance
- Duplicate message prevention when switching chats
- Efficient chat list rendering with previews
- Lazy loading of chat history
- Automatic cleanup of old messages (keeps last 50 if history exceeds 100)

## Troubleshooting

**Issue: Workers AI not available**
- Ensure Workers AI is enabled in your Cloudflare account
- Check that you're using the correct model identifier

**Issue: WebSocket connection fails**
- Verify CORS settings in `wrangler.toml`
- Check that Durable Objects are properly configured
- Ensure your Worker has WebSocket upgrade capability

**Issue: Chat history not persisting**
- Verify Durable Objects storage is working
- Check browser console for errors
- Ensure session IDs are being maintained

**Issue: Duplicate messages when switching chats**
- This has been fixed with duplicate detection
- If you still see duplicates, clear browser cache and refresh
- Check that WebSocket connections are properly closed when switching

**Issue: Chat list not loading**
- Verify the `USER_CHATS` Durable Object is configured in `wrangler.toml`
- Check browser console for API errors
- Ensure `userId` is being generated and stored in localStorage

