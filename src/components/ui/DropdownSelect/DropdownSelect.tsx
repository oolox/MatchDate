import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import styles from './DropdownSelect.module.css';

export interface DropdownSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: IconName;
}

export interface DropdownSelectProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'type' | 'value'> {
  options: readonly DropdownSelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Fixed icon shown in the trigger to the left of the selected label. */
  icon?: IconName;
}

/**
 * Compact combobox styled like SubHeader tab buttons (Save / New).
 * Custom listbox so the open menu uses the same dark tokens as MentionMenu.
 */
export function DropdownSelect({
  options,
  value,
  onChange,
  icon,
  className,
  disabled = false,
  ...rest
}: DropdownSelectProps) {
  const listboxId = useId();
  const optionIdPrefix = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

  const selected = options.find((option) => option.value === value);
  const selectedLabel = selected?.label ?? value;
  const triggerIcon = icon ?? selected?.icon;
  const enabledIndexes = options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);

  const wrapClasses = [styles.wrap, className].filter(Boolean).join(' ');
  const triggerClasses = [styles.trigger, open ? styles.triggerOpen : ''].filter(Boolean).join(' ');

  const syncMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  const setOpenSafe = useCallback(
    (next: boolean) => {
      if (disabled) {
        return;
      }
      if (next) {
        const selectedIndex = options.findIndex((option) => option.value === value);
        const firstEnabled = options.findIndex((option) => !option.disabled);
        setHighlightIndex(selectedIndex >= 0 ? selectedIndex : Math.max(firstEnabled, 0));
      }
      setOpen(next);
    },
    [disabled, options, value],
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

  const moveHighlight = (delta: number) => {
    if (enabledIndexes.length === 0) {
      return;
    }
    const currentPos = enabledIndexes.indexOf(highlightIndex);
    const nextPos =
      currentPos === -1
        ? delta > 0
          ? 0
          : enabledIndexes.length - 1
        : (currentPos + delta + enabledIndexes.length) % enabledIndexes.length;
    setHighlightIndex(enabledIndexes[nextPos] ?? 0);
  };

  const selectIndex = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) {
      return;
    }
    onChange(option.value);
    setOpen(false);
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
      moveHighlight(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpenSafe(true);
        return;
      }
      moveHighlight(-1);
      return;
    }
    if (event.key === 'Home' && open) {
      event.preventDefault();
      setHighlightIndex(enabledIndexes[0] ?? 0);
      return;
    }
    if (event.key === 'End' && open) {
      event.preventDefault();
      setHighlightIndex(enabledIndexes[enabledIndexes.length - 1] ?? 0);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (open) {
        event.preventDefault();
        selectIndex(highlightIndex);
      }
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const highlighted = options[highlightIndex];
  const activeDescendant =
    open && highlighted ? `${optionIdPrefix}-${highlighted.value}` : undefined;

  return (
    <span ref={rootRef} className={wrapClasses}>
      <button
        {...rest}
        ref={triggerRef}
        type="button"
        className={triggerClasses}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
        disabled={disabled}
        onClick={() => setOpenSafe(!open)}
        onKeyDown={onTriggerKeyDown}
      >
        {triggerIcon ? <Icon name={triggerIcon} className={styles.leadIcon} /> : null}
        <span className={styles.value}>{selectedLabel}</span>
      </button>
      {open
        ? createPortal(
            <ul
              ref={menuRef}
              id={listboxId}
              className={styles.menu}
              role="listbox"
              style={{ top: menuPos.top, left: menuPos.left, minWidth: menuPos.width }}
            >
              {options.map((option, index) => {
                const selectedOption = option.value === value;
                const active = index === highlightIndex;
                const optionClasses = [
                  styles.option,
                  selectedOption ? styles.optionSelected : '',
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
                    aria-selected={selectedOption}
                    aria-disabled={option.disabled || undefined}
                    onMouseEnter={() => {
                      if (!option.disabled) {
                        setHighlightIndex(index);
                      }
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => selectIndex(index)}
                  >
                    {option.icon ? <Icon name={option.icon} className={styles.optionIcon} /> : null}
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
