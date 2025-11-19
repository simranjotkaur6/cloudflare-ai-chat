export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  userId?: string;
}

export interface ChatHistory {
  messages: Message[];
  sessionId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface ChatRequest {
  message: string;
  userId: string;
  sessionId?: string;
}

export interface ChatResponse {
  userMessage: Message;
  assistantMessage: Message;
  history: Message[];
}

