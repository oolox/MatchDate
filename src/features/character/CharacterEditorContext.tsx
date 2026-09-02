import { createContext, useContext, type ReactNode } from 'react';
import type { useCharacterEditor } from './useCharacterEditor';

export type CharacterEditorApi = ReturnType<typeof useCharacterEditor>;

const CharacterEditorContext = createContext<CharacterEditorApi | null>(null);

export function CharacterEditorProvider({
  value,
  children,
}: {
  value: CharacterEditorApi;
  children: ReactNode;
}) {
  return (
    <CharacterEditorContext.Provider value={value}>{children}</CharacterEditorContext.Provider>
  );
}

export function useCharacterEditorContext(): CharacterEditorApi | null {
  return useContext(CharacterEditorContext);
}
