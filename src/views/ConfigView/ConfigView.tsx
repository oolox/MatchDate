import { AppHeader } from '../../components/layout/AppHeader';
import styles from './ConfigView.module.css';

export function ConfigView() {
  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <p className={styles.placeholder}>Configuration coming soon.</p>
      </main>
    </div>
  );
}
