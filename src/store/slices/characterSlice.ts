import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BasicValue, Character } from '../../types/character';
import { createDefaultCharacter } from '../../types/character';
import type { SavedImageRef } from '../../types/savedImage';
import { normalizeSavedImageRefs } from '../../types/savedImage';

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
  removeCharacterEditorTrait,
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
