import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getFileStorageService, setFileStorageForTests } from './index';
import { inMemoryFileStorage } from './inMemoryFileStorage';
import { loadImage, saveImage, updateImage } from './imageStorage';
import { listAssets } from './persistenceService';
import { tryLoadAssetDocument } from './assetPersistence';

describe('imageStorage', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('saves an image into the catalog', async () => {
    const saved = await saveImage(new Blob(['png-bytes'], { type: 'image/png' }), {
      name: 'portrait.png',
    });
    expect(saved.id).toBeTruthy();
    expect(saved.metadata?.originalName).toBe('portrait.png');

    const blob = await loadImage(saved.id);
    expect(await blob.text()).toBe('png-bytes');

    const items = await listAssets();
    expect(items.some((item) => item.id === saved.id && item.subtype === 'image')).toBe(true);
  });

  it('updates an existing image blob and name', async () => {
    const saved = await saveImage(new Blob(['v1'], { type: 'image/png' }), { name: 'a.png' });
    const updated = await updateImage(saved.id, new Blob(['v2'], { type: 'image/png' }), {
      name: 'b.png',
    });
    expect(updated.id).toBe(saved.id);
    expect(await (await loadImage(saved.id)).text()).toBe('v2');

    const doc = await tryLoadAssetDocument(getFileStorageService(), saved.id);
    expect(doc?.name).toBe('b.png');
  });
});
