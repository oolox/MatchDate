import type { ReactNode } from 'react';
import styles from './ListSubHeader.module.css';

export interface ListSubHeaderProps {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

export function ListSubHeader({ children, trailing, className }: ListSubHeaderProps) {
  const classes = [styles.listSubHeader, className].filter(Boolean).join(' ');

  return (
    <header className={classes}>
      <div className={styles.content}>{children}</div>
      {trailing ? <div className={styles.trailing}>{trailing}</div> : null}
    </header>
  );
}
