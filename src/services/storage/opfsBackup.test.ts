import { describe, expect, it, beforeEach } from 'vitest';
import { unzipSync, zipSync } from 'fflate';
import { createInMemoryFileStorage } from './inMemoryFileStorage';
import { setFileStorageForTests } from './index';
import {
  collectOpfsTree,
  defaultOpfsBackupFilename,
  exportOpfsZipBlob,
  importOpfsZip,
  zipEntryToStoragePath,
} from './opfsBackup';

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

  it('exports an empty archive when the tree has no files', async () => {
    const storage = createInMemoryFileStorage();
    const { blob, fileCount } = await exportOpfsZipBlob(storage);
    expect(fileCount).toBe(0);
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(entries)).toEqual([]);
  });
});
