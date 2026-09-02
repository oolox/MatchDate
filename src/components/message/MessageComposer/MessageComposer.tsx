import type { DragEvent, FormEvent, KeyboardEvent, ReactNode, Ref } from 'react';
import { useCallback, useState } from 'react';
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
  allowEmptySend?: boolean;
  actionsTrailing?: ReactNode;
  attachments?: ReactNode;
  mentionMenu?: ReactNode;
  mentionOpen?: boolean;
  mentionActiveId?: string;
  textareaRef?: Ref<HTMLTextAreaElement>;
  enableFileDrop?: boolean;
  dropLabel?: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAbort?: () => void;
  onFilesDrop?: (files: File[]) => void;
  onComposerKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => boolean;
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
  allowEmptySend = false,
  actionsTrailing,
  attachments,
  mentionMenu,
  mentionOpen = false,
  mentionActiveId,
  textareaRef,
  enableFileDrop = false,
  dropLabel = 'Drop text files here',
  onChange,
  onSend,
  onAbort,
  onFilesDrop,
  onComposerKeyDown,
}: MessageComposerProps) {
  const [dragActive, setDragActive] = useState(false);
  const canSend =
    !disabled && !isStreaming && (allowEmptySend || value.trim().length > 0);
  const showStreamingReplace = Boolean(isStreaming && streamingLabel);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSend) {
      onSend();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (onComposerKeyDown?.(event)) {
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        onSend();
      }
    }
  };

  const handleDragOver = useCallback(
    (event: DragEvent) => {
      if (!enableFileDrop || !onFilesDrop || disabled || isStreaming) {
        return;
      }
      event.preventDefault();
      setDragActive(true);
    },
    [disabled, enableFileDrop, isStreaming, onFilesDrop],
  );

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      if (!enableFileDrop || !onFilesDrop || disabled || isStreaming) {
        return;
      }
      event.preventDefault();
      setDragActive(false);
      const files = Array.from(event.dataTransfer.files).filter(
        (file) =>
          file.type.startsWith('text/') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.md'),
      );
      if (files.length > 0) {
        onFilesDrop(files);
      }
    },
    [disabled, enableFileDrop, isStreaming, onFilesDrop],
  );

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
    <form
      className={[
        styles.composer,
        enableFileDrop ? styles.dropZone : '',
        dragActive ? styles.dropZoneActive : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onSubmit={handleSubmit}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={dragActive ? dropLabel : undefined}
    >
      {attachments}
      <div className={styles.fieldWrap}>
        {mentionMenu}
        <MessageTextInput
          ref={textareaRef}
          label={label}
          value={value}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled || isStreaming}
          aria-describedby={mentionOpen ? 'txt-attach-listbox' : undefined}
          aria-autocomplete={mentionOpen ? 'list' : undefined}
          aria-controls={mentionOpen ? 'txt-attach-listbox' : undefined}
          aria-expanded={mentionOpen || undefined}
          aria-activedescendant={mentionActiveId}
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
