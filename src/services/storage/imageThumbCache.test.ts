import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadAssetThumb,
  loadCharacterThumb,
  peekAssetThumb,
  peekCharacterThumb,
  resetImageThumbCache,
} from './imageThumbCache';

describe('imageThumbCache', () => {
  afterEach(() => {
    resetImageThumbCache();
    vi.restoreAllMocks();
  });

  it('loads a character portrait once and reuses it when the image id is unchanged', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:portrait');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const loadCharacterDoc = vi.fn().mockResolvedValue({
      images: [{ id: 'img-1', metadata: { width: 100, height: 200 } }],
    });
    const loadImageBlob = vi.fn().mockResolvedValue(new Blob(['a']));

    const first = await loadCharacterThumb('char-1', 0, loadCharacterDoc, loadImageBlob);
    const second = await loadCharacterThumb('char-1', 1, loadCharacterDoc, loadImageBlob);

    expect(first?.url).toBe('blob:portrait');
    expect(second?.url).toBe('blob:portrait');
    expect(loadImageBlob).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(peekCharacterThumb('char-1')?.epoch).toBe(1);
  });

  it('shares one in-flight character load', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:shared');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    let resolveDoc: (value: { images: Array<{ id: string }> }) => void = () => undefined;
    const loadCharacterDoc = vi.fn(
      () =>
        new Promise<{ images: Array<{ id: string }> }>((resolve) => {
          resolveDoc = resolve;
        }),
    );
    const loadImageBlob = vi.fn().mockResolvedValue(new Blob(['a']));

    const first = loadCharacterThumb('char-1', 0, loadCharacterDoc, loadImageBlob);
    const second = loadCharacterThumb('char-1', 0, loadCharacterDoc, loadImageBlob);
    resolveDoc({ images: [{ id: 'img-1' }] });

    const [a, b] = await Promise.all([first, second]);
    expect(a?.url).toBe('blob:shared');
    expect(b?.url).toBe(a?.url);
    expect(loadCharacterDoc).toHaveBeenCalledTimes(1);
    expect(loadImageBlob).toHaveBeenCalledTimes(1);
  });

  it('loads an asset thumb once', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:asset');
    const loadImageBlob = vi.fn().mockResolvedValue(new Blob(['a']));

    const first = await loadAssetThumb('asset-1', loadImageBlob);
    const second = await loadAssetThumb('asset-1', loadImageBlob);

    expect(first).toBe('blob:asset');
    expect(second).toBe('blob:asset');
    expect(peekAssetThumb('asset-1')).toBe('blob:asset');
    expect(loadImageBlob).toHaveBeenCalledTimes(1);
  });
});
