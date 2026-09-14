import { IconButton } from '../../components/ui/IconButton/IconButton';
import type { CharacterHistoryEntry as CharacterHistoryEntryData } from '../../types/character';
import styles from './CharacterHistoryEntry.module.css';

export interface CharacterHistoryEntryProps {
  entry: CharacterHistoryEntryData;
  onRemove?: () => void;
  removeDisabled?: boolean;
}

function formatHistoryWhen(at: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) {
    return at;
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function CharacterHistoryEntry({
  entry,
  onRemove,
  removeDisabled = false,
}: CharacterHistoryEntryProps) {
  const when = formatHistoryWhen(entry.at);
  return (
    <article className={styles.card} aria-label={`History ${when}`}>
      <div className={styles.header}>
        <time className={styles.when} dateTime={entry.at}>
          {when}
        </time>
        {onRemove ? (
          <IconButton
            icon="close"
            label="Remove history entry"
            variant="secondary"
            size="xs"
            className={styles.remove}
            disabled={removeDisabled}
            onClick={onRemove}
          />
        ) : null}
      </div>
      <p className={styles.summary}>{entry.summary}</p>
    </article>
  );
}
