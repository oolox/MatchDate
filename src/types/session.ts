import type { Thread, ThreadMessage } from './chat';

export interface SessionTextFields {
  messages: ThreadMessage[];
  systemPromptSlug?: string;
  modelId?: string;
  /** Compatibility strictness for dates. 0–100. */
  weight?: number;
  /** History beats included on a character card. */
  recentHistoryCount?: number;
  /**
   * Library text assets used as value models.
   * Missing means “inherit the global preprompt”. Empty means none.
   */
  valueModelIds?: string[];
}

/** Keep optional session fields when loading or saving a chat. Drops invalid values. */
export function readSessionTextFields(
  text: Partial<SessionTextFields> & { messages: ThreadMessage[] },
): SessionTextFields {
  const next: SessionTextFields = { messages: text.messages };
  if (typeof text.systemPromptSlug === 'string' && text.systemPromptSlug.trim()) {
    next.systemPromptSlug = text.systemPromptSlug;
  }
  if (typeof text.modelId === 'string' && text.modelId.trim()) {
    next.modelId = text.modelId;
  }
  if (typeof text.weight === 'number' && text.weight >= 0 && text.weight <= 100) {
    next.weight = Math.round(text.weight);
  }
  if (
    typeof text.recentHistoryCount === 'number' &&
    text.recentHistoryCount >= 0 &&
    text.recentHistoryCount <= 20
  ) {
    next.recentHistoryCount = Math.round(text.recentHistoryCount);
  }
  if (Array.isArray(text.valueModelIds)) {
    next.valueModelIds = text.valueModelIds.filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0,
    );
  }
  return next;
}

/** Chat-only session document (MasterDater v1). */
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
  const text = readSessionTextFields(session.text);
  return {
    id: session.id,
    title: session.name,
    messages: text.messages,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    systemPromptSlug: text.systemPromptSlug,
    modelId: text.modelId,
    weight: text.weight,
    recentHistoryCount: text.recentHistoryCount,
    valueModelIds: text.valueModelIds,
  };
}

export function applyThreadToSession(session: SessionDocument, thread: Thread): SessionDocument {
  return {
    ...session,
    id: thread.id,
    name: thread.title,
    text: readSessionTextFields({
      messages: thread.messages,
      systemPromptSlug: thread.systemPromptSlug,
      modelId: thread.modelId,
      weight: thread.weight,
      recentHistoryCount: thread.recentHistoryCount,
      valueModelIds: thread.valueModelIds,
    }),
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
    text: readSessionTextFields({
      messages: thread.messages,
      systemPromptSlug: thread.systemPromptSlug,
      modelId: thread.modelId,
      weight: thread.weight,
      recentHistoryCount: thread.recentHistoryCount,
      valueModelIds: thread.valueModelIds,
    }),
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
