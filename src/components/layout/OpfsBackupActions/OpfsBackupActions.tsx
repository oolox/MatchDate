import { useCallback, useState } from 'react';
import { Button } from '../../ui/Button';
import { useNotification } from '../../notification/Notification/useNotification';
import { getFileStorageService } from '../../../services/storage';
import {
  chooseZipSaveLocation,
  defaultOpfsBackupFilename,
  exportOpfsZipBlob,
  importOpfsZip,
  pickZipFile,
} from '../../../services/storage/opfsBackup';
import { reconcileLibrary } from '../../../services/storage/persistenceService';
import { useAppDispatch } from '../../../store/hooks';
import { bumpLibraryEpoch } from '../../../store/slices/appShellSlice';
import styles from './OpfsBackupActions.module.css';

export function OpfsBackupActions() {
  const { notify } = useNotification();
  const dispatch = useAppDispatch();
  const [busy, setBusy] = useState<'save' | 'load' | null>(null);

  const handleSave = useCallback(async () => {
    const location = await chooseZipSaveLocation(defaultOpfsBackupFilename());
    if (!location) {
      notify('Save cancelled.');
      return;
    }

    setBusy('save');
    try {
      const storage = getFileStorageService();
      const { blob, fileCount } = await exportOpfsZipBlob(storage);
      await location.write(blob);
      notify(`Saved ${fileCount} file${fileCount === 1 ? '' : 's'} → ${location.filename}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        notify('Save cancelled.');
        return;
      }
      const message = error instanceof Error ? error.message : 'Save failed';
      notify(message);
    } finally {
      setBusy(null);
    }
  }, [notify]);

  const handleLoad = useCallback(async () => {
    const file = await pickZipFile();
    if (!file) {
      notify('Load cancelled.');
      return;
    }

    const confirmed = window.confirm(
      'This will write into OPFS. Existing files with the same path will be overwritten. Continue?',
    );
    if (!confirmed) {
      notify('Load cancelled.');
      return;
    }

    setBusy('load');
    try {
      const storage = getFileStorageService();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { written, skipped } = await importOpfsZip(storage, bytes);
      await reconcileLibrary();
      dispatch(bumpLibraryEpoch());
      notify(
        `Loaded ${written} file${written === 1 ? '' : 's'}` +
          (skipped ? ` (${skipped} skipped)` : '') +
          '.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Load failed';
      notify(message);
    } finally {
      setBusy(null);
    }
  }, [dispatch, notify]);

  const controlsDisabled = busy !== null;

  return (
    <div className={styles.actions}>
      <Button
        type="button"
        variant="tab"
        disabled={controlsDisabled}
        aria-label="Save OPFS backup"
        title="Choose where to save the /masterdater ZIP backup"
        onClick={() => {
          void handleSave();
        }}
      >
        {busy === 'save' ? 'Saving…' : 'SAVE'}
      </Button>
      <Button
        type="button"
        variant="tab"
        disabled={controlsDisabled}
        aria-label="Load OPFS backup"
        title="Choose a MasterDater or legacy MatchDate ZIP to load"
        onClick={() => {
          void handleLoad();
        }}
      >
        {busy === 'load' ? 'Loading…' : 'LOAD'}
      </Button>
    </div>
  );
}
