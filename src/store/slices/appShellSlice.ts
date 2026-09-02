import { createSlice } from '@reduxjs/toolkit';

interface AppShellState {
  /** Bumped after library mutations so LibraryBrowser reloads. */
  libraryEpoch: number;
}

const initialState: AppShellState = {
  libraryEpoch: 0,
};

const appShellSlice = createSlice({
  name: 'appShell',
  initialState,
  reducers: {
    bumpLibraryEpoch: (state) => {
      state.libraryEpoch += 1;
    },
  },
});

export const { bumpLibraryEpoch } = appShellSlice.actions;

export const selectLibraryEpoch = (state: { appShell: AppShellState }) =>
  state.appShell.libraryEpoch;

export default appShellSlice.reducer;
