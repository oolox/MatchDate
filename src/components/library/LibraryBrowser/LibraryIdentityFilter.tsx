import { IconButton } from '../../ui/IconButton/IconButton';
import {
  CHARACTER_IDENTITIES,
  type CharacterIdentity,
} from '../../../types/character';
import styles from './LibraryIdentityFilter.module.css';

const IDENTITY_LABELS: Record<CharacterIdentity, string> = {
  male: 'Male',
  female: 'Female',
  binary: 'Binary',
};

export const ALL_CHARACTER_IDENTITIES: readonly CharacterIdentity[] = CHARACTER_IDENTITIES;

export interface LibraryIdentityFilterProps {
  value: readonly CharacterIdentity[];
  disabled?: boolean;
  onChange: (identities: CharacterIdentity[]) => void;
  className?: string;
}

export function LibraryIdentityFilter({
  value,
  disabled = false,
  onChange,
  className,
}: LibraryIdentityFilterProps) {
  const selected = new Set(value);
  const classes = [styles.bar, className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="group" aria-label="Filter by identity">
      {CHARACTER_IDENTITIES.map((identity) => {
        const current = selected.has(identity);
        return (
          <IconButton
            key={identity}
            icon={identity}
            label={`${current ? 'Hide' : 'Show'} ${IDENTITY_LABELS[identity]}`}
            variant="secondary"
            size="sm"
            disabled={disabled}
            current={current}
            onClick={() => {
              if (current) {
                onChange(value.filter((entry) => entry !== identity));
                return;
              }
              onChange(
                CHARACTER_IDENTITIES.filter(
                  (entry) => entry === identity || selected.has(entry),
                ),
              );
            }}
          />
        );
      })}
    </div>
  );
}
