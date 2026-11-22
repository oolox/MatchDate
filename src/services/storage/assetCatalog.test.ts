import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  deleteAsset,
  listAssets,
  loadCharacterSetCopy,
  saveCharacterSetCopy,
} from './persistenceService';
import { getFileStorageService, setFileStorageForTests } from './index';
import { createInMemoryFileStorage, inMemoryFileStorage } from './inMemoryFileStorage';
import { saveImage } from './imageStorage';
import { saveVideo } from './videoStorage';
import { saveText } from './textStorage';
import { ensureCharacterSetAsset } from './assetPersistence';
import { assetPath, characterSetRootPath, LIBRARY_PATH, sessionDocumentPath } from './paths';
import { reconcileLibraryIndex } from './libraryIndex';
import { savedCharacterSetRefFromAsset } from './assetDocument';

describe('persistenceService assets', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('lists assets by subtype after save', async () => {
    await saveText(new Blob(['hello']), 'notes.txt');
    await saveImage(new Blob(['png']), { name: 'shot.png' });
    await saveVideo(new Blob(['mp4']), { name: 'clip.mp4' });

    const items = await listAssets();
    expect(items.some((item) => item.subtype === 'text')).toBe(true);
    expect(items.some((item) => item.subtype === 'image')).toBe(true);
    expect(items.some((item) => item.subtype === 'video')).toBe(true);
  });

  it('lists a characterSet asset and keeps its metadata', async () => {
    const storage = getFileStorageService();
    const rootPath = characterSetRootPath('set-1');
    const saved = await ensureCharacterSetAsset(storage, {
      id: 'set-1',
      fileName: 'date',
      path: rootPath,
      createdAt: '2026-01-01T00:00:00.000Z',
      metadata: { fileName: 'date', rootPath },
    });

    expect(saved.subtype).toBe('characterSet');
    expect(savedCharacterSetRefFromAsset(saved).metadata).toEqual({
      fileName: 'date',
      rootPath,
    });
    const items = await listAssets();
    expect(items.some((item) => item.id === 'set-1' && item.subtype === 'characterSet')).toBe(true);
  });

  it('saveCharacterSetCopy snapshots the store and delete removes that copy', async () => {
    const storage = createInMemoryFileStorage();
    setFileStorageForTests(storage);
    await storage.write('/masterdater/characters/alex.json', '{"name":"Alex"}');

    const saved = await saveCharacterSetCopy('date night');
    expect(saved.name).toBe('date night');
    expect(saved.fileCount).toBeGreaterThan(0);
    expect(
      await storage.read(`${saved.rootPath}/masterdater/characters/alex.json`),
    ).toBe('{"name":"Alex"}');

    const items = await listAssets();
    expect(items.some((item) => item.id === saved.id && item.subtype === 'characterSet')).toBe(
      true,
    );

    const other = await saveCharacterSetCopy('other night');

    await deleteAsset(saved.id);
    expect(await storage.exists(`${saved.rootPath}/masterdater/characters/alex.json`)).toBe(false);
    expect(await storage.exists(assetPath(saved.id))).toBe(false);
    expect(await storage.read('/masterdater/characters/alex.json')).toBe('{"name":"Alex"}');
    expect(
      await storage.read(`${other.rootPath}/masterdater/characters/alex.json`),
    ).toBe('{"name":"Alex"}');
    const after = await listAssets();
    expect(after.some((item) => item.id === saved.id)).toBe(false);
    expect(after.some((item) => item.id === other.id && item.subtype === 'characterSet')).toBe(
      true,
    );
  });

  it('saveCharacterSetCopy can omit chats and load them back only when they were saved', async () => {
    const storage = createInMemoryFileStorage();
    setFileStorageForTests(storage);
    const chatPath = sessionDocumentPath('chat-1');
    const session = JSON.stringify({
      schemaVersion: 1,
      type: 'generator',
      subtype: 'session',
      id: 'chat-1',
      name: 'Night',
      text: { messages: [] },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    await storage.write('/masterdater/characters/alex.json', '{"name":"Alex"}');
    await storage.write(chatPath, session);
    await storage.write(
      LIBRARY_PATH,
      JSON.stringify({
        items: [
          {
            kind: 'session',
            id: 'chat-1',
            name: 'Night',
            fileName: 'masterDater-chat-1.json',
            path: chatPath,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    const withoutChats = await saveCharacterSetCopy('quiet night', { includeChat: false });
    expect(await storage.exists(`${withoutChats.rootPath}${chatPath}`)).toBe(false);
    await storage.write('/masterdater/characters/later.json', '{"name":"Later"}');
    await loadCharacterSetCopy(withoutChats.id);
    expect(await storage.exists(chatPath)).toBe(false);
    expect(await storage.exists('/masterdater/characters/later.json')).toBe(false);
    const quiet = await reconcileLibraryIndex(storage);
    expect(quiet.items.some((item) => item.kind === 'session')).toBe(false);
    expect(await storage.read('/masterdater/characters/alex.json')).toBe('{"name":"Alex"}');
    expect(await storage.exists(assetPath(withoutChats.id))).toBe(true);

    await storage.write(chatPath, session);
    const withChats = await saveCharacterSetCopy('loud night', { includeChat: true });
    await storage.delete(chatPath);
    await loadCharacterSetCopy(withChats.id);
    expect(await storage.read(chatPath)).toContain('"Night"');
    const loud = await reconcileLibraryIndex(storage);
    expect(loud.items.some((item) => item.kind === 'session' && item.name === 'Night')).toBe(true);
  });

  it('loadCharacterSetCopy writes the snapshot back over the live store', async () => {
    const storage = createInMemoryFileStorage();
    setFileStorageForTests(storage);
    await storage.write('/masterdater/characters/alex.json', '{"name":"Alex"}');

    const saved = await saveCharacterSetCopy('date night');
    await storage.write('/masterdater/characters/alex.json', '{"name":"Changed"}');

    const loaded = await loadCharacterSetCopy(saved.id);
    expect(loaded.name).toBe('date night');
    expect(loaded.written).toBeGreaterThan(0);
    expect(await storage.read('/masterdater/characters/alex.json')).toBe('{"name":"Alex"}');
    expect(await storage.exists(`${saved.rootPath}/masterdater/characters/alex.json`)).toBe(true);
  });

  it('deleteAsset removes blobs and catalog rows', async () => {
    const image = await saveImage(new Blob(['png']), { name: 'temp.png' });
    await deleteAsset(image.id);
    const items = await listAssets();
    expect(items.some((item) => item.id === image.id)).toBe(false);
  });
});
