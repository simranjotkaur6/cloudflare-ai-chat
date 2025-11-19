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
│   │   └── chat-state.ts        # Durable Object for chat state management
│   └── types.ts                 # TypeScript type definitions
├── public/
│   └── index.html               # Frontend chat UI
├── wrangler.toml                # Cloudflare Workers configuration
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## Features

- ✅ Real-time chat interface with WebSocket support
- ✅ Persistent chat history using Durable Objects
- ✅ Session management and user tracking
- ✅ Beautiful, responsive UI with typing indicators
- ✅ Fallback HTTP API when WebSocket is unavailable
- ✅ Automatic reconnection on connection loss
- ✅ Message history loading

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
   - Open `http://localhost:8787/public/index.html` in your browser
   - Or use `http://localhost:8787` to access the API directly

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

### WebSocket `/api/ws/:sessionId`
Connect to realtime chat via WebSocket.

**Messages:**
- Send: `{ "type": "chat", "message": "...", "userId": "..." }`
- Receive: `{ "type": "message", "message": { ... } }`

## Components Explained

### Durable Objects (ChatState)
- Manages chat history for each session
- Handles WebSocket connections
- Persists state to durable storage
- Coordinates AI responses

### Workers AI Integration
- Uses Llama 3.3 8B Instruct model
- Maintains conversation context (last 10 messages)
- Configurable temperature and max tokens

### Frontend
- Vanilla JavaScript (no framework required)
- Real-time WebSocket communication
- Automatic reconnection
- Session persistence in browser storage

## Development Notes

- The application automatically creates session IDs for users
- Chat history is stored per session in Durable Objects
- WebSocket connections are managed by Durable Objects for scalability
- Falls back to HTTP API if WebSocket connection fails

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

