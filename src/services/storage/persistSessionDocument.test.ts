import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { inMemoryFileStorage, setFileStorageForTests } from './index';
import {
  loadSessionDocument,
  saveSessionDocument,
  setActiveSession,
} from './persistenceService';
import { sessionFromThread } from '../../types/session';
import type { Thread } from '../../types/chat';

describe('persistSessionDocument', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('saves and loads a chat session', async () => {
    const thread: Thread = {
      id: 'abc-123',
      title: 'Date ideas',
      messages: [
        {
          id: 'm1',
          role: 'user',
          content: 'Hello',
          status: 'complete',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'm2',
          role: 'assistant',
          content: 'Hi there!',
          status: 'complete',
          createdAt: '2026-01-01T00:00:01.000Z',
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:01.000Z',
    };

    const saved = await saveSessionDocument(sessionFromThread(thread));
    expect(saved.name).toBe('Date ideas');
    expect(saved.text.messages).toHaveLength(2);

    const { session } = await loadSessionDocument('abc-123');
    expect(session.text.messages[1]?.content).toBe('Hi there!');
  });

  it('sets active session in config', async () => {
    const thread: Thread = {
      id: 'sess-1',
      title: 'Test',
      messages: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    await saveSessionDocument(sessionFromThread(thread));
    await setActiveSession('sess-1');

    const { session } = await loadSessionDocument('sess-1');
    expect(session.id).toBe('sess-1');
  });
});
