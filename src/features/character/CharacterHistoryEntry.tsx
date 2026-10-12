import { IconButton } from '../../components/ui/IconButton/IconButton';
import type { CharacterHistoryEntry as CharacterHistoryEntryData } from '../../types/character';
import styles from './CharacterHistoryEntry.module.css';

export interface CharacterHistoryEntryProps {
  entry: CharacterHistoryEntryData;
  onEdit?: () => void;
  editDisabled?: boolean;
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
  onEdit,
  editDisabled = false,
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
        {onEdit || onRemove ? (
          <div className={styles.entryActions}>
            {onEdit ? (
              <IconButton
                icon="edit"
                label="Edit history entry"
                variant="secondary"
                size="md"
                className={styles.entryAction}
                disabled={editDisabled}
                onClick={onEdit}
              />
            ) : null}
            {onRemove ? (
              <IconButton
                icon="close"
                label="Remove history entry"
                variant="secondary"
                size="md"
                className={styles.entryAction}
                disabled={removeDisabled}
                onClick={onRemove}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      <p className={styles.summary}>{entry.summary}</p>
    </article>
  );
}
