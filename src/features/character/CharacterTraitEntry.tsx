import { IconButton } from '../../components/ui/IconButton/IconButton';
import type { CharacterTrait as CharacterTraitData } from '../../types/character';
import styles from './CharacterTraitEntry.module.css';

export interface CharacterTraitEntryProps {
  trait: CharacterTraitData;
  onRemove?: () => void;
  removeDisabled?: boolean;
}

function formatTraitWhen(at: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) {
    return at;
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function CharacterTraitEntry({
  trait,
  onRemove,
  removeDisabled = false,
}: CharacterTraitEntryProps) {
  const when = formatTraitWhen(trait.at);
  return (
    <article className={styles.card} aria-label={`${trait.name}: ${trait.value}`}>
      <div className={styles.header}>
        <time className={styles.when} dateTime={trait.at}>
          {when}
        </time>
        {onRemove ? (
          <IconButton
            icon="close"
            label={`Remove trait ${trait.name}`}
            variant="secondary"
            size="xs"
            className={styles.remove}
            disabled={removeDisabled}
            onClick={onRemove}
          />
        ) : null}
      </div>
      <p className={styles.detail}>
        <span className={styles.name}>{trait.name}</span>
        <span className={styles.sep}>:</span>
        <span className={styles.value}>{trait.value}</span>
      </p>
    </article>
  );
}
