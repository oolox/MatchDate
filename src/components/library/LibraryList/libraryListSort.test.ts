import { describe, it, expect, beforeEach } from 'vitest';
import { libraryItem } from '../../../services/storage/libraryItem';
import {
  getDefaultLibrarySort,
  readLibrarySortPreference,
  sortLibraryItems,
  writeLibrarySortPreference,
} from './libraryListSort';

describe('libraryListSort', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns kind defaults', () => {
    expect(getDefaultLibrarySort('session')).toEqual({ field: 'updatedAt', direction: 'desc' });
    expect(getDefaultLibrarySort('prompt')).toEqual({ field: 'name', direction: 'asc' });
    expect(getDefaultLibrarySort('asset')).toEqual({ field: 'updatedAt', direction: 'desc' });
  });

  it('sorts by name', () => {
    const items = [
      libraryItem('prompt', '2', 'Zed'),
      libraryItem('prompt', '1', 'Ann'),
    ];
    expect(sortLibraryItems(items, 'name', 'asc').map((item) => item.name)).toEqual(['Ann', 'Zed']);
    expect(sortLibraryItems(items, 'name', 'desc').map((item) => item.name)).toEqual(['Zed', 'Ann']);
  });

  it('sorts by updatedAt and createdAt', () => {
    const items = [
      libraryItem('session', 'old', 'Old', {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
      libraryItem('session', 'new', 'New', {
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      }),
    ];

    expect(sortLibraryItems(items, 'updatedAt', 'desc').map((item) => item.id)).toEqual([
      'new',
      'old',
    ]);
    expect(sortLibraryItems(items, 'createdAt', 'asc').map((item) => item.id)).toEqual([
      'old',
      'new',
    ]);
  });

  it('sorts starred with favorites first for ascending', () => {
    const items = [
      libraryItem('prompt', 'a', 'Alpha', { isFavorite: false }),
      libraryItem('prompt', 'b', 'Beta', {
        isFavorite: true,
        favoritedAt: '2026-01-02T00:00:00.000Z',
      }),
      libraryItem('prompt', 'c', 'Charlie', {
        isFavorite: true,
        favoritedAt: '2026-01-03T00:00:00.000Z',
      }),
    ];

    expect(sortLibraryItems(items, 'starred', 'asc').map((item) => item.id)).toEqual([
      'b',
      'c',
      'a',
    ]);
    expect(sortLibraryItems(items, 'starred', 'desc').map((item) => item.id)).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('persists and reads sort preference per kind', () => {
    expect(readLibrarySortPreference('session')).toEqual({
      field: 'updatedAt',
      direction: 'desc',
    });

    writeLibrarySortPreference('session', { field: 'name', direction: 'asc' });
    expect(readLibrarySortPreference('session')).toEqual({ field: 'name', direction: 'asc' });
    expect(readLibrarySortPreference('prompt')).toEqual({ field: 'name', direction: 'asc' });
  });
});
