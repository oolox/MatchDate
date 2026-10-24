import type { ReactNode } from 'react';
import styles from './SectionKeepAlive.module.css';

export interface SectionKeepAliveProps {
  active: boolean;
  children: ReactNode;
  /** Accessible name for the section landmark when active. */
  label: string;
}

/**
 * Keeps section UI mounted while hiding inactive panes so React state
 * (and scroll) survive Chat ↔ Character ↔ Voice ↔ … switches.
 */
export function SectionKeepAlive({ active, children, label }: SectionKeepAliveProps) {
  return (
    <div
      className={[styles.pane, active ? styles.paneActive : ''].filter(Boolean).join(' ')}
      hidden={!active}
      aria-hidden={!active}
      aria-label={active ? label : undefined}
      {...(!active ? ({ inert: true } as { inert: boolean }) : {})}
    >
      {children}
    </div>
  );
}

export interface SectionWorkspaceProps {
  children: ReactNode;
}

export function SectionWorkspace({ children }: SectionWorkspaceProps) {
  return <div className={styles.workspace}>{children}</div>;
}
