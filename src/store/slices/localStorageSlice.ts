import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_CHAT_MODEL_ID } from '../../services/fal/models/chat';
import {
  getDefaultLibrarySort,
  loadLibrarySortState,
  readPrepromptAssetId,
  readTxtModel,
  type LibrarySortPreference,
} from '../../services/localStorage';
import type { LibrarySortListKind } from '../../services/localStorage/keys';

export interface LocalStorageState {
  txtModel: string;
  /** `null` unset, `none` explicit none, else text asset id. */
  prepromptAssetId: string | null;
  librarySidebarWidthPx: number | null;
  librarySortSession: LibrarySortPreference;
  librarySortPrompt: LibrarySortPreference;
  librarySortCharacter: LibrarySortPreference;
  librarySortAsset: LibrarySortPreference;
  librarySortAll: LibrarySortPreference;
}

const initialState: LocalStorageState = {
  txtModel: DEFAULT_CHAT_MODEL_ID,
  prepromptAssetId: null,
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
    setPrepromptAssetId: (state, action: PayloadAction<string | null>) => {
      state.prepromptAssetId = action.payload;
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

export const {
  hydrateLocalStorage,
  setTxtModel,
  setPrepromptAssetId,
  setLibrarySortPreference,
} = localStorageSlice.actions;

export const setChatModel = setTxtModel;

type LocalStorageRoot = { localStorage: LocalStorageState };

export const selectTxtModel = (state: LocalStorageRoot) => state.localStorage.txtModel;

export const selectChatModel = selectTxtModel;

export const selectPrepromptAssetId = (state: LocalStorageRoot) =>
  state.localStorage.prepromptAssetId;

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
    prepromptAssetId: readPrepromptAssetId(),
    librarySidebarWidthPx: null,
    librarySortSession: sorts.session,
    librarySortPrompt: sorts.prompt,
    librarySortCharacter: sorts.character,
    librarySortAsset: sorts.asset,
    librarySortAll: sorts.all,
  };
}

export default localStorageSlice.reducer;
