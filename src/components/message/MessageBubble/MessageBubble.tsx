import { memo } from 'react';
import { AttachmentChips } from '../../chat/AttachmentChips/AttachmentChips';
import type { ThreadMessage } from '../../../types/chat';
import { AssistantMessageContent } from '../AssistantMessageContent/AssistantMessageContent';
import { Spinner } from '../../ui/Spinner/Spinner';
import styles from './MessageBubble.module.css';

export interface MessageBubbleProps {
  message: ThreadMessage;
}

const CHAT_WAITING_SPINNER_SIZE = 48;

function MessageBubbleComponent({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isWaitingForResponse =
    !isUser && message.status === 'streaming' && message.content.trim().length === 0;

  const roleLabel = isUser ? 'You' : 'Assistant';
  const displayContent = message.content;
  const messageClass = [
    styles.message,
    isUser ? styles.user : styles.assistant,
    isError ? styles.error : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={messageClass} aria-label={`${roleLabel} message`}>
      <header className={styles.header}>{roleLabel}</header>
      <div className={styles.bubble}>
        <div className={styles.content}>
          {isUser && message.attachments && message.attachments.length > 0 ? (
            <AttachmentChips items={message.attachments} />
          ) : null}
          {isWaitingForResponse ? (
            <Spinner size={CHAT_WAITING_SPINNER_SIZE} label="" className={styles.waitingSpinner} />
          ) : displayContent ? (
            isUser ? (
              <p className={styles.userText}>{displayContent}</p>
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
    prev.message.status === next.message.status &&
    prev.message.attachments?.length === next.message.attachments?.length,
);
