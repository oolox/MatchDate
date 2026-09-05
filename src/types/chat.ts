export type ThreadId = string;

export type MessageRole = 'system' | 'user' | 'assistant';

export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

export type ChatAttachmentKind = 'text' | 'character';

/** Chip / persisted attachment metadata (bodies live in apiContent). */
export interface ChatAttachment {
  assetId: string;
  name: string;
  /** Defaults to `text` when omitted (older session docs). */
  kind?: ChatAttachmentKind;
  /** Present for text attachments. */
  mime?: string;
}

/** @deprecated Prefer ChatAttachment */
export type ChatTextAttachment = ChatAttachment;

export interface ThreadMessage {
  id: string;
  role: MessageRole;
  content: string;
  apiContent?: string;
  attachments?: ChatAttachment[];
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
