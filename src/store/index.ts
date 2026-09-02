import { configureStore } from '@reduxjs/toolkit';
import chatUiReducer from './slices/chatUiSlice';
import appShellReducer from './slices/appShellSlice';
import promptsReducer from './slices/promptsSlice';
import sessionsReducer from './slices/sessionsSlice';
import threadReducer from './slices/threadSlice';

export const store = configureStore({
  reducer: {
    thread: threadReducer,
    chatUi: chatUiReducer,
    sessions: sessionsReducer,
    prompts: promptsReducer,
    appShell: appShellReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
