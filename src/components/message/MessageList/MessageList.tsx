import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { ThreadMessage } from '../../../types/chat';
import { MessageBubble } from '../MessageBubble/MessageBubble';
import { MessageListEmpty } from '../MessageListEmpty/MessageListEmpty';
import styles from './MessageList.module.css';

export interface MessageListProps {
  messages: ThreadMessage[];
  isPinnedToBottom: boolean;
  isStreaming?: boolean;
  onPinnedToBottomChange: (pinned: boolean) => void;
}

export function MessageList({
  messages,
  isPinnedToBottom,
  isStreaming = false,
  onPinnedToBottomChange,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    isProgrammaticScrollRef.current = true;
    list.scrollTop = list.scrollHeight;
  }, []);

  useLayoutEffect(() => {
    if (!isPinnedToBottom || messages.length === 0) {
      return;
    }
    scrollToBottom();
  }, [messages, isPinnedToBottom, scrollToBottom]);

  useEffect(() => {
    if (!isPinnedToBottom) {
      return;
    }

    const list = listRef.current;
    const messagesEl = messagesRef.current;
    if (!list || !messagesEl) {
      return;
    }

    let rafId = 0;
    const observer = new ResizeObserver(() => {
      if (!isPinnedToBottom) {
        return;
      }
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(scrollToBottom);
    });

    observer.observe(messagesEl);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [isPinnedToBottom, scrollToBottom]);

  const handleScroll = () => {
    if (isProgrammaticScrollRef.current) {
      isProgrammaticScrollRef.current = false;
      return;
    }

    const element = listRef.current;
    if (!element) {
      return;
    }

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    const threshold = isStreaming ? 120 : 48;
    onPinnedToBottomChange(distanceFromBottom < threshold);
  };

  if (messages.length === 0) {
    return (
      <div className={styles.list} ref={listRef}>
        <MessageListEmpty />
      </div>
    );
  }

  return (
    <div
      className={styles.list}
      ref={listRef}
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
    >
      <div className={styles.messages} ref={messagesRef}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
}
