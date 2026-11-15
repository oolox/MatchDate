import { describe, expect, it, beforeEach } from 'vitest';
import { createInMemoryFileStorage } from './inMemoryFileStorage';
import { setFileStorageForTests } from './index';
import {
  migrateBrandLocalStorage,
  migrateBrandStorage,
} from './migrateBrandStorage';

describe('migrateBrandStorage', () => {
  beforeEach(() => {
    setFileStorageForTests(createInMemoryFileStorage());
  });

  it('copies legacy localStorage keys without wiping them', () => {
    const store = new Map<string, string>();
    const fake: Pick<Storage, 'getItem' | 'setItem'> = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => {
        store.set(key, value);
      },
    };
    store.set('matchdate.txtModel', 'deepseek/deepseek-v4-flash');
    migrateBrandLocalStorage(fake);
    expect(store.get('masterdater.txtModel')).toBe('deepseek/deepseek-v4-flash');
    expect(store.get('matchdate.txtModel')).toBe('deepseek/deepseek-v4-flash');
  });

  it('moves /matchdate tree to /masterdater and rewrites brand prefixes', async () => {
    const storage = createInMemoryFileStorage();
    setFileStorageForTests(storage);
    await storage.write(
      '/matchdate/library.json',
      JSON.stringify({
        items: [
          {
            path: '/matchdate/characters/matchDate-char-abc.json',
            fileName: 'matchDate-char-abc.json',
          },
        ],
      }),
    );
    await storage.write(
      '/matchdate/characters/matchDate-char-abc.json',
      JSON.stringify({ id: 'abc', name: 'Alex' }),
    );
    await storage.writeBinary(
      '/matchdate/assets/img/matchDate-img-1.png',
      new Blob([new Uint8Array([9, 8, 7])]),
    );

    await migrateBrandStorage(storage);

    expect(await storage.exists('/matchdate/library.json')).toBe(false);
    expect(await storage.exists('/masterdater/library.json')).toBe(true);
    expect(await storage.exists('/masterdater/characters/masterDater-char-abc.json')).toBe(
      true,
    );
    expect(await storage.exists('/masterdater/assets/img/masterDater-img-1.png')).toBe(true);
    const library = await storage.read('/masterdater/library.json');
    expect(library).toContain('/masterdater/characters/masterDater-char-abc.json');
    expect(library).not.toContain('matchDate-');
  });
});
