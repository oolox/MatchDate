import { useCallback, useState, type DragEvent } from 'react';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { Icon } from '../../components/ui/Icon/Icon';
import { TextArea } from '../../components/ui/TextArea/TextArea';
import { geminiVoiceOptions } from '../../services/fal/models/tts';
import {
  dataTransferHasMatchDateLibrary,
  readMatchDateLibraryDragPayload,
} from '../../utils/matchdateLibraryDrag';
import type { VoiceEditor } from './useVoiceEditor';
import { VoiceSubHeader } from './VoiceSubHeader';
import styles from './VoiceContainer.module.css';

const VOICE_OPTIONS = geminiVoiceOptions();

export interface VoiceContainerProps {
  editor: VoiceEditor;
}

export function VoiceContainer({ editor }: VoiceContainerProps) {
  const {
    voiceName,
    gender,
    linkedCharacterId,
    voiceId,
    styleInstructions,
    temperature,
    sayText,
    isBusy,
    isSaying,
    lastError,
    costLabel,
    canSave,
    canNew,
    setVoiceName,
    setGender,
    setVoiceId,
    setStyleInstructions,
    setTemperature,
    setSayText,
    handleNew,
    handleSave,
    handleSayThis,
    loadVoiceAsset,
  } = editor;

  const [dragActive, setDragActive] = useState(false);
  const disabled = isBusy || isSaying;

  const handleDragOver = useCallback((event: DragEvent) => {
    if (!dataTransferHasMatchDateLibrary(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      setDragActive(false);
      if (!dataTransferHasMatchDateLibrary(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      const payload = readMatchDateLibraryDragPayload(event.dataTransfer);
      if (payload?.kind === 'asset' && payload.subtype === 'voice' && payload.id) {
        void loadVoiceAsset(payload.id);
      }
    },
    [loadVoiceAsset],
  );

  return (
    <section
      className={[styles.section, dragActive ? styles.sectionDragActive : '']
        .filter(Boolean)
        .join(' ')}
      aria-label="Voice designer"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <VoiceSubHeader
        name={voiceName}
        gender={gender}
        characterId={linkedCharacterId}
        isBusy={disabled}
        canSave={canSave}
        canNew={canNew}
        onNameChange={setVoiceName}
        onClearName={() => setVoiceName('')}
        onGenderChange={setGender}
        onSave={() => {
          void handleSave();
        }}
        onNew={handleNew}
      />

      <div className={styles.body}>
        <div className={styles.controls}>
          <label className={styles.controlField}>
            <span className={styles.fieldLabel}>Gemini voice</span>
            <DropdownSelect
              aria-label="Gemini voice"
              options={VOICE_OPTIONS}
              value={voiceId}
              disabled={disabled}
              onChange={setVoiceId}
            />
          </label>
          <div className={styles.controlField}>
            <span className={styles.fieldLabel}>Temperature</span>
            <div className={styles.tempRow}>
              <input
                type="range"
                className={styles.tempInput}
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                disabled={disabled}
                aria-label="Temperature"
                onChange={(event) => setTemperature(Number(event.target.value))}
              />
              <span className={styles.tempValue}>{temperature.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className={styles.styleField}>
          <TextArea
            label="Style instructions"
            rows={3}
            value={styleInstructions}
            disabled={disabled}
            placeholder="British accent, warm, slightly teasing…"
            onChange={(event) => setStyleInstructions(event.target.value)}
          />
        </div>

        <div className={styles.sayBlock}>
          <span className={styles.fieldLabel}>Say this</span>
          <TextArea
            label="Utterance"
            hideLabel
            rows={5}
            value={sayText}
            disabled={disabled}
            placeholder="Type something to hear…"
            onChange={(event) => setSayText(event.target.value)}
          />
          <div className={styles.sayMeta}>
            <span>{costLabel}</span>
            <button
              type="button"
              className={[
                styles.button,
                styles.buttonPrimary,
                isSaying ? styles.buttonSaying : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={disabled || !sayText.trim()}
              aria-busy={isSaying || undefined}
              aria-label={isSaying ? 'Speaking…' : 'Say'}
              title={isSaying ? 'Speaking…' : 'Say'}
              onClick={() => {
                void handleSayThis();
              }}
            >
              <Icon
                name="voice"
                className={[styles.sayIcon, isSaying ? styles.sayIconSpeaking : '']
                  .filter(Boolean)
                  .join(' ')}
              />
            </button>
          </div>
          {lastError ? <p className={styles.error}>{lastError}</p> : null}
          <p className={styles.hint}>
            Drag a VOICE asset here to load. Utterances are temporary — Save keeps the design only.
          </p>
        </div>
      </div>
    </section>
  );
}
