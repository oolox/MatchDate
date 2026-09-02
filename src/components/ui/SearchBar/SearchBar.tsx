import { useId, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import styles from './SearchBar.module.css';

export interface SearchBarProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SearchBar({
  label = 'Search',
  value,
  onChange,
  placeholder = 'Search…',
  disabled = false,
  id,
  className,
  open: openProp,
  onOpenChange,
}: SearchBarProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const classes = [styles.bar, open ? '' : styles.collapsed, className].filter(Boolean).join(' ');

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <div className={classes}>
      <button
        type="button"
        className={styles.labelButton}
        aria-label={label}
        aria-expanded={open}
        aria-controls={inputId}
        disabled={disabled}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            queueMicrotask(() => {
              inputRef.current?.focus();
            });
          }
        }}
      >
        <Icon name="search" className={styles.labelIcon} />
      </button>
      {open ? (
        <input
          ref={inputRef}
          id={inputId}
          className={styles.input}
          type="search"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-label={label}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      ) : null}
    </div>
  );
}
