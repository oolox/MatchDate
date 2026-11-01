import { Icon } from '../../ui/Icon/Icon';
import { LibraryCharacterThumb } from '../../library/LibraryList/LibraryCharacterThumb';
import styles from './QuoteBubble.module.css';

export interface QuoteBubbleProps {
  quote: string;
  speakerName: string;
  speaker?: string;
  complete?: boolean;
}

export function QuoteBubble({
  quote,
  speakerName,
  speaker,
  complete = true,
}: QuoteBubbleProps) {
  const name = speakerName.trim() || '…';
  const line = quote.trim();
  const hasSpeaker = Boolean(speaker?.trim());

  return (
    <figure
      className={[styles.root, complete ? '' : styles.streaming].filter(Boolean).join(' ')}
      aria-label={`${name} said`}
      aria-busy={complete ? undefined : true}
    >
      <div className={styles.thumbSlot} aria-hidden="true">
        {hasSpeaker ? (
          <LibraryCharacterThumb characterId={speaker!.trim()} name={name} />
        ) : (
          <span className={styles.placeholder} title={name}>
            <Icon name="character" className={styles.placeholderIcon} />
          </span>
        )}
      </div>
      <blockquote className={styles.quoteBody}>
        <cite className={styles.name}>{name}</cite>
        <p
          className={[styles.quote, line ? '' : styles.quoteEmpty].filter(Boolean).join(' ')}
        >
          {line || (complete ? '' : '…')}
        </p>
      </blockquote>
    </figure>
  );
}
