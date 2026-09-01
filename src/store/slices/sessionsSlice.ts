import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { LibraryItemMeta } from '../../services/storage/types';
import type { ThreadId } from '../../types/chat';
import { selectActiveThread, type ThreadState } from './threadSlice';

export interface SessionsState {
  sessionCatalog: LibraryItemMeta[];
  savedUpdatedAt: Record<ThreadId, string>;
  selectedSessionId: string | null;
  storageReady: boolean;
}

type SessionsRootState = {
  sessions: SessionsState;
  thread: ThreadState;
};

const initialState: SessionsState = {
  sessionCatalog: [],
  savedUpdatedAt: {},
  selectedSessionId: null,
  storageReady: false,
};

const sessionsSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    setSelectedSessionId: (state, action: PayloadAction<string | null>) => {
      state.selectedSessionId = action.payload;
    },
    markSessionSaved: (
      state,
      action: PayloadAction<{ id: ThreadId; updatedAt: string }>,
    ) => {
      state.savedUpdatedAt[action.payload.id] = action.payload.updatedAt;
    },
    hydrateSessions: (_state, action: PayloadAction<SessionsState>) => {
      return action.payload;
    },
  },
});

export const { setSelectedSessionId, markSessionSaved, hydrateSessions } = sessionsSlice.actions;

export const selectSelectedSessionId = (state: { sessions: SessionsState }) =>
  state.sessions.selectedSessionId;
export const selectSessionsStorageReady = (state: { sessions: SessionsState }) =>
  state.sessions.storageReady;

export const selectIsThreadDirty = (
  state: SessionsRootState,
  threadId: ThreadId,
): boolean => {
  const thread = state.thread.threads[threadId];
  if (!thread || thread.messages.length === 0) {
    return false;
  }

  const savedAt = state.sessions.savedUpdatedAt[threadId];
  if (!savedAt) {
    return true;
  }

  return thread.updatedAt > savedAt;
};

export const selectIsActiveThreadDirty = (state: SessionsRootState): boolean => {
  const thread = selectActiveThread(state);
  if (!thread) {
    return false;
  }

  return selectIsThreadDirty(state, thread.id);
};

export default sessionsSlice.reducer;
