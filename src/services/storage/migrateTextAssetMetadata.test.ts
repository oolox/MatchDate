import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getFileStorageService, setFileStorageForTests } from './index';
import { inMemoryFileStorage } from './inMemoryFileStorage';
import { loadAssetDocument } from './assetPersistence';
import { listLibraryItems, reconcileLibraryIndex } from './libraryIndex';
import { migrateTextAssetMetadata } from './migrateTextAssetMetadata';
import { textMetaPath, textPath } from './paths';

describe('migrateTextAssetMetadata', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('migrates legacy text sidecars to metadata catalog rows', async () => {
    const id = 'legacy-text-1';
    const storage = getFileStorageService();
    await storage.writeBinary(textPath(id), new Blob(['legacy content']));
    await storage.write(
      textMetaPath(id),
      JSON.stringify({
        id,
        originalName: 'legacy.md',
        mimeType: 'text/markdown',
        createdAt: '2026-01-15T00:00:00.000Z',
      }),
    );

    await migrateTextAssetMetadata();
    await reconcileLibraryIndex(storage);

    expect(await storage.exists(textMetaPath(id))).toBe(false);
    const doc = await loadAssetDocument(storage, id);
    expect(doc.subtype).toBe('text');
    expect(doc.name).toBe('legacy.md');
    expect(doc.mimeType).toBe('text/markdown');

    const items = await listLibraryItems(storage, 'asset');
    expect(items.some((item) => item.id === id && item.subtype === 'text')).toBe(true);
  });
});
