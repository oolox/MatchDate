import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LibraryBrowser } from '../../components/library/LibraryBrowser/LibraryBrowser';
import { deleteSession, toggleFavorite } from '../../services/storage/persistenceService';
import type { LibraryItemMeta } from '../../services/storage/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { bumpLibraryEpoch, selectLibraryEpoch } from '../../store/slices/appShellSlice';
import { createId } from '../../store/slices/threadSlice';
import styles from './SessionLibraryPanel.module.css';

export type SessionRoutePrefix = 'session' | 'character';

function sessionPath(prefix: SessionRoutePrefix, sessionId: string): string {
  return `/${prefix}/${sessionId}`;
}

export interface SessionLibraryPanelProps {
  sessionId: string;
  routePrefix: SessionRoutePrefix;
}

export function SessionLibraryPanel({ sessionId, routePrefix }: SessionLibraryPanelProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const [catalogEpoch, setCatalogEpoch] = useState(0);

  const bumpCatalog = useCallback(() => {
    dispatch(bumpLibraryEpoch());
    setCatalogEpoch((epoch) => epoch + 1);
  }, [dispatch]);

  const handleLoadSession = useCallback(
    (item: LibraryItemMeta) => {
      if (item.id !== sessionId) {
        navigate(sessionPath(routePrefix, item.id));
      }
    },
    [navigate, routePrefix, sessionId],
  );

  const handleDeleteSession = useCallback(
    async (item: LibraryItemMeta) => {
      const result = await deleteSession(item.id);
      bumpCatalog();
      if (item.id === sessionId) {
        const nextId = result.activeSessionId;
        navigate(nextId ? sessionPath(routePrefix, nextId) : '/');
      }
    },
    [bumpCatalog, navigate, routePrefix, sessionId],
  );

  const handleToggleFavorite = useCallback(
    async (item: LibraryItemMeta) => {
      await toggleFavorite(item.kind, item.id);
      bumpCatalog();
    },
    [bumpCatalog],
  );

  const handleNewChat = useCallback(() => {
    navigate(sessionPath(routePrefix, createId()));
  }, [navigate, routePrefix]);

  return (
    <LibraryBrowser
      loadableKinds={['session']}
      catalogEpoch={catalogEpoch + libraryEpoch}
      selectedId={sessionId}
      selectedKind="session"
      onLoad={handleLoadSession}
      onDeleteLoadable={handleDeleteSession}
      onToggleFavoriteLoadable={handleToggleFavorite}
      headerActions={
        <button type="button" className={styles.newChatButton} onClick={handleNewChat}>
          New chat
        </button>
      }
    />
  );
}
