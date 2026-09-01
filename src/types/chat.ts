export type ThreadId = string;

export type MessageRole = 'system' | 'user' | 'assistant';

export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

export interface ThreadMessage {
  id: string;
  role: MessageRole;
  content: string;
  apiContent?: string;
  status?: MessageStatus;
  createdAt: string;
}

export interface Thread {
  id: ThreadId;
  title: string;
  messages: ThreadMessage[];
  createdAt: string;
  updatedAt: string;
  systemPromptSlug?: string;
  modelId?: string;
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
}
