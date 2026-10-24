import { IconButton } from '../../components/ui/IconButton/IconButton';
import {
  CHARACTER_IDENTITIES,
  type CharacterIdentity,
} from '../../types/character';
import styles from './CharacterIdentityToggle.module.css';

const IDENTITY_LABELS: Record<CharacterIdentity, string> = {
  male: 'Male',
  female: 'Female',
  binary: 'Binary',
};

export interface CharacterIdentityToggleProps {
  value: CharacterIdentity;
  disabled?: boolean;
  onChange: (identity: CharacterIdentity) => void;
}

export function CharacterIdentityToggle({
  value,
  disabled = false,
  onChange,
}: CharacterIdentityToggleProps) {
  return (
    <div className={styles.bar} role="group" aria-label="Character identity">
      {CHARACTER_IDENTITIES.map((identity) => (
        <IconButton
          key={identity}
          icon={identity}
          label={IDENTITY_LABELS[identity]}
          variant="secondary"
          size="sm"
          disabled={disabled}
          current={value === identity}
          onClick={() => onChange(identity)}
        />
      ))}
    </div>
  );
}
