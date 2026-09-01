import type { ReactNode } from 'react';
import styles from './MessageThread.module.css';

export interface MessageThreadProps {
  header?: ReactNode;
  messages: ReactNode;
  composer: ReactNode;
}

export function MessageThread({ header, messages, composer }: MessageThreadProps) {
  return (
    <section className={styles.thread}>
      {header ?? null}
      <div className={styles.body}>{messages}</div>
      {composer}
    </section>
  );
}
