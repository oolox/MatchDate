import { describe, expect, it } from 'vitest';
import { reorderImagesBeforeTarget } from './characterImageReorder';

describe('reorderImagesBeforeTarget', () => {
  const images = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

  it('moves an earlier image before a later target', () => {
    expect(reorderImagesBeforeTarget(images, 'a', 'c')?.map((image) => image.id)).toEqual([
      'b',
      'a',
      'c',
      'd',
    ]);
  });

  it('moves a later image before an earlier target', () => {
    expect(reorderImagesBeforeTarget(images, 'd', 'b')?.map((image) => image.id)).toEqual([
      'a',
      'd',
      'b',
      'c',
    ]);
  });

  it('returns null when already before target or same id', () => {
    expect(reorderImagesBeforeTarget(images, 'a', 'b')).toBeNull();
    expect(reorderImagesBeforeTarget(images, 'a', 'a')).toBeNull();
  });
});
