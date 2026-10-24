import { DropdownSelect } from '../../components/ui/DropdownSelect';
import { Icon } from '../../components/ui/Icon/Icon';
import { TextArea } from '../../components/ui/TextArea/TextArea';
import { geminiVoiceOptions } from '../../services/fal/models/tts';
import { VoiceGenderToggle } from './VoiceGenderToggle';
import type { VoiceEditor } from './useVoiceEditor';
import styles from './VoiceDesignerPanel.module.css';

const VOICE_OPTIONS = geminiVoiceOptions();

export interface VoiceDesignerPanelProps {
  editor: VoiceEditor;
  expanded: boolean;
  disabled?: boolean;
}

function SayThisButton({
  costLabel,
  isSaying,
  disabled,
  onSay,
}: {
  costLabel: string;
  isSaying: boolean;
  disabled: boolean;
  onSay: () => void;
}) {
  return (
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
        disabled={disabled}
        aria-busy={isSaying || undefined}
        aria-label={isSaying ? 'Speaking…' : 'Say'}
        title={isSaying ? 'Speaking…' : 'Say'}
        onClick={onSay}
      >
        <Icon
          name="voice"
          className={[styles.sayIcon, isSaying ? styles.sayIconSpeaking : '']
            .filter(Boolean)
            .join(' ')}
        />
      </button>
    </div>
  );
}

export function VoiceDesignerPanel({
  editor,
  expanded,
  disabled = false,
}: VoiceDesignerPanelProps) {
  const {
    gender,
    voiceId,
    styleInstructions,
    temperature,
    sayText,
    isSaying,
    lastError,
    costLabel,
    setGender,
    setVoiceId,
    setStyleInstructions,
    setTemperature,
    setSayText,
    handleSayThis,
  } = editor;

  const controlsDisabled = disabled || isSaying;
  const sayDisabled = controlsDisabled || !sayText.trim();
  const voiceLabel =
    VOICE_OPTIONS.find((option) => option.value === voiceId)?.label ?? voiceId;
  const stylePreview = styleInstructions.trim() || '—';

  return (
    <div className={styles.panel} aria-label="Voice designer">
      {!expanded ? (
        <div className={styles.collapsedRow}>
          <div className={styles.summaryField}>
            <span className={styles.fieldLabel}>Voice</span>
            <span className={styles.summaryValue} title={voiceLabel}>
              {voiceLabel}
            </span>
          </div>
          <div className={styles.summaryField}>
            <span className={styles.fieldLabel}>Temp</span>
            <span className={styles.summaryValue}>{temperature.toFixed(1)}</span>
          </div>
          <div className={`${styles.summaryField} ${styles.summaryStyle}`}>
            <span className={styles.fieldLabel}>Style</span>
            <span className={styles.summaryValue} title={stylePreview}>
              {stylePreview}
            </span>
          </div>
          <SayThisButton
            costLabel={costLabel}
            isSaying={isSaying}
            disabled={sayDisabled}
            onSay={() => {
              void handleSayThis();
            }}
          />
        </div>
      ) : (
        <div className={styles.expandedBody}>
          <div className={styles.controls}>
            <div className={styles.controlField}>
              <VoiceGenderToggle
                value={gender}
                disabled={controlsDisabled}
                onChange={setGender}
              />
            </div>
            <div className={styles.controlField}>
              <DropdownSelect
                aria-label="Gemini voice"
                options={VOICE_OPTIONS}
                value={voiceId}
                disabled={controlsDisabled}
                onChange={setVoiceId}
              />
            </div>
            <div className={styles.controlField}>
              <div className={styles.tempRow}>
                <input
                  type="range"
                  className={styles.tempInput}
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  disabled={controlsDisabled}
                  aria-label="Temperature"
                  onChange={(event) => setTemperature(Number(event.target.value))}
                />
                <span className={styles.tempValue}>{temperature.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className={styles.styleField}>
            <TextArea
              label="Style"
              rows={3}
              value={styleInstructions}
              disabled={controlsDisabled}
              placeholder="British accent, warm, slightly teasing…"
              onChange={(event) => setStyleInstructions(event.target.value)}
            />
          </div>

          <div className={styles.sayBlock}>
            <span className={styles.fieldLabel}>Say this</span>
            <TextArea
              label="Utterance"
              hideLabel
              rows={4}
              value={sayText}
              disabled={controlsDisabled}
              placeholder="Type something to hear…"
              onChange={(event) => setSayText(event.target.value)}
            />
            <SayThisButton
              costLabel={costLabel}
              isSaying={isSaying}
              disabled={sayDisabled}
              onSay={() => {
                void handleSayThis();
              }}
            />
            {lastError ? <p className={styles.error}>{lastError}</p> : null}
            <p className={styles.hint}>
              Drag a VOICE asset onto the character sheet to load. Character SAVE keeps the
              design.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
