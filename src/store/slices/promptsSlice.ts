import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_SYSTEM_PROMPT } from '../../features/chat/constants';
import type { LibraryItemMeta } from '../../services/storage/types';

export interface PromptsState {
  systemPrompt: string;
  activeSystemPrompt: string;
  activeSystemPresetSlug: string | null;
  selectedPresetSlug: string | null;
  presetCatalog: LibraryItemMeta[];
  storageReady: boolean;
}

const initialState: PromptsState = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  activeSystemPrompt: DEFAULT_SYSTEM_PROMPT,
  activeSystemPresetSlug: null,
  selectedPresetSlug: null,
  presetCatalog: [],
  storageReady: false,
};

const promptsSlice = createSlice({
  name: 'prompts',
  initialState,
  reducers: {
    setSystemPrompt: (state, action: PayloadAction<string>) => {
      state.systemPrompt = action.payload;
    },
    setSelectedPresetSlug: (state, action: PayloadAction<string | null>) => {
      state.selectedPresetSlug = action.payload;
    },
    setActiveSystemPreset: (
      state,
      action: PayloadAction<{ slug: string; prompt: string }>,
    ) => {
      state.activeSystemPresetSlug = action.payload.slug;
      state.activeSystemPrompt = action.payload.prompt;
    },
    setPresetCatalog: (state, action: PayloadAction<LibraryItemMeta[]>) => {
      state.presetCatalog = action.payload;
    },
    hydratePrompts: (_state, action: PayloadAction<PromptsState>) => {
      return action.payload;
    },
  },
});

export const {
  setSystemPrompt,
  setSelectedPresetSlug,
  setActiveSystemPreset,
  setPresetCatalog,
  hydratePrompts,
} = promptsSlice.actions;

export const selectSystemPrompt = (state: { prompts: PromptsState }) =>
  state.prompts.systemPrompt;
export const selectActiveSystemPrompt = (state: { prompts: PromptsState }) =>
  state.prompts.activeSystemPrompt;
export const selectActiveSystemPresetSlug = (state: { prompts: PromptsState }) =>
  state.prompts.activeSystemPresetSlug;
export const selectSelectedPresetSlug = (state: { prompts: PromptsState }) =>
  state.prompts.selectedPresetSlug;
export const selectPresetCatalog = (state: { prompts: PromptsState }) =>
  state.prompts.presetCatalog;
export const selectStorageReady = (state: { prompts: PromptsState }) =>
  state.prompts.storageReady;

export default promptsSlice.reducer;
