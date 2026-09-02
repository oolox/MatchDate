import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { ColumnSplit } from '../../components/layout/ColumnSplit/ColumnSplit';
import { LibraryBrowser } from '../../components/library/LibraryBrowser/LibraryBrowser';
import { SessionPersistenceContext } from '../../features/session/SessionPersistenceContext';
import { useSessionEditor } from '../../features/session/useSessionEditor';
import { MessageThreadContainer } from '../../features/chat/containers/MessageThreadContainer';
import { deleteSession, toggleFavorite } from '../../services/storage/persistenceService';
import type { LibraryItemMeta } from '../../services/storage/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { bumpLibraryEpoch, selectLibraryEpoch } from '../../store/slices/appShellSlice';
import { createId } from '../../store/slices/threadSlice';
import styles from './ChatView.module.css';

export interface ChatViewProps {
  sessionId: string;
}

export function ChatView({ sessionId }: ChatViewProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const [catalogEpoch, setCatalogEpoch] = useState(0);
  const { ready, persistAfterTurn } = useSessionEditor(sessionId);

  const handleLoadSession = useCallback(
    (item: LibraryItemMeta) => {
      if (item.id !== sessionId) {
        navigate(`/session/${item.id}`);
      }
    },
    [navigate, sessionId],
  );

  const handleDeleteSession = useCallback(
    async (item: LibraryItemMeta) => {
      const result = await deleteSession(item.id);
      dispatch(bumpLibraryEpoch());
      setCatalogEpoch((epoch) => epoch + 1);
      if (item.id === sessionId) {
        navigate(result.activeSessionId ? `/session/${result.activeSessionId}` : '/');
      }
    },
    [dispatch, navigate, sessionId],
  );

  const handleToggleFavorite = useCallback(
    async (item: LibraryItemMeta) => {
      await toggleFavorite(item.kind, item.id);
      dispatch(bumpLibraryEpoch());
      setCatalogEpoch((epoch) => epoch + 1);
    },
    [dispatch],
  );

  const handleNewChat = useCallback(() => {
    navigate(`/session/${createId()}`);
  }, [navigate]);

  if (!ready) {
    return null;
  }

  return (
    <SessionPersistenceContext.Provider value={{ ready, persistAfterTurn }}>
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>MatchDate</h1>
          <nav className={styles.nav}>
            <Link className={styles.navLink} to="/prompts">
              System prompts
            </Link>
          </nav>
        </header>
        <div className={styles.body}>
          <ColumnSplit
            left={
              <div className={styles.chat}>
                <MessageThreadContainer threadId={sessionId} />
              </div>
            }
            right={
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
            }
          />
        </div>
      </div>
    </SessionPersistenceContext.Provider>
  );
}
