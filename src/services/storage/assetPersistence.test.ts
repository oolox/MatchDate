import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getFileStorageService, setFileStorageForTests } from './index';
import { inMemoryFileStorage } from './inMemoryFileStorage';
import {
  deleteAssetDocument,
  ensureTextAsset,
  loadAssetDocument,
  saveAssetDocument,
} from './assetPersistence';
import { assetDocumentFromTextRef } from './assetDocument';
import { listLibraryItems, reconcileLibraryIndex } from './libraryIndex';
import { assetPath, textPath } from './paths';
import { saveText } from './textStorage';

describe('assetPersistence', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('registers text assets in library.json via saveText', async () => {
    const blob = new Blob(['Asset body'], { type: 'text/plain' });
    const saved = await saveText(blob, 'notes.txt');

    await reconcileLibraryIndex(getFileStorageService());
    const items = await listLibraryItems(getFileStorageService(), 'asset');
    const row = items.find((item) => item.id === saved.id);
    expect(row).toBeDefined();
    expect(row?.kind).toBe('asset');
    expect(row?.subtype).toBe('text');
    expect(row?.name).toBe('notes.txt');

    const doc = await loadAssetDocument(getFileStorageService(), saved.id);
    expect(doc.subtype).toBe('text');
    expect(doc.blobPath).toBe(textPath(saved.id));
  });

  it('deletes asset metadata and catalog row', async () => {
    const ref = {
      id: 'text-1',
      fileName: 'matchDate-text-text-1.txt',
      path: textPath('text-1'),
      createdAt: '2026-01-01T00:00:00.000Z',
      mimeType: 'text/plain' as const,
      metadata: { originalName: 'draft.txt' },
    };
    const storage = getFileStorageService();
    await storage.writeBinary(textPath('text-1'), new Blob(['hi']));
    await saveAssetDocument(storage, assetDocumentFromTextRef(ref));

    await deleteAssetDocument(storage, 'text-1');
    expect(await storage.exists(assetPath('text-1'))).toBe(false);
    const items = await listLibraryItems(storage, 'asset');
    expect(items.some((item) => item.id === 'text-1')).toBe(false);
  });

  it('ensureTextAsset is idempotent', async () => {
    const ref = {
      id: 'text-2',
      fileName: 'matchDate-text-text-2.txt',
      path: textPath('text-2'),
      createdAt: '2026-01-01T00:00:00.000Z',
      mimeType: 'text/plain' as const,
      metadata: { originalName: 'once.txt' },
    };
    const storage = getFileStorageService();
    await storage.writeBinary(textPath('text-2'), new Blob(['once']));
    const first = await ensureTextAsset(storage, ref);
    const second = await ensureTextAsset(storage, ref);
    expect(second.id).toBe(first.id);
    const items = await listLibraryItems(storage, 'asset');
    expect(items.filter((item) => item.id === 'text-2')).toHaveLength(1);
  });
});
