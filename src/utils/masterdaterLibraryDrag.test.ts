import { describe, expect, it } from 'vitest';
import {
  MASTERDATER_LIBRARY_MIME,
  MATCHDATE_LIBRARY_MIME_LEGACY,
  readMasterDaterLibraryDragPayload,
  setMasterDaterLibraryDragData,
} from './masterdaterLibraryDrag';

function mockDataTransfer() {
  const store: Record<string, string> = {};
  return {
    store,
    effectAllowed: 'none' as string,
    setData(type: string, value: string) {
      store[type] = value;
    },
    getData(type: string) {
      return store[type] ?? '';
    },
    types: [] as string[],
  };
}

describe('masterdaterLibraryDrag', () => {
  it('writes and reads MasterDater MIME payload', () => {
    const dt = mockDataTransfer();
    setMasterDaterLibraryDragData(dt as unknown as DataTransfer, {
      kind: 'character',
      id: 'char-1',
    });
    expect(dt.store[MASTERDATER_LIBRARY_MIME]).toContain('"kind":"character"');
    dt.types = [MASTERDATER_LIBRARY_MIME];
    const read = readMasterDaterLibraryDragPayload({
      getData: (type: string) => dt.store[type] ?? '',
      types: [MASTERDATER_LIBRARY_MIME],
    } as unknown as DataTransfer);
    expect(read).toEqual({ kind: 'character', id: 'char-1', subtype: undefined });
  });

  it('reads legacy MatchDate MIME payload', () => {
    const body = JSON.stringify({ kind: 'character', id: 'legacy-1' });
    const read = readMasterDaterLibraryDragPayload({
      getData: (type: string) =>
        type === MATCHDATE_LIBRARY_MIME_LEGACY ? body : '',
      types: [MATCHDATE_LIBRARY_MIME_LEGACY],
    } as unknown as DataTransfer);
    expect(read).toEqual({ kind: 'character', id: 'legacy-1', subtype: undefined });
  });
});
