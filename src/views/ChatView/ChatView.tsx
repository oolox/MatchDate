import { Link } from 'react-router-dom';
import { SessionPersistenceContext } from '../../features/session/SessionPersistenceContext';
import { useSessionEditor } from '../../features/session/useSessionEditor';
import { MessageThreadContainer } from '../../features/chat/containers/MessageThreadContainer';
import styles from './ChatView.module.css';

export interface ChatViewProps {
  sessionId: string;
}

export function ChatView({ sessionId }: ChatViewProps) {
  const { ready, persistAfterTurn } = useSessionEditor(sessionId);

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
        <div className={styles.chat}>
          <MessageThreadContainer threadId={sessionId} />
        </div>
      </div>
    </SessionPersistenceContext.Provider>
  );
}
