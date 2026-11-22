import { AppMainNav } from '../AppMainNav';
import { OpfsBackupActions } from '../OpfsBackupActions';
import styles from './AppHeader.module.css';

export function AppHeader() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>MasterDater</h1>
      <div className={styles.tools}>
        <AppMainNav />
        <OpfsBackupActions />
      </div>
    </header>
  );
}
