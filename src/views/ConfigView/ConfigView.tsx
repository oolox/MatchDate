import { AppHeader } from '../../components/layout/AppHeader';
import { OpfsBackupActions } from '../../components/layout/OpfsBackupActions';
import styles from './ConfigView.module.css';

export function ConfigView() {
  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <section className={styles.panel} aria-label="Storage">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Storage</h2>
            <div className={styles.headerActions}>
              <OpfsBackupActions />
            </div>
          </div>
          <p className={styles.hint}>
            Export zips the entire <code>/masterdater</code> OPFS tree (chats, characters,
            assets). Import accepts MasterDater or legacy MatchDate zips, writes under{' '}
            <code>/masterdater</code>, and refreshes the library.
          </p>
        </section>
      </main>
    </div>
  );
}
