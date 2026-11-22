import { describe, expect, it, beforeEach } from 'vitest';
import { unzipSync, zipSync } from 'fflate';
import { createInMemoryFileStorage } from './inMemoryFileStorage';
import { setFileStorageForTests } from './index';
import { reconcileLibraryIndex } from './libraryIndex';
import { LIBRARY_PATH, sessionDocumentPath } from './paths';
import {
  collectOpfsTree,
  copyOpfsStoreSnapshot,
  defaultOpfsBackupFilename,
  deleteOpfsTree,
  restoreOpfsStoreSnapshot,
  gameBackupFilename,
  gameSaveStem,
  exportOpfsZipBlob,
  importOpfsZip,
  zipEntryToStoragePath,
} from './opfsBackup';

const CHAT_ID = 'chat-1';
const CHAT_PATH = sessionDocumentPath(CHAT_ID);

function libraryWithChat(): string {
  return JSON.stringify({
    items: [
      {
        kind: 'session',
        type: 'generator',
        subtype: 'session',
        id: CHAT_ID,
        name: 'Night',
        fileName: 'masterDater-chat-1.json',
        path: CHAT_PATH,
        isFavorite: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
      {
        kind: 'character',
        type: 'character',
        subtype: 'character',
        id: 'alex',
        name: 'Alex',
        fileName: 'alex.json',
        path: '/masterdater/characters/alex.json',
        isFavorite: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
}

function sessionDocument(): string {
  return JSON.stringify({
    schemaVersion: 1,
    type: 'generator',
    subtype: 'session',
    id: CHAT_ID,
    name: 'Night',
    text: { messages: [{ role: 'user', content: 'hello' }] },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
}

describe('opfsBackup', () => {
  beforeEach(() => {
    setFileStorageForTests(createInMemoryFileStorage());
  });

  it('zipEntryToStoragePath accepts masterdater paths and rejects traversal', () => {
    expect(zipEntryToStoragePath('masterdater/config.json')).toBe('/masterdater/config.json');
    expect(zipEntryToStoragePath('/masterdater/assets/img/a.png')).toBe(
      '/masterdater/assets/img/a.png',
    );
    expect(() => zipEntryToStoragePath('masterdater/../etc/passwd')).toThrow();
    expect(() => zipEntryToStoragePath('other/root.json')).toThrow();
  });

  it('canonicalizes legacy matchdate zip entries', () => {
    expect(zipEntryToStoragePath('matchdate/config.json')).toBe('/masterdater/config.json');
    expect(zipEntryToStoragePath('matchdate/assets/img/matchDate-img-1.png')).toBe(
      '/masterdater/assets/img/masterDater-img-1.png',
    );
  });

  it('defaultOpfsBackupFilename uses a timestamped zip name', () => {
    expect(defaultOpfsBackupFilename(new Date('2026-08-08T21:55:03Z'))).toMatch(
      /^masterdater-opfs-\d{8}-\d{6}\.zip$/,
    );
  });

  it('gameBackupFilename prefixes the typed name', () => {
    expect(gameBackupFilename('  date night  ')).toBe('MSTD-GAME-date night.zip');
    expect(gameBackupFilename('a/b:c*d')).toBe('MSTD-GAME-abcd.zip');
    expect(gameSaveStem('abc')).toHaveLength(3);
    expect(gameSaveStem('abcd').length).toBeGreaterThan(3);
  });

  it('copies the live store into a character set and skips earlier sets', async () => {
    const source = createInMemoryFileStorage();
    setFileStorageForTests(source);
    await source.write('/masterdater/config.json', '{"schemaVersion":1}');
    await source.write(
      '/masterdater/characterSets/old-set/masterdater/config.json',
      '{"schemaVersion":1,"nested":true}',
    );

    const { fileCount } = await copyOpfsStoreSnapshot(source, '/masterdater/characterSets/new-set');
    expect(fileCount).toBe(1);
    expect(await source.read('/masterdater/characterSets/new-set/masterdater/config.json')).toBe(
      '{"schemaVersion":1}',
    );
    expect(
      await source.exists(
        '/masterdater/characterSets/new-set/masterdater/characterSets/old-set/masterdater/config.json',
      ),
    ).toBe(false);

    await deleteOpfsTree(source, '/masterdater/characterSets/new-set');
    expect(
      await source.exists('/masterdater/characterSets/new-set/masterdater/config.json'),
    ).toBe(false);
    expect(await source.read('/masterdater/config.json')).toBe('{"schemaVersion":1}');
  });

  it('restores a character set snapshot onto the live store', async () => {
    const source = createInMemoryFileStorage();
    setFileStorageForTests(source);
    await source.write('/masterdater/config.json', '{"schemaVersion":1}');
    await copyOpfsStoreSnapshot(source, '/masterdater/characterSets/new-set');
    await source.write('/masterdater/config.json', '{"schemaVersion":2}');
    await source.write(
      '/masterdater/characterSets/old-set/masterdater/config.json',
      '{"keep":true}',
    );

    const { written } = await restoreOpfsStoreSnapshot(
      source,
      '/masterdater/characterSets/new-set',
    );
    expect(written).toBe(1);
    expect(await source.read('/masterdater/config.json')).toBe('{"schemaVersion":1}');
    expect(
      await source.read('/masterdater/characterSets/old-set/masterdater/config.json'),
    ).toBe('{"keep":true}');
  });

  it('replaces live files that are not in the character-set snapshot', async () => {
    const source = createInMemoryFileStorage();
    await source.write('/masterdater/characters/alex.json', '{"name":"Alex"}');
    await source.write(CHAT_PATH, sessionDocument());
    await source.write(LIBRARY_PATH, libraryWithChat());
    await copyOpfsStoreSnapshot(source, '/masterdater/characterSets/new-set', {
      includeChat: false,
    });
    await source.write('/masterdater/characters/later.json', '{"name":"Later"}');

    await restoreOpfsStoreSnapshot(source, '/masterdater/characterSets/new-set');

    expect(await source.read('/masterdater/characters/alex.json')).toBe('{"name":"Alex"}');
    expect(await source.exists('/masterdater/characters/later.json')).toBe(false);
    expect(await source.exists(CHAT_PATH)).toBe(false);
    const library = JSON.parse(await source.read(LIBRARY_PATH)) as {
      items: Array<{ kind: string }>;
    };
    expect(library.items.some((item) => item.kind === 'session')).toBe(false);
    expect(
      await source.exists('/masterdater/characterSets/new-set/masterdater/characters/alex.json'),
    ).toBe(true);
  });

  it('round-trips JSON and binary files through zip export/import', async () => {
    const source = createInMemoryFileStorage();
    setFileStorageForTests(source);

    await source.write('/masterdater/config.json', '{"schemaVersion":1}');
    await source.writeBinary(
      '/masterdater/assets/img/masterDater-img-1.png',
      new Blob([new Uint8Array([1, 2, 3, 4])]),
    );
    await source.write(
      '/masterdater/prompts/session/default.json',
      '{"slug":"default"}',
    );

    const tree = await collectOpfsTree(source);
    expect(tree.map((f) => f.path)).toEqual([
      '/masterdater/assets/img/masterDater-img-1.png',
      '/masterdater/config.json',
      '/masterdater/prompts/session/default.json',
    ]);

    const { blob, fileCount } = await exportOpfsZipBlob(source);
    expect(fileCount).toBe(3);

    const zipBytes = new Uint8Array(await blob.arrayBuffer());
    const entries = unzipSync(zipBytes);
    expect(Object.keys(entries).sort()).toEqual([
      'masterdater/assets/img/masterDater-img-1.png',
      'masterdater/config.json',
      'masterdater/prompts/session/default.json',
    ]);

    const target = createInMemoryFileStorage();
    const { written, skipped } = await importOpfsZip(target, zipBytes);
    expect(written).toBe(3);
    expect(skipped).toBe(0);
    expect(await target.read('/masterdater/config.json')).toBe('{"schemaVersion":1}');
    expect(await target.read('/masterdater/prompts/session/default.json')).toBe(
      '{"slug":"default"}',
    );
    const png = new Uint8Array(
      await (
        await target.readBinary('/masterdater/assets/img/masterDater-img-1.png')
      ).arrayBuffer(),
    );
    expect([...png]).toEqual([1, 2, 3, 4]);
  });

  it('imports legacy matchdate zips into masterdater paths', async () => {
    const storage = createInMemoryFileStorage();
    const archive = zipSync({
      'matchdate/config.json': new TextEncoder().encode('{"ok":true}'),
      'matchdate/library.json': new TextEncoder().encode(
        '{"items":[{"path":"/matchdate/characters/matchDate-char-1.json"}]}',
      ),
    });
    const { written } = await importOpfsZip(storage, archive);
    expect(written).toBe(2);
    expect(await storage.read('/masterdater/config.json')).toBe('{"ok":true}');
    expect(await storage.read('/masterdater/library.json')).toContain(
      '/masterdater/characters/masterDater-char-1.json',
    );
  });

  it('skips unsafe zip entries outside brand roots', async () => {
    const storage = createInMemoryFileStorage();
    const archive = zipSync({
      'masterdater/ok.json': new TextEncoder().encode('{"ok":true}'),
      'evil/outside.json': new TextEncoder().encode('nope'),
      'masterdater/../escape.json': new TextEncoder().encode('nope'),
    });

    const { written, skipped } = await importOpfsZip(storage, archive);
    expect(written).toBe(1);
    expect(skipped).toBeGreaterThanOrEqual(1);
    expect(await storage.exists('/masterdater/ok.json')).toBe(true);
    expect(await storage.exists('/evil/outside.json')).toBe(false);
  });

  it('replaces the live store on import instead of keeping extra files', async () => {
    const source = createInMemoryFileStorage();
    await source.write('/masterdater/config.json', '{"schemaVersion":1}');
    await source.write('/masterdater/characters/alex.json', '{"name":"Alex"}');
    const { blob } = await exportOpfsZipBlob(source);

    const target = createInMemoryFileStorage();
    await target.write('/masterdater/characters/later.json', '{"name":"Later"}');
    await target.write(CHAT_PATH, sessionDocument());
    await target.write(
      '/masterdater/characterSets/old/masterdater/config.json',
      '{"keep":true}',
    );

    await importOpfsZip(target, new Uint8Array(await blob.arrayBuffer()));
    expect(await target.read('/masterdater/characters/alex.json')).toBe('{"name":"Alex"}');
    expect(await target.exists('/masterdater/characters/later.json')).toBe(false);
    expect(await target.exists(CHAT_PATH)).toBe(false);
    expect(await target.exists('/masterdater/characterSets/old/masterdater/config.json')).toBe(
      false,
    );
  });

  it('omits chat files and chat metadata when includeChat is false', async () => {
    const source = createInMemoryFileStorage();
    await source.write('/masterdater/config.json', '{"schemaVersion":1}');
    await source.write('/masterdater/characters/alex.json', '{"name":"Alex"}');
    await source.write(CHAT_PATH, sessionDocument());
    await source.write(LIBRARY_PATH, libraryWithChat());
    await source.write(
      '/masterdater/characterSets/old/masterdater/prompts/sessions/masterDater-old.json',
      sessionDocument(),
    );
    await source.write(
      '/masterdater/prompts/session/default.json',
      '{"slug":"default"}',
    );

    const { blob, fileCount } = await exportOpfsZipBlob(source, undefined, { includeChat: false });
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const names = Object.keys(entries).sort();
    expect(names).toEqual([
      'masterdater/characters/alex.json',
      'masterdater/config.json',
      'masterdater/library.json',
      'masterdater/prompts/session/default.json',
    ]);
    expect(fileCount).toBe(4);
    const library = JSON.parse(new TextDecoder().decode(entries['masterdater/library.json'])) as {
      items: Array<{ kind: string }>;
    };
    expect(library.items.map((item) => item.kind)).toEqual(['character']);

    const target = createInMemoryFileStorage();
    await importOpfsZip(target, new Uint8Array(await blob.arrayBuffer()));
    await reconcileLibraryIndex(target);
    expect(await target.exists(CHAT_PATH)).toBe(false);
    const loaded = JSON.parse(await target.read(LIBRARY_PATH)) as { items: Array<{ kind: string }> };
    expect(loaded.items.some((item) => item.kind === 'session')).toBe(false);
    expect(await target.read('/masterdater/characters/alex.json')).toBe('{"name":"Alex"}');
  });

  it('keeps chat files and chat metadata when includeChat is true', async () => {
    const source = createInMemoryFileStorage();
    await source.write('/masterdater/characters/alex.json', '{"name":"Alex"}');
    await source.write(CHAT_PATH, sessionDocument());
    await source.write(LIBRARY_PATH, libraryWithChat());

    const { blob } = await exportOpfsZipBlob(source, undefined, { includeChat: true });
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(entries['masterdater/prompts/sessions/masterDater-chat-1.json']).toBeTruthy();
    const library = JSON.parse(new TextDecoder().decode(entries['masterdater/library.json'])) as {
      items: Array<{ kind: string }>;
    };
    expect(library.items.some((item) => item.kind === 'session')).toBe(true);

    const target = createInMemoryFileStorage();
    await importOpfsZip(target, new Uint8Array(await blob.arrayBuffer()));
    await reconcileLibraryIndex(target);
    expect(await target.read(CHAT_PATH)).toContain('"Night"');
    const loaded = JSON.parse(await target.read(LIBRARY_PATH)) as {
      items: Array<{ kind: string; name: string }>;
    };
    expect(loaded.items.some((item) => item.kind === 'session' && item.name === 'Night')).toBe(true);
  });

  it('leaves chats out of a character-set snapshot when includeChat is false', async () => {
    const source = createInMemoryFileStorage();
    await source.write('/masterdater/characters/alex.json', '{"name":"Alex"}');
    await source.write(CHAT_PATH, sessionDocument());
    await source.write(LIBRARY_PATH, libraryWithChat());

    const root = '/masterdater/characterSets/new-set';
    await copyOpfsStoreSnapshot(source, root, { includeChat: false });
    expect(await source.exists(`${root}/masterdater/characters/alex.json`)).toBe(true);
    expect(await source.exists(`${root}${CHAT_PATH}`)).toBe(false);
    expect(await source.read(CHAT_PATH)).toContain('"Night"');
    const copied = JSON.parse(await source.read(`${root}/masterdater/library.json`)) as {
      items: Array<{ kind: string }>;
    };
    expect(copied.items.some((item) => item.kind === 'session')).toBe(false);
    expect(copied.items.some((item) => item.kind === 'character')).toBe(true);
  });

  it('exports an empty archive when the tree has no files', async () => {
    const storage = createInMemoryFileStorage();
    const { blob, fileCount } = await exportOpfsZipBlob(storage);
    expect(fileCount).toBe(0);
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(entries)).toEqual([]);
  });
});
