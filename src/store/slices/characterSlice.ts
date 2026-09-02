import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BasicValue, Character } from '../../types/character';
import { createDefaultCharacter } from '../../types/character';

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
    replaceCharacterEditor: (
      state,
      action: PayloadAction<{ characterId: string | null; character: Character; isDirty?: boolean }>,
    ) => {
      state.characterId = action.payload.characterId;
      state.character = action.payload.character;
      state.isDirty = action.payload.isDirty ?? false;
    },
    markCharacterEditorSaved: (
      state,
      action: PayloadAction<{ characterId: string; character: Character }>,
    ) => {
      state.characterId = action.payload.characterId;
      state.character = action.payload.character;
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
