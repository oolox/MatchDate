import { useCallback, useState, type DragEvent } from 'react';
import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { TextArea } from '../../components/ui/TextArea/TextArea';
import {
  geminiVoiceOptions,
  type VoiceGenderHint,
} from '../../services/fal/models/tts';
import {
  dataTransferHasMatchDateLibrary,
  readMatchDateLibraryDragPayload,
} from '../../utils/matchdateLibraryDrag';
import type { VoiceEditor } from './useVoiceEditor';
import styles from './VoiceContainer.module.css';

const GENDER_OPTIONS: Array<{ value: VoiceGenderHint; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'neutral', label: 'Neutral' },
];

const VOICE_OPTIONS = geminiVoiceOptions();

export interface VoiceContainerProps {
  editor: VoiceEditor;
}

export function VoiceContainer({ editor }: VoiceContainerProps) {
  const {
    voiceName,
    gender,
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
    // getData is empty during dragover in most browsers — accept library MIME only.
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
      <header className={styles.toolbar}>
        <label className={styles.nameField}>
          <span className={styles.fieldLabel}>Voice name</span>
          <input
            type="text"
            className={styles.nameInput}
            value={voiceName}
            disabled={disabled}
            placeholder="Untitled voice"
            onChange={(event) => setVoiceName(event.target.value)}
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

      <div className={styles.controls}>
        <label className={styles.controlField}>
          <span className={styles.fieldLabel}>Gender</span>
          <DropdownSelect
            aria-label="Gender"
            options={GENDER_OPTIONS}
            value={gender}
            disabled={disabled}
            onChange={(value) => setGender(value as VoiceGenderHint)}
          />
        </label>
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
        <div className={styles.sayHeader}>
          <span className={styles.fieldLabel}>Say this</span>
          <div className={styles.sayMeta}>
            <span>{costLabel}</span>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonPrimary}`}
              disabled={disabled || !sayText.trim()}
              onClick={() => {
                void handleSayThis();
              }}
            >
              {isSaying ? 'Speaking…' : 'Say this'}
            </button>
          </div>
        </div>
        <TextArea
          label="Utterance"
          hideLabel
          rows={5}
          value={sayText}
          disabled={disabled}
          placeholder="Type something to hear…"
          onChange={(event) => setSayText(event.target.value)}
        />
        {lastError ? <p className={styles.error}>{lastError}</p> : null}
        <p className={styles.hint}>
          Drag a VOICE asset here to load. Utterances are temporary — Save keeps the design only.
        </p>
      </div>
    </section>
  );
}
