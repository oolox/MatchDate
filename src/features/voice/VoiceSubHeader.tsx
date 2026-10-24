import { Button } from '../../components/ui/Button';
import { SubHeader } from '../../components/ui/SubHeader';
import { SubHeaderNameField } from '../../components/ui/SubHeaderNameField';
import type { VoiceGenderHint } from '../../services/fal/models/tts';
import { VoiceGenderToggle } from './VoiceGenderToggle';
import styles from './VoiceSubHeader.module.css';

export interface VoiceSubHeaderProps {
  name: string;
  gender: VoiceGenderHint;
  isBusy: boolean;
  canSave: boolean;
  canNew: boolean;
  onNameChange: (value: string) => void;
  onClearName: () => void;
  onGenderChange: (gender: VoiceGenderHint) => void;
  onSave: () => void;
  onNew: () => void;
}

export function VoiceSubHeader({
  name,
  gender,
  isBusy,
  canSave,
  canNew,
  onNameChange,
  onClearName,
  onGenderChange,
  onSave,
  onNew,
}: VoiceSubHeaderProps) {
  return (
    <SubHeader
      navLabel="Voice actions"
      nav={
        <>
          <Button variant="tab" disabled={!canSave} onClick={onSave}>
            SAVE
          </Button>
          <Button variant="tab" disabled={!canNew} onClick={onNew}>
            NEW
          </Button>
        </>
      }
    >
      <div className={styles.content}>
        <SubHeaderNameField
          value={name}
          disabled={isBusy}
          placeholder="Voice name"
          ariaLabel="Voice name"
          clearLabel="Clear voice name"
          onChange={onNameChange}
          onClear={onClearName}
        />
        <VoiceGenderToggle
          value={gender}
          disabled={isBusy}
          onChange={onGenderChange}
        />
      </div>
    </SubHeader>
  );
}
