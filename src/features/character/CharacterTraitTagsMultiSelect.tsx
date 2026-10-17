import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  CHARACTER_TRAIT_TAGS,
  type CharacterTraitTag,
} from '../../types/character';
import styles from './CharacterTraitTagsMultiSelect.module.css';

const TAG_OPTIONS = CHARACTER_TRAIT_TAGS.map((tag) => ({
  value: tag,
  label: tag,
}));

export interface CharacterTraitTagsMultiSelectProps {
  value: CharacterTraitTag[];
  onChange: (tags: CharacterTraitTag[]) => void;
  disabled?: boolean;
  id?: string;
}

export function CharacterTraitTagsMultiSelect({
  value,
  onChange,
  disabled = false,
  id,
}: CharacterTraitTagsMultiSelectProps) {
  const listboxId = useId();
  const optionIdPrefix = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  const selectedSet = new Set(value);
  const summary = value.length === 0 ? 'No tags' : value.join(', ');

  const syncMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const setOpenSafe = useCallback(
    (next: boolean) => {
      if (disabled) {
        return;
      }
      if (next) {
        setHighlightIndex(0);
      }
      setOpen(next);
    },
    [disabled],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    syncMenuPosition();
    window.addEventListener('resize', syncMenuPosition);
    window.addEventListener('scroll', syncMenuPosition, true);
    return () => {
      window.removeEventListener('resize', syncMenuPosition);
      window.removeEventListener('scroll', syncMenuPosition, true);
    };
  }, [open, syncMenuPosition]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const toggleTag = (tag: CharacterTraitTag) => {
    if (selectedSet.has(tag)) {
      onChange(value.filter((entry) => entry !== tag));
      return;
    }
    onChange(
      CHARACTER_TRAIT_TAGS.filter((option) => selectedSet.has(option) || option === tag),
    );
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        setOpenSafe(true);
        return;
      }
      setHighlightIndex((index) => (index + 1) % TAG_OPTIONS.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpenSafe(true);
        return;
      }
      setHighlightIndex((index) => (index - 1 + TAG_OPTIONS.length) % TAG_OPTIONS.length);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (open) {
        event.preventDefault();
        const option = TAG_OPTIONS[highlightIndex];
        if (option) {
          toggleTag(option.value);
        }
      }
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const highlighted = TAG_OPTIONS[highlightIndex];
  const activeDescendant =
    open && highlighted ? `${optionIdPrefix}-${highlighted.value}` : undefined;

  return (
    <span ref={rootRef} className={styles.wrap}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={[styles.trigger, open ? styles.triggerOpen : ''].filter(Boolean).join(' ')}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        aria-label="Trait tags"
        disabled={disabled}
        onClick={() => setOpenSafe(!open)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={styles.value}>{summary}</span>
      </button>
      {open
        ? createPortal(
            <ul
              ref={menuRef}
              id={listboxId}
              className={styles.menu}
              role="listbox"
              aria-multiselectable="true"
              style={{ top: menuPos.top, left: menuPos.left, minWidth: menuPos.width }}
            >
              {TAG_OPTIONS.map((option, index) => {
                const selected = selectedSet.has(option.value);
                const active = index === highlightIndex;
                const optionClasses = [
                  styles.option,
                  selected ? styles.optionSelected : '',
                  active ? styles.optionActive : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <li
                    key={option.value}
                    id={`${optionIdPrefix}-${option.value}`}
                    className={optionClasses}
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => toggleTag(option.value)}
                  >
                    <span className={styles.check} aria-hidden="true">
                      {selected ? '✓' : ''}
                    </span>
                    <span className={styles.optionLabel}>{option.label}</span>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </span>
  );
}
