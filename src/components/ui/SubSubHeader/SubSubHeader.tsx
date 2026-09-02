import type { ReactNode } from 'react';
import { Tabs, type TabsItem } from '../Tabs';
import styles from './SubSubHeader.module.css';

export interface SubSubHeaderProps {
  value?: string;
  items?: TabsItem[];
  onChange?: (id: string) => void;
  disabled?: boolean;
  children?: ReactNode;
  nav?: ReactNode;
  navLabel?: string;
  tabsLabel?: string;
  className?: string;
}

export function SubSubHeader({
  value,
  items,
  onChange,
  disabled = false,
  children,
  nav,
  navLabel = 'Actions',
  tabsLabel = 'Subtypes',
  className,
}: SubSubHeaderProps) {
  const classes = [styles.subSubHeader, className].filter(Boolean).join(' ');
  const tabs = items ?? [];

  return (
    <header className={classes} aria-label={tabs.length === 0 ? tabsLabel : undefined}>
      <div className={styles.content}>
        {children}
        {tabs.length > 0 && value != null && onChange ? (
          <Tabs
            items={tabs}
            value={value}
            disabled={disabled}
            idPrefix="subtab"
            aria-label={tabsLabel}
            onChange={onChange}
          />
        ) : null}
      </div>
      {nav ? (
        <nav className={styles.nav} aria-label={navLabel}>
          {nav}
        </nav>
      ) : null}
    </header>
  );
}
