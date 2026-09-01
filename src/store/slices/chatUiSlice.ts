import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ChatUiState {
  composerDraft: string;
  isPinnedToBottom: boolean;
  isStreaming: boolean;
}

const initialState: ChatUiState = {
  composerDraft: '',
  isPinnedToBottom: true,
  isStreaming: false,
};

const chatUiSlice = createSlice({
  name: 'chatUi',
  initialState,
  reducers: {
    setComposerDraft: (state, action: PayloadAction<string>) => {
      state.composerDraft = action.payload;
    },
    clearComposerDraft: (state) => {
      state.composerDraft = '';
    },
    setPinnedToBottom: (state, action: PayloadAction<boolean>) => {
      state.isPinnedToBottom = action.payload;
    },
    setIsStreaming: (state, action: PayloadAction<boolean>) => {
      state.isStreaming = action.payload;
    },
  },
});

export const { setComposerDraft, clearComposerDraft, setPinnedToBottom, setIsStreaming } =
  chatUiSlice.actions;

export type { ChatUiState };

export const selectComposerDraft = (state: { chatUi: ChatUiState }) =>
  state.chatUi.composerDraft;
export const selectIsPinnedToBottom = (state: { chatUi: ChatUiState }) =>
  state.chatUi.isPinnedToBottom;
export const selectIsStreaming = (state: { chatUi: ChatUiState }) => state.chatUi.isStreaming;

export default chatUiSlice.reducer;
