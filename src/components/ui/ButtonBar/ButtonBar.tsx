import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import { SmallButton } from '../SmallButton';
import styles from './ButtonBar.module.css';

export interface ButtonBarItem {
  id: string;
  label: ReactNode;
  ariaLabel?: string;
  icon?: IconName;
}

export interface ButtonBarProps {
  label: string;
  labelIcon?: IconName;
  items: ButtonBarItem[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showSelect?: boolean;
  className?: string;
}

export function ButtonBar({
  label,
  labelIcon,
  items,
  value,
  onChange,
  disabled = false,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  showSelect = false,
  className,
}: ButtonBarProps) {
  const buttonsId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const showButtons = open || showSelect;
  const visibleItems = open ? items : items.filter((item) => item.id === value);
  const classes = [
    styles.bar,
    open || !labelIcon || showSelect ? '' : styles.collapsed,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <div className={classes}>
      {labelIcon ? (
        <button
          type="button"
          className={styles.labelButton}
          aria-label={label}
          aria-expanded={open}
          aria-controls={buttonsId}
          disabled={disabled}
          onClick={() => {
            setOpen(!open);
          }}
        >
          <Icon name={labelIcon} className={styles.labelIcon} />
        </button>
      ) : (
        <span className={styles.label}>{label}</span>
      )}
      {showButtons && visibleItems.length > 0 ? (
        <div id={buttonsId} className={styles.buttons} role="group" aria-label={label}>
          {visibleItems.map((item) => {
            const current = item.id === value;
            return (
              <SmallButton
                key={item.id}
                current={current}
                disabled={disabled}
                aria-label={item.ariaLabel}
                icon={current ? item.icon : undefined}
                onClick={() => {
                  if (!open) {
                    setOpen(true);
                    return;
                  }
                  onChange(item.id);
                }}
              >
                {item.label}
              </SmallButton>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
