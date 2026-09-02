import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_CHAT_MODEL_ID } from '../../services/fal/models/chat';
import {
  getDefaultLibrarySort,
  loadLibrarySortState,
  readTxtModel,
  type LibrarySortPreference,
} from '../../services/localStorage';
import type { LibrarySortListKind } from '../../services/localStorage/keys';

export interface LocalStorageState {
  txtModel: string;
  librarySidebarWidthPx: number | null;
  librarySortSession: LibrarySortPreference;
  librarySortPrompt: LibrarySortPreference;
  librarySortCharacter: LibrarySortPreference;
  librarySortAsset: LibrarySortPreference;
  librarySortAll: LibrarySortPreference;
}

const initialState: LocalStorageState = {
  txtModel: DEFAULT_CHAT_MODEL_ID,
  librarySidebarWidthPx: null,
  librarySortSession: getDefaultLibrarySort('session'),
  librarySortPrompt: getDefaultLibrarySort('prompt'),
  librarySortCharacter: getDefaultLibrarySort('character'),
  librarySortAsset: getDefaultLibrarySort('asset'),
  librarySortAll: getDefaultLibrarySort('all'),
};

const localStorageSlice = createSlice({
  name: 'localStorage',
  initialState,
  reducers: {
    hydrateLocalStorage: (_state, action: PayloadAction<LocalStorageState>) => action.payload,
    setTxtModel: (state, action: PayloadAction<string>) => {
      state.txtModel = action.payload;
    },
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
        case 'character':
          state.librarySortCharacter = preference;
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

export const { hydrateLocalStorage, setTxtModel, setLibrarySortPreference } =
  localStorageSlice.actions;

export const setChatModel = setTxtModel;

type LocalStorageRoot = { localStorage: LocalStorageState };

export const selectTxtModel = (state: LocalStorageRoot) => state.localStorage.txtModel;

export const selectChatModel = selectTxtModel;

export function selectLibrarySortPreference(
  kind: LibrarySortListKind,
): (state: LocalStorageRoot) => LibrarySortPreference {
  return (state) => {
    switch (kind) {
      case 'session':
        return state.localStorage.librarySortSession;
      case 'prompt':
        return state.localStorage.librarySortPrompt;
      case 'character':
        return state.localStorage.librarySortCharacter;
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
    txtModel: readTxtModel(),
    librarySidebarWidthPx: null,
    librarySortSession: sorts.session,
    librarySortPrompt: sorts.prompt,
    librarySortCharacter: sorts.character,
    librarySortAsset: sorts.asset,
    librarySortAll: sorts.all,
  };
}

export default localStorageSlice.reducer;
