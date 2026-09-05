import { describe, expect, it } from 'vitest';
import {
  canDragLibraryItem,
  MATCHDATE_LIBRARY_MIME,
  readMatchDateLibraryDragPayload,
  setMatchDateLibraryDragData,
} from './matchdateLibraryDrag';

function mockDataTransfer(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    store,
    setData(type: string, value: string) {
      store[type] = value;
    },
    getData(type: string) {
      return store[type] ?? '';
    },
    types: [] as string[],
    effectAllowed: 'none' as string,
  };
}

describe('matchdateLibraryDrag', () => {
  it('allows character and text asset rows', () => {
    expect(canDragLibraryItem({ kind: 'character' })).toBe(true);
    expect(canDragLibraryItem({ kind: 'asset', subtype: 'text' })).toBe(true);
    expect(canDragLibraryItem({ kind: 'asset', subtype: 'image' })).toBe(false);
    expect(canDragLibraryItem({ kind: 'session' })).toBe(false);
  });

  it('round-trips library drag payload', () => {
    const dt = mockDataTransfer();
    setMatchDateLibraryDragData(dt as unknown as DataTransfer, {
      kind: 'character',
      id: 'char-1',
    });
    expect(dt.store[MATCHDATE_LIBRARY_MIME]).toContain('"kind":"character"');
    expect(dt.store['text/plain']).toBe('char-1');

    const read = readMatchDateLibraryDragPayload({
      getData: (type: string) => dt.store[type] ?? '',
      types: [MATCHDATE_LIBRARY_MIME],
    } as unknown as DataTransfer);
    expect(read).toEqual({ kind: 'character', id: 'char-1', subtype: undefined });
  });
});
