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
    presetCatalog,
    selectedPresetSlug,
    activeSystemPresetSlug,
    isBusy,
    canNew,
    canSave,
    handleNew,
    handleSave,
    applyPreset,
    activatePreset,
    handleDeletePreset,
    setSystemPrompt,
    presetName,
    setPresetName,
  } = editor;

  return (
    <section className={styles.section} aria-label="System prompt settings">
      <div className={styles.layout}>
        <div className={styles.editorColumn}>
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
              rows={8}
              disabled={isBusy}
              placeholder="You are a helpful assistant."
              onChange={(value) => setSystemPrompt(value)}
            />
          </div>
        </div>

        <aside className={styles.catalogColumn} aria-label="Saved presets">
          <h2 className={styles.catalogTitle}>Presets</h2>
          {presetCatalog.length === 0 ? (
            <p className={styles.catalogEmpty}>No presets yet.</p>
          ) : (
            <ul className={styles.catalogList}>
              {presetCatalog.map((item) => {
                const isSelected = item.id === selectedPresetSlug;
                const isActive = item.id === activeSystemPresetSlug;
                return (
                  <li key={item.id} className={styles.catalogItem}>
                    <button
                      type="button"
                      className={`${styles.catalogButton} ${isSelected ? styles.catalogButtonSelected : ''}`}
                      disabled={isBusy}
                      onClick={() => {
                        void applyPreset(item.id, item.name);
                      }}
                    >
                      <span className={styles.catalogName}>{item.name}</span>
                      {isActive ? <span className={styles.activeBadge}>Active</span> : null}
                    </button>
                    <div className={styles.catalogActions}>
                      {!isActive ? (
                        <button
                          type="button"
                          className={styles.linkButton}
                          disabled={isBusy}
                          onClick={() => {
                            void activatePreset(item.id, item.name);
                          }}
                        >
                          Activate
                        </button>
                      ) : null}
                      {item.id !== 'default' ? (
                        <button
                          type="button"
                          className={styles.linkButtonDanger}
                          disabled={isBusy}
                          onClick={() => {
                            void handleDeletePreset(item.id, item.name);
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
