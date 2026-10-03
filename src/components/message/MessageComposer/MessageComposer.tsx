import type { DragEvent, FormEvent, KeyboardEvent, ReactNode, Ref } from 'react';
import { useCallback, useState } from 'react';
import { IconButton } from '../../ui/IconButton/IconButton';
import type { IconName } from '../../ui/Icon/icons';
import {
  dataTransferHasMatchDateLibrary,
  readMatchDateLibraryDragPayload,
  type MatchDateLibraryDragPayload,
} from '../../../utils/matchdateLibraryDrag';
import {
  MentionComposerInput,
  type MentionComposerInputHandle,
} from '../MentionComposerInput/MentionComposerInput';
import styles from './MessageComposer.module.css';

export interface MessageComposerProps {
  value: string;
  disabled?: boolean;
  isStreaming?: boolean;
  label?: string;
  placeholder?: string;
  rows?: number;
  sendIcon?: IconName;
  allowEmptySend?: boolean;
  actionsLeading?: ReactNode;
  actionsTrailing?: ReactNode;
  attachments?: ReactNode;
  mentionMenu?: ReactNode;
  mentionOpen?: boolean;
  mentionActiveId?: string;
  textareaRef?: Ref<MentionComposerInputHandle>;
  enableFileDrop?: boolean;
  dropLabel?: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAbort?: () => void;
  onFilesDrop?: (files: File[]) => void;
  onLibraryDrop?: (items: MatchDateLibraryDragPayload[]) => void;
  onComposerKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => boolean;
  onCaretChange?: (value: string, caret: number) => void;
}

function isAcceptedDrop(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer) {
    return false;
  }
  return (
    dataTransferHasMatchDateLibrary(dataTransfer) ||
    Array.from(dataTransfer.types).includes('Files')
  );
}

export function MessageComposer({
  value,
  disabled = false,
  isStreaming = false,
  label = 'Message',
  placeholder = 'Type a message…',
  rows = 3,
  sendIcon = 'send',
  allowEmptySend = false,
  actionsLeading,
  actionsTrailing,
  attachments,
  mentionMenu,
  mentionOpen = false,
  mentionActiveId,
  textareaRef,
  enableFileDrop = false,
  dropLabel = 'Drop text files or library items here',
  onChange,
  onSend,
  onAbort,
  onFilesDrop,
  onLibraryDrop,
  onComposerKeyDown,
  onCaretChange,
}: MessageComposerProps) {
  const [dragActive, setDragActive] = useState(false);
  const canSend =
    !disabled && !isStreaming && (allowEmptySend || value.trim().length > 0);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSend) {
      onSend();
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
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
      if (!enableFileDrop || disabled) {
        return;
      }
      if (!onFilesDrop && !onLibraryDrop) {
        return;
      }
      if (!isAcceptedDrop(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setDragActive(true);
    },
    [disabled, enableFileDrop, onFilesDrop, onLibraryDrop],
  );

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      if (!enableFileDrop || disabled) {
        return;
      }
      if (!onFilesDrop && !onLibraryDrop) {
        return;
      }
      if (!isAcceptedDrop(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      setDragActive(false);

      const libraryItem = readMatchDateLibraryDragPayload(event.dataTransfer);
      if (libraryItem) {
        onLibraryDrop?.([libraryItem]);
        return;
      }

      if (!onFilesDrop) {
        return;
      }
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
    [disabled, enableFileDrop, onFilesDrop, onLibraryDrop],
  );

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
        <MentionComposerInput
          ref={textareaRef}
          label={label}
          value={value}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          aria-describedby={mentionOpen ? 'txt-attach-listbox' : undefined}
          aria-autocomplete={mentionOpen ? 'list' : undefined}
          aria-controls={mentionOpen ? 'txt-attach-listbox' : undefined}
          aria-expanded={mentionOpen || undefined}
          aria-activedescendant={mentionActiveId}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onCaretChange={onCaretChange}
        />
      </div>
      <div className={styles.actions}>
        {actionsLeading ? (
          <div className={styles.actionsLeading}>{actionsLeading}</div>
        ) : null}
        {actionsTrailing}
        {isStreaming && onAbort ? (
          <IconButton
            icon="close"
            label="Stop generating"
            variant="secondary"
            size="md"
            onClick={onAbort}
          />
        ) : null}
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
