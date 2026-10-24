import { IconButton } from '../../components/ui/IconButton/IconButton';
import type { IconName } from '../../components/ui/Icon/icons';
import type { VoiceGenderHint } from '../../services/fal/models/tts';
import styles from './VoiceGenderToggle.module.css';

const VOICE_GENDERS: readonly VoiceGenderHint[] = ['male', 'female', 'neutral'];

const GENDER_LABELS: Record<VoiceGenderHint, string> = {
  male: 'Male',
  female: 'Female',
  neutral: 'Neutral',
};

/** Same icons as character identity; `neutral` uses the binary mark. */
const GENDER_ICONS: Record<VoiceGenderHint, IconName> = {
  male: 'male',
  female: 'female',
  neutral: 'binary',
};

export interface VoiceGenderToggleProps {
  value: VoiceGenderHint;
  disabled?: boolean;
  onChange: (gender: VoiceGenderHint) => void;
}

export function VoiceGenderToggle({
  value,
  disabled = false,
  onChange,
}: VoiceGenderToggleProps) {
  return (
    <div className={styles.bar} role="group" aria-label="Voice gender">
      {VOICE_GENDERS.map((gender) => (
        <IconButton
          key={gender}
          icon={GENDER_ICONS[gender]}
          label={GENDER_LABELS[gender]}
          variant="secondary"
          size="sm"
          disabled={disabled}
          current={value === gender}
          onClick={() => onChange(gender)}
        />
      ))}
    </div>
  );
}
