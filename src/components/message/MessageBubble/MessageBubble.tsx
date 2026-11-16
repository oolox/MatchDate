import { memo, useLayoutEffect, useRef } from 'react';
import type { ThreadMessage } from '../../../types/chat';
import { AssistantMessageContent } from '../AssistantMessageContent/AssistantMessageContent';
import { UserMessageContent } from '../UserMessageContent/UserMessageContent';
import { Spinner } from '../../ui/Spinner/Spinner';
import styles from './MessageBubble.module.css';

export interface MessageBubbleProps {
  message: ThreadMessage;
  /** Live reasoning text while this bubble is the waiting spinner. */
  reasoning?: string;
}

const CHAT_WAITING_SPINNER_SIZE = 200;

function ReasoningLines({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    element.scrollTop = element.scrollHeight;
  }, [text]);

  return (
    <div ref={ref} className={styles.reasoning} aria-label="Reasoning">
      {text}
    </div>
  );
}

function MessageBubbleComponent({ message, reasoning }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isWaitingForResponse =
    !isUser && message.status === 'streaming' && message.content.trim().length === 0;

  const roleLabel = isUser ? 'You' : 'MasterDater';
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
      <article className={messageClass} aria-label="MasterDater is generating">
        <Spinner
          size={CHAT_WAITING_SPINNER_SIZE}
          label="MasterDater is generating"
          className={styles.waitingSpinner}
        />
        {reasoning ? <ReasoningLines text={reasoning} /> : null}
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
    prev.message.status === next.message.status &&
    prev.reasoning === next.reasoning,
);
