import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  BasicValue,
  Character,
  CharacterHistoryEntry,
  CharacterTrait,
} from '../../types/character';
import { createDefaultCharacter } from '../../types/character';
import type { SavedImageRef } from '../../types/savedImage';
import { normalizeSavedImageRefs } from '../../types/savedImage';

/** Session id stamped on sheet UI adds (traits / history). */
export const USER_EDITOR_SESSION_ID = 'user';
/** @deprecated Prefer {@link USER_EDITOR_SESSION_ID}. */
export const USER_TRAIT_SESSION_ID = USER_EDITOR_SESSION_ID;

export interface CharacterEditorState {
  characterId: string | null;
  character: Character;
  isDirty: boolean;
}

function createInitialState(): CharacterEditorState {
  return {
    characterId: null,
    character: createDefaultCharacter(),
    isDirty: false,
  };
}

const initialState = createInitialState();

const characterSlice = createSlice({
  name: 'character',
  initialState,
  reducers: {
    resetCharacterEditor: () => createInitialState(),
    setCharacterEditorId: (state, action: PayloadAction<string | null>) => {
      state.characterId = action.payload;
    },
    setCharacterEditorCharacter: (state, action: PayloadAction<Character>) => {
      state.character = action.payload;
    },
    setCharacterEditorName: (state, action: PayloadAction<string>) => {
      state.character.name = action.payload;
      state.isDirty = true;
    },
    setCharacterEditorAttributeValue: (
      state,
      action: PayloadAction<{ name: BasicValue; value: number }>,
    ) => {
      const attribute = state.character.attributes.find(
        (entry) => entry.name === action.payload.name,
      );
      if (attribute) {
        attribute.value = action.payload.value;
        state.isDirty = true;
      }
    },
    removeCharacterEditorHistoryEntry: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      if (index < 0 || index >= state.character.history.length) {
        return;
      }
      state.character.history.splice(index, 1);
      state.isDirty = true;
    },
    /** Append a history beat; stamps sessionId `user`. */
    appendCharacterEditorHistoryEntry: (
      state,
      action: PayloadAction<{ at: string; summary: string }>,
    ) => {
      const at = action.payload.at.trim();
      const summary = action.payload.summary.trim();
      if (!at || !summary) {
        return;
      }
      const entry: CharacterHistoryEntry = {
        at,
        summary,
        sessionId: USER_EDITOR_SESSION_ID,
      };
      state.character.history.push(entry);
      state.isDirty = true;
    },
    updateCharacterEditorHistoryEntry: (
      state,
      action: PayloadAction<{ index: number; at: string; summary: string }>,
    ) => {
      const index = action.payload.index;
      if (index < 0 || index >= state.character.history.length) {
        return;
      }
      const at = action.payload.at.trim();
      const summary = action.payload.summary.trim();
      if (!at || !summary) {
        return;
      }
      const previous = state.character.history[index];
      state.character.history[index] = {
        at,
        summary,
        sessionId: previous.sessionId ?? USER_EDITOR_SESSION_ID,
      };
      state.isDirty = true;
    },
    removeCharacterEditorTrait: (state, action: PayloadAction<string>) => {
      const key = action.payload.trim().toLowerCase();
      if (!key) {
        return;
      }
      const next = state.character.traits.filter(
        (trait) => trait.name.trim().toLowerCase() !== key,
      );
      if (next.length === state.character.traits.length) {
        return;
      }
      state.character.traits = next;
      state.isDirty = true;
    },
    /** Upsert trait by name (case-insensitive); stamps sessionId `user`. */
    upsertCharacterEditorTrait: (
      state,
      action: PayloadAction<{ at: string; name: string; value: string }>,
    ) => {
      const name = action.payload.name.trim();
      const value = action.payload.value.trim();
      const at = action.payload.at.trim();
      if (!name || !value || !at) {
        return;
      }
      const nextTrait: CharacterTrait = {
        at,
        name,
        value,
        sessionId: USER_EDITOR_SESSION_ID,
      };
      const key = name.toLowerCase();
      const index = state.character.traits.findIndex(
        (trait) => trait.name.trim().toLowerCase() === key,
      );
      if (index >= 0) {
        state.character.traits[index] = nextTrait;
      } else {
        state.character.traits.push(nextTrait);
      }
      state.isDirty = true;
    },
    /** Update trait by original name (case-insensitive); renames when name changes. */
    updateCharacterEditorTrait: (
      state,
      action: PayloadAction<{
        originalName: string;
        at: string;
        name: string;
        value: string;
      }>,
    ) => {
      const originalKey = action.payload.originalName.trim().toLowerCase();
      const name = action.payload.name.trim();
      const value = action.payload.value.trim();
      const at = action.payload.at.trim();
      if (!originalKey || !name || !value || !at) {
        return;
      }
      const index = state.character.traits.findIndex(
        (trait) => trait.name.trim().toLowerCase() === originalKey,
      );
      if (index < 0) {
        return;
      }
      const previous = state.character.traits[index];
      const nextTrait: CharacterTrait = {
        at,
        name,
        value,
        sessionId: USER_EDITOR_SESSION_ID,
      };
      const newKey = name.toLowerCase();
      if (newKey === originalKey) {
        state.character.traits[index] = {
          ...nextTrait,
          sessionId: previous.sessionId ?? USER_EDITOR_SESSION_ID,
        };
      } else {
        state.character.traits.splice(index, 1);
        const conflictIndex = state.character.traits.findIndex(
          (trait) => trait.name.trim().toLowerCase() === newKey,
        );
        if (conflictIndex >= 0) {
          state.character.traits[conflictIndex] = nextTrait;
        } else {
          state.character.traits.push(nextTrait);
        }
      }
      state.isDirty = true;
    },
    /** Prepend image refs (dedupe by id); marks dirty. */
    prependCharacterEditorImages: (state, action: PayloadAction<SavedImageRef[]>) => {
      const incoming = normalizeSavedImageRefs(action.payload);
      if (incoming.length === 0) {
        return;
      }
      const existingIds = new Set(state.character.images.map((image) => image.id));
      const fresh = incoming.filter((image) => !existingIds.has(image.id));
      if (fresh.length === 0) {
        return;
      }
      state.character.images = [...fresh, ...state.character.images];
      state.isDirty = true;
    },
    /** Unlink image from sheet only (does not delete library asset). */
    removeCharacterEditorImage: (state, action: PayloadAction<string>) => {
      const id = action.payload.trim();
      if (!id) {
        return;
      }
      const next = state.character.images.filter((image) => image.id !== id);
      if (next.length === state.character.images.length) {
        return;
      }
      state.character.images = next;
      state.isDirty = true;
    },
    replaceCharacterEditor: (
      state,
      action: PayloadAction<{ characterId: string | null; character: Character; isDirty?: boolean }>,
    ) => {
      state.characterId = action.payload.characterId;
      state.character = {
        ...action.payload.character,
        images: normalizeSavedImageRefs(action.payload.character.images),
      };
      state.isDirty = action.payload.isDirty ?? false;
    },
    markCharacterEditorSaved: (
      state,
      action: PayloadAction<{ characterId: string; character: Character }>,
    ) => {
      state.characterId = action.payload.characterId;
      state.character = {
        ...action.payload.character,
        images: normalizeSavedImageRefs(action.payload.character.images),
      };
      state.isDirty = false;
    },
    setCharacterEditorDirty: (state, action: PayloadAction<boolean>) => {
      state.isDirty = action.payload;
    },
  },
});

export const {
  resetCharacterEditor,
  setCharacterEditorId,
  setCharacterEditorCharacter,
  setCharacterEditorName,
  setCharacterEditorAttributeValue,
  removeCharacterEditorHistoryEntry,
  appendCharacterEditorHistoryEntry,
  updateCharacterEditorHistoryEntry,
  removeCharacterEditorTrait,
  upsertCharacterEditorTrait,
  updateCharacterEditorTrait,
  prependCharacterEditorImages,
  removeCharacterEditorImage,
  replaceCharacterEditor,
  markCharacterEditorSaved,
  setCharacterEditorDirty,
} = characterSlice.actions;

export const selectCharacterEditorId = (state: { character: CharacterEditorState }) =>
  state.character.characterId;
export const selectCharacterEditorCharacter = (state: { character: CharacterEditorState }) =>
  state.character.character;
export const selectCharacterEditorDirty = (state: { character: CharacterEditorState }) =>
  state.character.isDirty;

export default characterSlice.reducer;
