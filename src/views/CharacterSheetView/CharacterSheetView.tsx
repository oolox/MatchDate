import { useParams } from 'react-router-dom';
import { CharacterEditor } from '../../features/character/CharacterEditor';
import { CharacterEditorProvider } from '../../features/character/CharacterEditorContext';
import { useCharacterEditor } from '../../features/character/useCharacterEditor';
import { SessionWorkspaceLayout } from '../../features/session/SessionWorkspaceLayout';
import { useAppSelector } from '../../store/hooks';
import { selectStorageReady } from '../../store/slices/promptsSlice';

export function CharacterSheetView() {
  const { characterId } = useParams<{ characterId?: string }>();
  const storageReady = useAppSelector(selectStorageReady);
  const editor = useCharacterEditor(characterId?.trim() || null);

  return (
    <CharacterEditorProvider value={editor}>
      <SessionWorkspaceLayout
        routePrefix="character"
        persistence={{ ready: storageReady, persistAfterTurn: async () => {} }}
        left={<CharacterEditor editor={editor} />}
      />
    </CharacterEditorProvider>
  );
}
