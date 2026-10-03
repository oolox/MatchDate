import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  isMentionElement,
  mentionEditorHtmlFromValue,
  MENTION_KIND_ATTR,
  serializeMentionEditor,
  serializedOffsetFromSelection,
  setSerializedSelection,
} from '../../../features/chat/attach/mentionEditorModel';
import styles from './MentionComposerInput.module.css';

export type MentionComposerInputHandle = {
  focus: () => void;
  get value(): string;
  get selectionStart(): number;
  get selectionEnd(): number;
  setSelectionRange: (start: number, end?: number) => void;
  /** Apply the next `value` prop to the DOM (mention insert/remove/clear). */
  syncExternal: () => void;
};

export interface MentionComposerInputProps {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  'aria-describedby'?: string;
  'aria-autocomplete'?: 'list' | 'none' | 'inline' | 'both';
  'aria-controls'?: string;
  'aria-expanded'?: boolean;
  'aria-activedescendant'?: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  onCaretChange?: (value: string, caret: number) => void;
}

export const MentionComposerInput = forwardRef<
  MentionComposerInputHandle,
  MentionComposerInputProps
>(function MentionComposerInput(
  {
    label,
    value,
    placeholder = '',
    disabled = false,
    rows = 3,
    onChange,
    onKeyDown,
    onCaretChange,
    ...aria
  },
  ref,
) {
  const navigate = useNavigate();
  const editorRef = useRef<HTMLDivElement | null>(null);
  /** Last value we emitted from the DOM (or last value we applied from props). */
  const lastEmittedRef = useRef(value);
  /** True after local input until React echoes `lastEmitted` — skip stale props. */
  const ignorePropSyncRef = useRef(false);
  /** Force the next `value` into the DOM (external insert/remove). */
  const externalSyncRef = useRef(false);
  const pendingCaretRef = useRef<number | null>(null);
  const [empty, setEmpty] = useState(!value.trim());

  const readValue = () => {
    const root = editorRef.current;
    return root ? serializeMentionEditor(root) : '';
  };

  const readCaret = () => {
    const root = editorRef.current;
    return root ? serializedOffsetFromSelection(root) : 0;
  };

  const notifyCaret = () => {
    const root = editorRef.current;
    if (!root || !onCaretChange) {
      return;
    }
    onCaretChange(serializeMentionEditor(root), serializedOffsetFromSelection(root));
  };

  const markExternalSync = (caret?: number) => {
    ignorePropSyncRef.current = false;
    externalSyncRef.current = true;
    if (caret != null) {
      pendingCaretRef.current = caret;
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        editorRef.current?.focus();
      },
      get value() {
        return readValue();
      },
      get selectionStart() {
        return readCaret();
      },
      get selectionEnd() {
        return readCaret();
      },
      setSelectionRange(start: number) {
        markExternalSync(start);
        const root = editorRef.current;
        if (!root) {
          return;
        }
        root.focus();
        setSerializedSelection(root, start);
      },
      syncExternal: () => {
        markExternalSync();
      },
    }),
    [],
  );

  useLayoutEffect(() => {
    const root = editorRef.current;
    if (!root) {
      return;
    }

    if (value === lastEmittedRef.current) {
      // Prop echo of what we already have — never move the caret here (races with typing).
      ignorePropSyncRef.current = false;
      externalSyncRef.current = false;
      pendingCaretRef.current = null;
      setEmpty(!value.trim());
      return;
    }

    // Local typing: DOM is ahead; ignore stale Redux echoes.
    if (ignorePropSyncRef.current && !externalSyncRef.current && value !== '') {
      return;
    }

    const caret =
      pendingCaretRef.current ??
      (document.activeElement === root ? serializedOffsetFromSelection(root) : value.length);
    root.innerHTML = mentionEditorHtmlFromValue(value);
    lastEmittedRef.current = value;
    ignorePropSyncRef.current = false;
    externalSyncRef.current = false;
    pendingCaretRef.current = null;
    setEmpty(!value.trim());
    setSerializedSelection(root, Math.min(Math.max(caret, 0), value.length));
  }, [value]);

  const emitChange = () => {
    const root = editorRef.current;
    if (!root) {
      return;
    }
    const next = serializeMentionEditor(root);
    lastEmittedRef.current = next;
    ignorePropSyncRef.current = true;
    externalSyncRef.current = false;
    setEmpty(!next.trim());
    onChange(next);
    onCaretChange?.(next, serializedOffsetFromSelection(root));
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    if (!text) {
      return;
    }
    const root = editorRef.current;
    if (!root) {
      return;
    }
    root.focus();
    const selection = document.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    emitChange();
  };

  const handleMentionClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const mention = target.closest(`[${MENTION_KIND_ATTR}]`);
    if (!isMentionElement(mention)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (mention.getAttribute(MENTION_KIND_ATTR) === 'character') {
      const id = mention.getAttribute('data-mention-id');
      if (id) {
        navigate(`/character/${id}`);
      }
    }
  };

  const minHeightEm = Math.max(rows, 2) * 1.5;

  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor="mention-composer-input">
        {label}
      </label>
      <div
        id="mention-composer-input"
        ref={editorRef}
        className={[styles.editor, empty ? styles.empty : ''].filter(Boolean).join(' ')}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        aria-describedby={aria['aria-describedby']}
        aria-autocomplete={aria['aria-autocomplete']}
        aria-controls={aria['aria-controls']}
        aria-expanded={aria['aria-expanded']}
        aria-activedescendant={aria['aria-activedescendant']}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{ minHeight: `${minHeightEm}em` }}
        onInput={emitChange}
        onKeyUp={notifyCaret}
        onClick={(event) => {
          handleMentionClick(event);
          notifyCaret();
        }}
        onKeyDown={onKeyDown}
        onPaste={handlePaste}
      />
    </div>
  );
});
