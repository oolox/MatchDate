import type { ReactNode } from 'react';
import styles from './SubHeader.module.css';

export interface SubHeaderProps {
  children: ReactNode;
  nav?: ReactNode;
  navLabel?: string;
  className?: string;
}

export function SubHeader({ children, nav, navLabel = 'Actions', className }: SubHeaderProps) {
  const classes = [styles.subHeader, className].filter(Boolean).join(' ');

  return (
    <header className={classes}>
      <div className={styles.content}>{children}</div>
      {nav ? (
        <nav className={styles.nav} aria-label={navLabel}>
          {nav}
        </nav>
      ) : null}
    </header>
  );
}
