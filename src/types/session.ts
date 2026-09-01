import type { Thread, ThreadMessage } from './chat';

export interface SessionTextFields {
  messages: ThreadMessage[];
  systemPromptSlug?: string;
  modelId?: string;
}

/** Chat-only session document (MatchDate v1). */
export interface SessionDocument {
  schemaVersion: number;
  type: 'generator';
  subtype: 'session';
  id: string;
  name: string;
  text: SessionTextFields;
  createdAt: string;
  updatedAt: string;
}

export function emptyTextFields(): SessionTextFields {
  return { messages: [] };
}

export function sessionToThread(session: SessionDocument): Thread {
  return {
    id: session.id,
    title: session.name,
    messages: session.text.messages,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    systemPromptSlug: session.text.systemPromptSlug,
    modelId: session.text.modelId,
  };
}

export function applyThreadToSession(session: SessionDocument, thread: Thread): SessionDocument {
  return {
    ...session,
    id: thread.id,
    name: thread.title,
    text: {
      messages: thread.messages,
      systemPromptSlug: thread.systemPromptSlug,
      modelId: thread.modelId,
    },
    updatedAt: thread.updatedAt,
  };
}

export function sessionFromThread(thread: Thread): SessionDocument {
  const now = thread.updatedAt;
  return {
    schemaVersion: 2,
    type: 'generator',
    subtype: 'session',
    id: thread.id,
    name: thread.title,
    text: {
      messages: thread.messages,
      systemPromptSlug: thread.systemPromptSlug,
      modelId: thread.modelId,
    },
    createdAt: thread.createdAt || now,
    updatedAt: now,
  };
}

export function createEmptySession(options: {
  id: string;
  name?: string;
}): SessionDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: 2,
    type: 'generator',
    subtype: 'session',
    id: options.id,
    name: options.name ?? 'New chat',
    text: emptyTextFields(),
    createdAt: now,
    updatedAt: now,
  };
}
