import { useState, type FormEvent } from 'react';
import { gameBackupFilename, gameSaveStem } from '../../../services/storage/opfsBackup';
import { Button } from '../../ui/Button';
import { Checkbox } from '../../ui/Checkbox';
import { FullScreenModal } from '../../ui/FullScreenModal';
import styles from './OpfsBackupActions.module.css';
import { useOpfsBackup } from './useOpfsBackup';

type OpfsBackupActionsProps = {
  exportLabel?: string;
  importLabel?: string;
  exportingLabel?: string;
  importingLabel?: string;
  /** Header Save asks which backup to write before the current export runs. */
  confirmSave?: boolean;
  /** Match the main nav toggles. Config Export and Import stay on the default button. */
  buttonVariant?: 'secondary' | 'tab';
};

export function OpfsBackupActions({
  exportLabel = 'Export',
  importLabel = 'Import',
  exportingLabel = 'Exporting…',
  importingLabel = 'Importing…',
  confirmSave = false,
  buttonVariant = 'secondary',
}: OpfsBackupActionsProps) {
  const { busy, controlsDisabled, handleExport, handleImport, handleSaveSet } = useOpfsBackup();
  const navButtonClass = buttonVariant === 'tab' ? styles.navButton : undefined;
  const [saveOpen, setSaveOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [includeChat, setIncludeChat] = useState(false);
  const fileStem = gameSaveStem(fileName);
  const fileNameReady = fileStem.length > 3;

  const closeSave = () => {
    setSaveOpen(false);
    setFileName('');
    setIncludeChat(false);
  };

  const saveGame = () => {
    if (!fileNameReady) {
      return;
    }
    const filename = gameBackupFilename(fileName);
    const options = { includeChat };
    closeSave();
    void handleExport(filename, options);
  };

  const saveSet = () => {
    if (!fileNameReady) {
      return;
    }
    const name = fileStem;
    const options = { includeChat };
    closeSave();
    void handleSaveSet(name, options);
  };

  const submitSave = (event: FormEvent) => {
    event.preventDefault();
    saveGame();
  };

  return (
    <div className={[styles.actions, buttonVariant === 'tab' ? styles.navActions : ''].filter(Boolean).join(' ')}>
      <Button
        type="button"
        variant={buttonVariant}
        className={navButtonClass}
        disabled={controlsDisabled}
        aria-label="Export OPFS backup"
        title="Download /masterdater as a ZIP backup"
        onClick={() => {
          if (confirmSave) {
            setSaveOpen(true);
            return;
          }
          void handleExport();
        }}
      >
        {busy === 'export' || busy === 'set' ? exportingLabel : exportLabel}
      </Button>
      <FullScreenModal
        open={saveOpen}
        onClose={closeSave}
        ariaLabel="Save?"
        closeLabel="Cancel save"
      >
        <form className={styles.savePrompt} onSubmit={submitSave}>
          <h2 className={styles.saveTitle}>Save?</h2>
          <div className={styles.fileNameField}>
            <label className={styles.fileNameLabel} htmlFor="save-file-name">
              File name
            </label>
            <input
              id="save-file-name"
              className={styles.fileNameInput}
              type="text"
              name="fileName"
              value={fileName}
              autoFocus
              onChange={(event) => {
                setFileName(event.target.value);
              }}
            />
            <Checkbox className={styles.saveOption} label="Wipe Memory" variant="secondary" />
            <Checkbox
              className={styles.saveOption}
              label="Include chat"
              variant="secondary"
              checked={includeChat}
              onChange={(event) => {
                setIncludeChat(event.target.checked);
              }}
            />
          </div>
          <div className={styles.saveChoices}>
            <Button
              type="submit"
              variant="secondary"
              className={styles.saveChoice}
              disabled={!fileNameReady}
            >
              Export
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={styles.saveChoice}
              disabled={!fileNameReady}
              onClick={saveSet}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="secondary"
              className={styles.saveChoice}
              onClick={closeSave}
            >
              Cancel
            </Button>
          </div>
        </form>
      </FullScreenModal>
      <Button
        type="button"
        variant={buttonVariant}
        className={navButtonClass}
        disabled={controlsDisabled}
        aria-label="Import OPFS backup"
        title="Restore a MasterDater (or legacy MatchDate) OPFS ZIP into this origin"
        onClick={() => {
          void handleImport();
        }}
      >
        {busy === 'import' ? importingLabel : importLabel}
      </Button>
    </div>
  );
}
