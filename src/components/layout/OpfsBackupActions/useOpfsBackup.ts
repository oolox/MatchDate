import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetChatView } from '../../../features/library/openLibraryGenerator';
import { useNotification } from '../../notification/Notification/useNotification';
import { getFileStorageService } from '../../../services/storage';
import {
  defaultOpfsBackupFilename,
  downloadBlob,
  exportOpfsZipBlob,
  importOpfsZip,
  pickZipFile,
  type OpfsBackupOptions,
} from '../../../services/storage/opfsBackup';
import { resetImageThumbCache } from '../../../services/storage/imageThumbCache';
import { reconcileLibrary, saveCharacterSetCopy } from '../../../services/storage/persistenceService';
import { useAppDispatch } from '../../../store/hooks';
import { bumpLibraryEpoch } from '../../../store/slices/appShellSlice';

export function useOpfsBackup() {
  const { notify } = useNotification();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<'export' | 'import' | 'set' | null>(null);

  const handleExport = useCallback(async (
    filename = defaultOpfsBackupFilename(),
    options?: OpfsBackupOptions,
  ) => {
    setBusy('export');
    try {
      const storage = getFileStorageService();
      const { blob, fileCount } = await exportOpfsZipBlob(storage, undefined, options);
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

  const handleSaveSet = useCallback(async (fileName: string, options?: OpfsBackupOptions) => {
    setBusy('set');
    try {
      const { name, fileCount } = await saveCharacterSetCopy(fileName, options);
      await reconcileLibrary();
      dispatch(bumpLibraryEpoch());
      notify(
        `Saved set ${name} (${fileCount} file${fileCount === 1 ? '' : 's'}).`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Set save failed';
      notify(message);
    } finally {
      setBusy(null);
    }
  }, [dispatch, notify]);

  const handleImport = useCallback(async () => {
    const file = await pickZipFile();
    if (!file) {
      notify('Import cancelled.');
      return;
    }

    const confirmed = window.confirm(
      'This will replace the current store with the zip. Continue?',
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
      resetImageThumbCache();
      dispatch(bumpLibraryEpoch());
      resetChatView(dispatch, navigate);
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
  }, [dispatch, navigate, notify]);

  return {
    busy,
    controlsDisabled: busy !== null,
    handleExport,
    handleImport,
    handleSaveSet,
  };
}
