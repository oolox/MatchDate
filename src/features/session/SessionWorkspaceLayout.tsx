import type { ReactNode } from 'react';
import { AppHeader } from '../../components/layout/AppHeader';
import { ColumnSplit } from '../../components/layout/ColumnSplit/ColumnSplit';
import { SessionPersistenceContext } from './SessionPersistenceContext';
import { SessionLibraryPanel, type SessionRoutePrefix } from './SessionLibraryPanel';
import styles from './SessionWorkspaceLayout.module.css';

export interface SessionWorkspaceLayoutProps {
  routePrefix: SessionRoutePrefix;
  sessionId?: string;
  left: ReactNode;
  persistence: {
    ready: boolean;
    persistAfterTurn: () => Promise<void>;
  };
}

export function SessionWorkspaceLayout({
  sessionId,
  routePrefix,
  left,
  persistence,
}: SessionWorkspaceLayoutProps) {
  if (!persistence.ready) {
    return null;
  }

  return (
    <SessionPersistenceContext.Provider
      value={{ ready: persistence.ready, persistAfterTurn: persistence.persistAfterTurn }}
    >
      <div className={styles.page}>
        <AppHeader />
        <div className={styles.body}>
          <ColumnSplit
            left={<div className={styles.leftPane}>{left}</div>}
            right={<SessionLibraryPanel sessionId={sessionId} routePrefix={routePrefix} />}
          />
        </div>
      </div>
    </SessionPersistenceContext.Provider>
  );
}
