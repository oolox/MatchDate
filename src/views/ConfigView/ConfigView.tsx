import { useCallback, useState } from 'react';
import { AppHeader } from '../../components/layout/AppHeader';
import { Button } from '../../components/ui/Button';
import { useNotification } from '../../components/notification/Notification/useNotification';
import { getFileStorageService } from '../../services/storage';
import {
  defaultOpfsBackupFilename,
  downloadBlob,
  exportOpfsZipBlob,
  importOpfsZip,
  pickZipFile,
} from '../../services/storage/opfsBackup';
import { reconcileLibrary } from '../../services/storage/persistenceService';
import { useAppDispatch } from '../../store/hooks';
import { bumpLibraryEpoch } from '../../store/slices/appShellSlice';
import styles from './ConfigView.module.css';

export function ConfigView() {
  const { notify } = useNotification();
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const handleExport = useCallback(async () => {
    setBusy('export');
    try {
      const storage = getFileStorageService();
      const { blob, fileCount } = await exportOpfsZipBlob(storage);
      const filename = defaultOpfsBackupFilename();
      await downloadBlob(blob, filename);
      notify(`Exported ${fileCount} file${fileCount === 1 ? '' : 's'} → ${filename}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        notify('Export cancelled.');
        return;
      }
      const message = error instanceof Error ? error.message : 'Export failed';
      notify(message);
    } finally {
      setBusy(null);
    }
  }, [notify]);

  const handleImport = useCallback(async () => {
    const file = await pickZipFile();
    if (!file) {
      notify('Import cancelled.');
      return;
    }

    const confirmed = window.confirm(
      'This will write into OPFS. Existing files with the same path will be overwritten. Continue?',
    );
    if (!confirmed) {
      notify('Import cancelled.');
      return;
    }

    setBusy('import');
    try {
      const storage = getFileStorageService();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { written, skipped } = await importOpfsZip(storage, bytes);
      await reconcileLibrary();
      dispatch(bumpLibraryEpoch());
      notify(
        `Imported ${written} file${written === 1 ? '' : 's'}` +
          (skipped ? ` (${skipped} skipped)` : '') +
          '.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      notify(message);
    } finally {
      setBusy(null);
    }
  }, [dispatch, notify]);

  const controlsDisabled = busy !== null;

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <section className={styles.panel} aria-label="Storage">
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Storage</h2>
            <div className={styles.headerActions}>
              <Button
                type="button"
                variant="secondary"
                disabled={controlsDisabled}
                aria-label="Export OPFS backup"
                title="Download /masterdater as a ZIP backup"
                onClick={() => {
                  void handleExport();
                }}
              >
                {busy === 'export' ? 'Exporting…' : 'Export'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={controlsDisabled}
                aria-label="Import OPFS backup"
                title="Restore a MasterDater (or legacy MatchDate) OPFS ZIP into this origin"
                onClick={() => {
                  void handleImport();
                }}
              >
                {busy === 'import' ? 'Importing…' : 'Import'}
              </Button>
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
