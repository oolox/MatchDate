import type { CharacterHistoryEntry as CharacterHistoryEntryData } from '../../types/character';
import styles from './CharacterHistoryEntry.module.css';

export interface CharacterHistoryEntryProps {
  entry: CharacterHistoryEntryData;
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

export function CharacterHistoryEntry({ entry }: CharacterHistoryEntryProps) {
  const when = formatHistoryWhen(entry.at);
  return (
    <article className={styles.card} aria-label={`History ${when}`}>
      <time className={styles.when} dateTime={entry.at}>
        {when}
      </time>
      <p className={styles.summary}>{entry.summary}</p>
    </article>
  );
}
