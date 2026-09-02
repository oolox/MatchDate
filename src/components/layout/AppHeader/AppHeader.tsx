import { AppMainNav } from '../AppMainNav';
import styles from './AppHeader.module.css';

export function AppHeader() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>MatchDate</h1>
      <AppMainNav />
    </header>
  );
}
