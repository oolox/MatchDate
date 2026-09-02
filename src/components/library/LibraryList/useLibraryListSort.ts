import { useCallback, useMemo } from 'react';
import type { LibraryItemMeta } from '../../../services/storage/types';
import type { LibrarySortListKind } from '../../../services/localStorage/keys';
import { writeLibrarySortPreference } from '../../../services/localStorage';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  selectLibrarySortPreference,
  setLibrarySortPreference,
} from '../../../store/slices/localStorageSlice';
import {
  sortLibraryItems,
  type LibrarySortField,
} from './libraryListSort';

export function useLibraryListSort(kind: LibrarySortListKind) {
  const dispatch = useAppDispatch();
  const preference = useAppSelector(selectLibrarySortPreference(kind));

  const setField = useCallback(
    (field: LibrarySortField) => {
      const next = writeLibrarySortPreference(kind, { ...preference, field });
      dispatch(setLibrarySortPreference({ kind, preference: next }));
    },
    [dispatch, kind, preference],
  );

  const toggleDirection = useCallback(() => {
    const next = writeLibrarySortPreference(kind, {
      ...preference,
      direction: preference.direction === 'asc' ? 'desc' : 'asc',
    });
    dispatch(setLibrarySortPreference({ kind, preference: next }));
  }, [dispatch, kind, preference]);

  const sortedItems = useCallback(
    (items: LibraryItemMeta[]) =>
      sortLibraryItems(items, preference.field, preference.direction),
    [preference.direction, preference.field],
  );

  return useMemo(
    () => ({
      field: preference.field,
      direction: preference.direction,
      setField,
      toggleDirection,
      sortedItems,
    }),
    [preference.direction, preference.field, setField, sortedItems, toggleDirection],
  );
}
