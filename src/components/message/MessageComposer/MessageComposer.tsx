import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import { IconButton } from '../../ui/IconButton/IconButton';
import type { IconName } from '../../ui/Icon/icons';
import { Spinner } from '../../ui/Spinner/Spinner';
import { MessageTextInput } from '../MessageTextInput/MessageTextInput';
import styles from './MessageComposer.module.css';

export interface MessageComposerProps {
  value: string;
  disabled?: boolean;
  isStreaming?: boolean;
  label?: string;
  placeholder?: string;
  rows?: number;
  streamingLabel?: string;
  sendIcon?: IconName;
  actionsTrailing?: ReactNode;
  onChange: (value: string) => void;
  onSend: () => void;
  onAbort?: () => void;
}

export function MessageComposer({
  value,
  disabled = false,
  isStreaming = false,
  label = 'Message',
  placeholder = 'Type a message…',
  rows = 3,
  streamingLabel = 'Generating response…',
  sendIcon = 'send',
  actionsTrailing,
  onChange,
  onSend,
  onAbort,
}: MessageComposerProps) {
  const canSend = !disabled && !isStreaming && value.trim().length > 0;
  const showStreamingReplace = Boolean(isStreaming && streamingLabel);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSend) {
      onSend();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        onSend();
      }
    }
  };

  if (showStreamingReplace) {
    return (
      <div className={styles.composer} role="status" aria-live="polite">
        <div className={styles.streaming}>
          <p className={styles.streamingLabel}>{streamingLabel}</p>
          <Spinner size={64} label={streamingLabel} className={styles.streamingSpinner} />
          {onAbort ? (
            <IconButton
              icon="close"
              label="Stop generating"
              variant="secondary"
              size="md"
              onClick={onAbort}
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <div className={styles.fieldWrap}>
        <MessageTextInput
          label={label}
          value={value}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || isStreaming}
          onChange={onChange}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className={styles.actions}>
        {actionsTrailing}
        <IconButton
          type="submit"
          icon={sendIcon}
          label="Send"
          variant="secondary"
          size="md"
          disabled={!canSend}
        />
      </div>
    </form>
  );
}
