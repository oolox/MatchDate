import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'react-redux';
import {
  loadSessionDocument,
  saveSessionDocument,
} from '../../services/storage/persistenceService';
import { StorageError } from '../../services/storage/types';
import { useAppDispatch } from '../../store/hooks';
import { bumpLibraryEpoch } from '../../store/slices/appShellSlice';
import type { RootState } from '../../store';
import {
  markSessionSaved,
  setSelectedSessionId,
} from '../../store/slices/sessionsSlice';
import { loadThread, selectActiveThread } from '../../store/slices/threadSlice';
import {
  applyThreadToSession,
  createEmptySession,
  sessionToThread,
  type SessionDocument,
} from '../../types/session';

export function useSessionEditor(sessionId: string) {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const [sessionDoc, setSessionDoc] = useState<SessionDocument>(() =>
    createEmptySession({ id: sessionId }),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);

    void (async () => {
      try {
        const { session } = await loadSessionDocument(sessionId);
        if (cancelled) {
          return;
        }
        setSessionDoc(session);
        dispatch(loadThread(sessionToThread(session)));
        dispatch(markSessionSaved({ id: session.id, updatedAt: session.updatedAt }));
        dispatch(setSelectedSessionId(session.id));
      } catch (error) {
        if (
          error instanceof StorageError &&
          error.code === 'NOT_FOUND' &&
          !cancelled
        ) {
          const empty = createEmptySession({ id: sessionId });
          setSessionDoc(empty);
          dispatch(loadThread(sessionToThread(empty)));
          dispatch(setSelectedSessionId(null));
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, sessionId]);

  const persistAfterTurn = useCallback(async () => {
    const thread = selectActiveThread(store.getState());
    if (!thread || thread.id !== sessionId) {
      return;
    }

    const merged = applyThreadToSession(sessionDoc, thread);
    const saved = await saveSessionDocument(merged);
    setSessionDoc(saved);
    dispatch(markSessionSaved({ id: saved.id, updatedAt: saved.updatedAt }));
    dispatch(setSelectedSessionId(saved.id));
    dispatch(bumpLibraryEpoch());
  }, [dispatch, sessionDoc, sessionId, store]);

  return { ready, persistAfterTurn, sessionDoc };
}
