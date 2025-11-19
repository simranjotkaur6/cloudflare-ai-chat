export interface ChatMetadata {
  sessionId: string;
  title: string;
  lastMessage?: string;
  lastMessageTime?: number;
  createdAt: number;
  messageCount: number;
}

export class UserChats {
  private state: DurableObjectState;
  private env: any;
  private chats: ChatMetadata[] = [];

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    this.loadChatsFromStorage();
  }

  private async loadChatsFromStorage() {
    try {
      const chats = await this.state.storage.get<ChatMetadata[]>('chats');
      if (chats && Array.isArray(chats)) {
        this.chats = chats;
        console.log(`Loaded ${chats.length} chats from storage`);
      }
    } catch (error) {
      console.error('Error loading chats from storage:', error);
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'GET') {
      return this.handleGetChats(request);
    } else if (request.method === 'POST') {
      return this.handleCreateChat(request);
    } else if (request.method === 'PUT') {
      return this.handleUpdateChat(request);
    } else if (request.method === 'DELETE') {
      return this.handleDeleteChat(request);
    }

    return new Response('Method not allowed', { status: 405 });
  }

  private async handleGetChats(request: Request): Promise<Response> {
    // Ensure chats are loaded
    if (this.chats.length === 0) {
      await this.loadChatsFromStorage();
    }

    // Sort by last message time (most recent first)
    const sortedChats = [...this.chats].sort((a, b) => {
      const timeA = a.lastMessageTime || a.createdAt;
      const timeB = b.lastMessageTime || b.createdAt;
      return timeB - timeA;
    });

    return new Response(JSON.stringify({
      chats: sortedChats,
      count: sortedChats.length,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleCreateChat(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { sessionId?: string; title?: string; userId: string };
      const { sessionId, title, userId } = body;

      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const newSessionId = sessionId || `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const chatTitle = title || 'New Chat';

      const newChat: ChatMetadata = {
        sessionId: newSessionId,
        title: chatTitle,
        createdAt: Date.now(),
        messageCount: 0,
      };

      this.chats.push(newChat);
      await this.state.storage.put('chats', this.chats);

      return new Response(JSON.stringify({
        chat: newChat,
        success: true,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleUpdateChat(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const sessionId = url.searchParams.get('sessionId');
      const body = await request.json() as { title?: string; lastMessage?: string; messageCount?: number };

      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'sessionId is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const chatIndex = this.chats.findIndex(c => c.sessionId === sessionId);
      if (chatIndex === -1) {
        return new Response(JSON.stringify({ error: 'Chat not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (body.title !== undefined) {
        this.chats[chatIndex].title = body.title;
      }
      if (body.lastMessage !== undefined) {
        this.chats[chatIndex].lastMessage = body.lastMessage;
        this.chats[chatIndex].lastMessageTime = Date.now();
      }
      if (body.messageCount !== undefined) {
        this.chats[chatIndex].messageCount = body.messageCount;
      }

      await this.state.storage.put('chats', this.chats);

      return new Response(JSON.stringify({
        chat: this.chats[chatIndex],
        success: true,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleDeleteChat(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const sessionId = url.searchParams.get('sessionId');

      if (!sessionId) {
        return new Response(JSON.stringify({ error: 'sessionId is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      this.chats = this.chats.filter(c => c.sessionId !== sessionId);
      await this.state.storage.put('chats', this.chats);

      return new Response(JSON.stringify({
        success: true,
        message: 'Chat deleted',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}

