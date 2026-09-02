import { MessageTextInput } from '../../../components/message/MessageTextInput/MessageTextInput';
import { IconButton } from '../../../components/ui/IconButton/IconButton';
import type { PromptsEditor } from './usePromptsEditor';
import styles from './PromptsContainer.module.css';

export interface PromptsContainerProps {
  editor: PromptsEditor;
}

export function PromptsContainer({ editor }: PromptsContainerProps) {
  const {
    systemPrompt,
    isBusy,
    canNew,
    canSave,
    handleNew,
    handleSave,
    setSystemPrompt,
    presetName,
    setPresetName,
  } = editor;

  return (
    <section className={styles.section} aria-label="System prompt settings">
      <header className={styles.toolbar}>
        <label className={styles.nameField}>
          <span className={styles.nameLabel}>Preset name</span>
          <input
            type="text"
            className={styles.nameInput}
            value={presetName}
            disabled={isBusy}
            placeholder="My preset"
            onChange={(event) => setPresetName(event.target.value)}
          />
        </label>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.button}
            disabled={!canNew}
            onClick={handleNew}
          >
            New
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={!canSave}
            onClick={() => {
              void handleSave();
            }}
          >
            Save
          </button>
        </div>
      </header>

      <div className={styles.editor}>
        <div className={styles.promptHeader}>
          <span className={styles.promptLabel}>System prompt</span>
          <IconButton
            icon="close"
            label="Clear system prompt"
            variant="secondary"
            disabled={isBusy || systemPrompt.length === 0}
            onClick={() => setSystemPrompt('')}
          />
        </div>
        <MessageTextInput
          label=""
          value={systemPrompt}
          rows={12}
          disabled={isBusy}
          placeholder="You are a helpful assistant."
          onChange={(value) => setSystemPrompt(value)}
        />
      </div>
    </section>
  );
}
