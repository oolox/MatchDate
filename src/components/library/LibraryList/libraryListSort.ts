import type { LibraryItemMeta } from '../../../services/storage/types';
import {
  getDefaultLibrarySort,
  librarySortStorageKey,
  readLibrarySortPreference,
  writeLibrarySortPreference,
  type LibrarySortDirection,
  type LibrarySortField,
  type LibrarySortPreference,
} from '../../../services/localStorage';

export type { LibrarySortField, LibrarySortDirection, LibrarySortPreference };
export {
  getDefaultLibrarySort,
  librarySortStorageKey as storageKeyForLibrarySort,
  readLibrarySortPreference,
  writeLibrarySortPreference,
};

function compareName(a: LibraryItemMeta, b: LibraryItemMeta): number {
  return a.name.localeCompare(b.name);
}

function compareIso(a: string, b: string): number {
  return a.localeCompare(b);
}

function applyDirection(result: number, direction: LibrarySortDirection): number {
  return direction === 'asc' ? result : -result;
}

function compareStarred(
  a: LibraryItemMeta,
  b: LibraryItemMeta,
  direction: LibrarySortDirection,
): number {
  if (a.isFavorite !== b.isFavorite) {
    const favoriteFirst = a.isFavorite ? -1 : 1;
    return direction === 'asc' ? favoriteFirst : -favoriteFirst;
  }

  if (a.isFavorite && b.isFavorite) {
    const aAt = a.favoritedAt ?? '';
    const bAt = b.favoritedAt ?? '';
    const byFavoriteTime = compareIso(bAt, aAt);
    if (byFavoriteTime !== 0) {
      return direction === 'asc' ? -byFavoriteTime : byFavoriteTime;
    }
  }

  return applyDirection(compareName(a, b), direction);
}

export function sortLibraryItems(
  items: LibraryItemMeta[],
  field: LibrarySortField,
  direction: LibrarySortDirection,
): LibraryItemMeta[] {
  const copy = [...items];

  copy.sort((a, b) => {
    switch (field) {
      case 'name':
        return applyDirection(compareName(a, b), direction);
      case 'updatedAt':
        return applyDirection(compareIso(a.updatedAt, b.updatedAt), direction);
      case 'createdAt':
        return applyDirection(compareIso(a.createdAt, b.createdAt), direction);
      case 'starred':
        return compareStarred(a, b, direction);
      default:
        return 0;
    }
  });

  return copy;
}

export const LIBRARY_SORT_FIELD_OPTIONS: Array<{ value: LibrarySortField; label: string }> = [
  { value: 'name', label: 'NAME' },
  { value: 'starred', label: 'STAR' },
  { value: 'createdAt', label: 'CREATE' },
  { value: 'updatedAt', label: 'UPDATE' },
];
