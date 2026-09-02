import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deleteAsset, listAssets } from './persistenceService';
import { getFileStorageService, setFileStorageForTests } from './index';
import { inMemoryFileStorage } from './inMemoryFileStorage';
import { saveImage } from './imageStorage';
import { saveVideo } from './videoStorage';
import { saveText } from './textStorage';

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

  it('deleteAsset removes blobs and catalog rows', async () => {
    const image = await saveImage(new Blob(['png']), { name: 'temp.png' });
    await deleteAsset(image.id);
    const items = await listAssets();
    expect(items.some((item) => item.id === image.id)).toBe(false);
  });
});
