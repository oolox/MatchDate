import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sessionFromThread } from '../../types/session';
import type { Thread } from '../../types/chat';
import { inMemoryFileStorage, setFileStorageForTests } from './index';
import {
  deleteSession,
  listLibrary,
  saveSessionDocument,
  toggleFavorite,
} from './persistenceService';

describe('library catalog', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('lists sessions and prompts in the library', async () => {
    const thread: Thread = {
      id: 'chat-1',
      title: 'First chat',
      messages: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await saveSessionDocument(sessionFromThread(thread));

    const items = await listLibrary();
    expect(items.some((item) => item.kind === 'session' && item.id === 'chat-1')).toBe(true);
    expect(items.some((item) => item.kind === 'prompt' && item.id === 'default')).toBe(true);
  });

  it('toggles favorite on a library item', async () => {
    const thread: Thread = {
      id: 'chat-2',
      title: 'Favorite me',
      messages: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await saveSessionDocument(sessionFromThread(thread));

    const favorited = await toggleFavorite('session', 'chat-2');
    expect(favorited.isFavorite).toBe(true);

    const items = await listLibrary();
    const row = items.find((item) => item.kind === 'session' && item.id === 'chat-2');
    expect(row?.isFavorite).toBe(true);
  });

  it('deletes a session and updates active session', async () => {
    const thread: Thread = {
      id: 'chat-delete',
      title: 'Delete me',
      messages: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await saveSessionDocument(sessionFromThread(thread));

    const result = await deleteSession('chat-delete');
    expect(result.activeSessionId).not.toBe('chat-delete');

    const items = await listLibrary();
    expect(items.some((item) => item.kind === 'session' && item.id === 'chat-delete')).toBe(false);
  });
});
