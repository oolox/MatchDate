import { memo } from 'react';
import type { ThreadMessage } from '../../../types/chat';
import { AssistantMessageContent } from '../AssistantMessageContent/AssistantMessageContent';
import { UserMessageContent } from '../UserMessageContent/UserMessageContent';
import { Spinner } from '../../ui/Spinner/Spinner';
import styles from './MessageBubble.module.css';

export interface MessageBubbleProps {
  message: ThreadMessage;
}

const CHAT_WAITING_SPINNER_SIZE = 200;

function MessageBubbleComponent({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isWaitingForResponse =
    !isUser && message.status === 'streaming' && message.content.trim().length === 0;

  const roleLabel = isUser ? 'You' : 'MatchDate';
  const displayContent = message.content;
  const messageClass = [
    styles.message,
    isUser ? styles.user : styles.assistant,
    isError ? styles.error : '',
    isWaitingForResponse ? styles.waiting : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (isWaitingForResponse) {
    return (
      <article className={messageClass} aria-label="MatchDate is generating">
        <Spinner
          size={CHAT_WAITING_SPINNER_SIZE}
          label="MatchDate is generating"
          className={styles.waitingSpinner}
        />
      </article>
    );
  }

  return (
    <article className={messageClass} aria-label={`${roleLabel} message`}>
      <header className={styles.header}>{roleLabel}</header>
      <div className={styles.bubble}>
        <div className={styles.content}>
          {displayContent ? (
            isUser ? (
              <UserMessageContent content={displayContent} />
            ) : (
              <AssistantMessageContent
                content={displayContent}
                deferHighlight={message.status === 'streaming'}
              />
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}

export const MessageBubble = memo(
  MessageBubbleComponent,
  (prev, next) =>
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.status === next.message.status,
);
