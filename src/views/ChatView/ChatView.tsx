import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageThreadContainer } from '../../features/chat/containers/MessageThreadContainer';
import { ChatSubHeader } from '../../features/chat/ChatSubHeader';
import { useSessionEditor } from '../../features/session/useSessionEditor';
import { SessionWorkspaceLayout } from '../../features/session/SessionWorkspaceLayout';
import { useAppSelector } from '../../store/hooks';
import { createId } from '../../store/slices/threadSlice';
import styles from './ChatView.module.css';

export interface ChatViewProps {
  sessionId: string;
}

export function ChatView({ sessionId }: ChatViewProps) {
  const navigate = useNavigate();
  const { ready, persistAfterTurn, saveSessionName, isSavingName } =
    useSessionEditor(sessionId);
  const title = useAppSelector(
    (state) => state.thread.threads[sessionId]?.title ?? 'New chat',
  );

  const handleNewChat = useCallback(() => {
    navigate(`/session/${createId()}`);
  }, [navigate]);

  const handleSaveName = useCallback(
    (name: string) => {
      void saveSessionName(name);
    },
    [saveSessionName],
  );

  return (
    <SessionWorkspaceLayout
      sessionId={sessionId}
      routePrefix="session"
      persistence={{ ready, persistAfterTurn }}
      left={
        <div className={styles.chat}>
          <ChatSubHeader
            title={title}
            isBusy={isSavingName}
            onNew={handleNewChat}
            onSaveName={handleSaveName}
          />
          <MessageThreadContainer threadId={sessionId} />
        </div>
      }
    />
  );
}
