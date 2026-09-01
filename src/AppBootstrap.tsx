import { useEffect, useState, type ReactNode } from 'react';
import { Spinner } from './components/ui/Spinner/Spinner';
import {
  loadPromptsState,
  loadSessionsState,
  reconcileLibrary,
  requestPersistentStorage,
} from './services/storage/persistenceService';
import { useAppDispatch } from './store/hooks';
import { hydratePrompts } from './store/slices/promptsSlice';
import { hydrateSessions } from './store/slices/sessionsSlice';
import styles from './AppBootstrap.module.css';

export interface AppBootstrapProps {
  children: ReactNode;
}

export function AppBootstrap({ children }: AppBootstrapProps) {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await reconcileLibrary();
        const [sessions, prompts] = await Promise.all([
          loadSessionsState(),
          loadPromptsState(),
        ]);
        if (!cancelled) {
          dispatch(hydrateSessions(sessions));
          dispatch(hydratePrompts(prompts));
          await requestPersistentStorage();
        }
      } catch (error) {
        console.info('OPFS bootstrap failed; using in-memory defaults', error);
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (!ready) {
    return (
      <div className={styles.loading} role="status" aria-live="polite">
        <Spinner label="Loading MatchDate" />
      </div>
    );
  }

  return children;
}
