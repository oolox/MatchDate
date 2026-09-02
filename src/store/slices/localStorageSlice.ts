import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  getDefaultLibrarySort,
  loadLibrarySortState,
  type LibrarySortPreference,
} from '../../services/localStorage';
import type { LibrarySortListKind } from '../../services/localStorage/keys';

export interface LocalStorageState {
  librarySidebarWidthPx: number | null;
  librarySortSession: LibrarySortPreference;
  librarySortPrompt: LibrarySortPreference;
  librarySortAsset: LibrarySortPreference;
  librarySortAll: LibrarySortPreference;
}

const initialState: LocalStorageState = {
  librarySidebarWidthPx: null,
  librarySortSession: getDefaultLibrarySort('session'),
  librarySortPrompt: getDefaultLibrarySort('prompt'),
  librarySortAsset: getDefaultLibrarySort('asset'),
  librarySortAll: getDefaultLibrarySort('all'),
};

const localStorageSlice = createSlice({
  name: 'localStorage',
  initialState,
  reducers: {
    hydrateLocalStorage: (_state, action: PayloadAction<LocalStorageState>) => action.payload,
    setLibrarySortPreference: (
      state,
      action: PayloadAction<{ kind: LibrarySortListKind; preference: LibrarySortPreference }>,
    ) => {
      const { kind, preference } = action.payload;
      switch (kind) {
        case 'session':
          state.librarySortSession = preference;
          break;
        case 'prompt':
          state.librarySortPrompt = preference;
          break;
        case 'asset':
          state.librarySortAsset = preference;
          break;
        case 'all':
          state.librarySortAll = preference;
          break;
      }
    },
  },
});

export const { hydrateLocalStorage, setLibrarySortPreference } = localStorageSlice.actions;

type LocalStorageRoot = { localStorage: LocalStorageState };

export function selectLibrarySortPreference(
  kind: LibrarySortListKind,
): (state: LocalStorageRoot) => LibrarySortPreference {
  return (state) => {
    switch (kind) {
      case 'session':
        return state.localStorage.librarySortSession;
      case 'prompt':
        return state.localStorage.librarySortPrompt;
      case 'asset':
        return state.localStorage.librarySortAsset;
      case 'all':
        return state.localStorage.librarySortAll;
    }
  };
}

export function loadLocalStorageSliceState(): LocalStorageState {
  const sorts = loadLibrarySortState();
  return {
    librarySidebarWidthPx: null,
    librarySortSession: sorts.session,
    librarySortPrompt: sorts.prompt,
    librarySortAsset: sorts.asset,
    librarySortAll: sorts.all,
  };
}

export default localStorageSlice.reducer;
