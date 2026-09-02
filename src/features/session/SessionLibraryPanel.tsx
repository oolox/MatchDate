import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LibraryBrowser } from '../../components/library/LibraryBrowser/LibraryBrowser';
import { useCharacterEditorContext } from '../character/CharacterEditorContext';
import {
  deleteCharacter,
  deleteSession,
  toggleFavorite,
} from '../../services/storage/persistenceService';
import type { LibraryItemKind, LibraryItemMeta } from '../../services/storage/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { bumpLibraryEpoch, selectLibraryEpoch } from '../../store/slices/appShellSlice';
import { createId } from '../../store/slices/threadSlice';
import styles from './SessionLibraryPanel.module.css';

export type SessionRoutePrefix = 'session' | 'character';

function sessionPath(prefix: SessionRoutePrefix, sessionId: string): string {
  return `/${prefix}/${sessionId}`;
}

export interface SessionLibraryPanelProps {
  sessionId?: string;
  routePrefix: SessionRoutePrefix;
}

export function SessionLibraryPanel({ sessionId, routePrefix }: SessionLibraryPanelProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const characterEditor = useCharacterEditorContext();
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const [catalogEpoch, setCatalogEpoch] = useState(0);
  const loadableKinds: LibraryItemKind[] =
    routePrefix === 'character' ? ['character'] : ['session'];

  const bumpCatalog = useCallback(() => {
    dispatch(bumpLibraryEpoch());
    setCatalogEpoch((epoch) => epoch + 1);
  }, [dispatch]);

  const handleLoad = useCallback(
    (item: LibraryItemMeta) => {
      if (item.kind === 'session' && sessionId && item.id !== sessionId) {
        navigate(sessionPath(routePrefix, item.id));
        return;
      }
      if (item.kind === 'character') {
        characterEditor?.loadCharacterById(item.id);
      }
    },
    [characterEditor, navigate, routePrefix, sessionId],
  );

  const handleDeleteLoadable = useCallback(
    async (item: LibraryItemMeta) => {
      if (item.kind === 'session') {
        const result = await deleteSession(item.id);
        bumpCatalog();
        if (sessionId && item.id === sessionId) {
          const nextId = result.activeSessionId;
          navigate(nextId ? sessionPath(routePrefix, nextId) : '/');
        }
        return;
      }
      if (item.kind === 'character') {
        await deleteCharacter(item.id);
        bumpCatalog();
        if (characterEditor?.characterId === item.id) {
          characterEditor.startNewCharacter();
        }
      }
    },
    [bumpCatalog, characterEditor, navigate, routePrefix, sessionId],
  );

  const handleToggleFavorite = useCallback(
    async (item: LibraryItemMeta) => {
      await toggleFavorite(item.kind, item.id);
      bumpCatalog();
    },
    [bumpCatalog],
  );

  const handleNew = useCallback(() => {
    if (routePrefix === 'character') {
      characterEditor?.startNewCharacter();
      return;
    }
    navigate(sessionPath(routePrefix, createId()));
  }, [characterEditor, navigate, routePrefix]);

  const selectedId =
    routePrefix === 'session' ? (sessionId ?? null) : (characterEditor?.characterId ?? null);

  const editorBusy =
    routePrefix === 'character'
      ? Boolean(characterEditor?.isBusy || characterEditor?.isDirty)
      : false;

  return (
    <LibraryBrowser
      loadableKinds={loadableKinds}
      catalogEpoch={catalogEpoch + libraryEpoch}
      selectedId={selectedId}
      selectedKind={routePrefix === 'session' ? 'session' : 'character'}
      isBusy={editorBusy}
      onLoad={handleLoad}
      onDeleteLoadable={handleDeleteLoadable}
      onToggleFavoriteLoadable={handleToggleFavorite}
      headerActions={
        <button type="button" className={styles.newChatButton} onClick={handleNew}>
          {routePrefix === 'character' ? 'New character' : 'New chat'}
        </button>
      }
    />
  );
}
