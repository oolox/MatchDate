import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { inMemoryFileStorage, setFileStorageForTests } from './index';
import { listTextAssets, loadTextContent, saveText } from './textStorage';

describe('textStorage', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('saves and lists text assets', async () => {
    const blob = new Blob(['Hello notes'], { type: 'text/plain' });
    const saved = await saveText(blob, 'notes.txt');

    const items = await listTextAssets();
    expect(items.some((item) => item.id === saved.id && item.name === 'notes.txt')).toBe(true);

    const content = await loadTextContent(saved.id);
    expect(content).toBe('Hello notes');
  });
});
