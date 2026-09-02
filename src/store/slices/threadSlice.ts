import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_THREAD_ID } from '../../features/chat/constants';
import type { Thread, ThreadId, ThreadMessage } from '../../types/chat';
import { createId, nowIso, truncateTitle } from '../../utils/id';

interface ThreadState {
  threads: Record<ThreadId, Thread>;
  activeThreadId: ThreadId;
}

export type { ThreadState };

function createDefaultThread(): Thread {
  const now = nowIso();
  return {
    id: DEFAULT_THREAD_ID,
    title: 'New chat',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

const initialState: ThreadState = {
  threads: {
    [DEFAULT_THREAD_ID]: createDefaultThread(),
  },
  activeThreadId: DEFAULT_THREAD_ID,
};

interface AppendMessagePayload {
  threadId: ThreadId;
  message: ThreadMessage;
}

interface UpdateMessagePayload {
  threadId: ThreadId;
  messageId: string;
  patch: Partial<Pick<ThreadMessage, 'content' | 'status'>>;
}

const threadSlice = createSlice({
  name: 'thread',
  initialState,
  reducers: {
    selectThread: (state, action: PayloadAction<ThreadId>) => {
      if (state.threads[action.payload]) {
        state.activeThreadId = action.payload;
      }
    },
    appendMessage: (state, action: PayloadAction<AppendMessagePayload>) => {
      const { threadId, message } = action.payload;
      const thread = state.threads[threadId];
      if (!thread) {
        return;
      }
      thread.messages.push(message);
      thread.updatedAt = nowIso();
      if (message.role === 'user' && (!thread.title.trim() || thread.title === 'New chat')) {
        thread.title = truncateTitle(message.content.trim() || 'New chat');
      }
    },
    updateMessage: (state, action: PayloadAction<UpdateMessagePayload>) => {
      const { threadId, messageId, patch } = action.payload;
      const thread = state.threads[threadId];
      if (!thread) {
        return;
      }
      const message = thread.messages.find((m) => m.id === messageId);
      if (!message) {
        return;
      }
      Object.assign(message, patch);
      thread.updatedAt = nowIso();
    },
    clearThread: (state, action: PayloadAction<ThreadId>) => {
      const thread = state.threads[action.payload];
      if (!thread) {
        return;
      }
      thread.messages = [];
      thread.title = 'New chat';
      thread.updatedAt = nowIso();
    },
    startNewChat: (state, action: PayloadAction<ThreadId>) => {
      const id = action.payload;
      const now = nowIso();
      state.threads[id] = {
        id,
        title: 'New chat',
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      state.activeThreadId = id;
    },
    loadThread: (state, action: PayloadAction<Thread>) => {
      const thread = action.payload;
      state.threads[thread.id] = thread;
      state.activeThreadId = thread.id;
    },
    setThreadSystemPromptSlug: (
      state,
      action: PayloadAction<{ threadId: ThreadId; slug: string | null }>,
    ) => {
      const { threadId, slug } = action.payload;
      const thread = state.threads[threadId];
      if (!thread) {
        return;
      }
      const next = slug?.trim();
      if (next) {
        thread.systemPromptSlug = next;
      } else {
        delete thread.systemPromptSlug;
      }
      thread.updatedAt = nowIso();
    },
  },
});

export const {
  selectThread,
  appendMessage,
  updateMessage,
  clearThread,
  startNewChat,
  loadThread,
  setThreadSystemPromptSlug,
} = threadSlice.actions;

export const selectActiveThreadId = (state: { thread: ThreadState }) =>
  state.thread.activeThreadId;

export const selectActiveThread = (state: { thread: ThreadState }): Thread | undefined =>
  state.thread.threads[state.thread.activeThreadId];

export const selectActiveMessages = (state: { thread: ThreadState }): ThreadMessage[] =>
  selectActiveThread(state)?.messages ?? [];

export default threadSlice.reducer;

export { createId, nowIso };
