import type { CharacterTrait as CharacterTraitData } from '../../types/character';
import styles from './CharacterTraitEntry.module.css';

export interface CharacterTraitEntryProps {
  trait: CharacterTraitData;
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

export function CharacterTraitEntry({ trait }: CharacterTraitEntryProps) {
  const when = formatTraitWhen(trait.at);
  return (
    <article className={styles.card} aria-label={`${trait.name}: ${trait.value}`}>
      <time className={styles.when} dateTime={trait.at}>
        {when}
      </time>
      <div className={styles.body}>
        <h3 className={styles.name}>{trait.name}</h3>
        <p className={styles.value}>{trait.value}</p>
      </div>
    </article>
  );
}
