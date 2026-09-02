import type { KeyboardEvent } from 'react';
import styles from './Tabs.module.css';

export interface TabsItem {
  id: string;
  label: string;
  busy?: boolean;
}

export interface TabsProps {
  items: TabsItem[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  className?: string;
  idPrefix?: string;
  'aria-label'?: string;
}

export function Tabs({
  items,
  value,
  onChange,
  disabled = false,
  className,
  idPrefix = 'tab',
  'aria-label': ariaLabel = 'Tabs',
}: TabsProps) {
  const classes = [styles.tablist, className].filter(Boolean).join(' ');
  const tabDomId = (id: string) => `${idPrefix}-${id}`;

  const focusTabAt = (index: number) => {
    const id = items[index]?.id;
    if (!id) {
      return;
    }
    const node = document.getElementById(tabDomId(id));
    node?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || items.length === 0) {
      return;
    }
    const currentIndex = Math.max(
      0,
      items.findIndex((item) => item.id === value),
    );
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (currentIndex + 1) % items.length;
      onChange(items[next]!.id);
      focusTabAt(next);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = (currentIndex - 1 + items.length) % items.length;
      onChange(items[next]!.id);
      focusTabAt(next);
    }
  };

  return (
    <div className={classes} role="tablist" aria-label={ariaLabel} onKeyDown={handleKeyDown}>
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            id={tabDomId(item.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            className={[styles.tab, selected ? styles.tabActive : ''].filter(Boolean).join(' ')}
            aria-busy={item.busy || undefined}
            onClick={() => {
              onChange(item.id);
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
