import styles from './MessageListEmpty.module.css';

export function MessageListEmpty() {
  return (
    <div className={styles.empty}>
      <p className={styles.title}>Welcome to MatchDate</p>
      <p className={styles.hint}>Send a message to start chatting.</p>
    </div>
  );
}
