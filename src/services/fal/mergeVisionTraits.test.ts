import { describe, expect, it } from 'vitest';
import { mergeVisionTraits } from './mergeVisionTraits';
import type { VisionImageTraitExtraction } from './visionTraitExtract';

function extraction(
  imageId: string,
  traits: VisionImageTraitExtraction['traits'],
): VisionImageTraitExtraction {
  return { imageId, rawOutput: '{}', traits };
}

describe('mergeVisionTraits', () => {
  it('keeps traits agreed by multiple images', () => {
    const merged = mergeVisionTraits([
      extraction('1', [
        { name: 'eye color', value: 'green', tags: ['Physical'], confidence: 0.9 },
        { name: 'wardrobe', value: 'red dress', tags: ['Style'], confidence: 0.8 },
      ]),
      extraction('2', [
        { name: 'eye color', value: 'green', tags: ['Physical'], confidence: 0.7 },
        { name: 'wardrobe', value: 'blue jacket', tags: ['Style'], confidence: 0.8 },
      ]),
      extraction('3', [
        { name: 'eye color', value: 'green', tags: ['Physical'], confidence: 0.8 },
      ]),
    ]);

    expect(merged.map((trait) => trait.name)).toEqual(['eye color']);
    expect(merged[0]?.value).toBe('green');
    expect(merged[0]?.support).toBe(3);
  });

  it('omits conflicting values with equal support', () => {
    const merged = mergeVisionTraits([
      extraction('1', [
        { name: 'eye color', value: 'green', tags: ['Physical'], confidence: 0.9 },
      ]),
      extraction('2', [
        { name: 'eye color', value: 'blue', tags: ['Physical'], confidence: 0.9 },
      ]),
    ]);
    expect(merged).toEqual([]);
  });

  it('allows single-image traits above confidence', () => {
    const merged = mergeVisionTraits([
      extraction('1', [
        { name: 'hair color', value: 'black', tags: ['Physical'], confidence: 0.8 },
      ]),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.name).toBe('hair color');
  });
});
