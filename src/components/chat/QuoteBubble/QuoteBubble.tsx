import { Icon } from '../../ui/Icon/Icon';
import { LibraryCharacterThumb } from '../../library/LibraryList/LibraryCharacterThumb';
import { useOpenCharacterFromChat } from '../../../features/character/openCharacterFromChat';
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
  const openCharacter = useOpenCharacterFromChat();
  const name = speakerName.trim() || '…';
  const line = quote.trim();
  const speakerId = speaker?.trim() || '';
  const canOpen = Boolean(speakerId);

  return (
    <figure
      className={[styles.root, complete ? '' : styles.streaming].filter(Boolean).join(' ')}
      aria-label={`${name} said`}
      aria-busy={complete ? undefined : true}
    >
      {canOpen ? (
        <button
          type="button"
          className={styles.thumbButton}
          aria-label={`Open ${name}`}
          onClick={() => {
            void openCharacter(speakerId);
          }}
        >
          <LibraryCharacterThumb characterId={speakerId} name={name} />
        </button>
      ) : (
        <div className={styles.thumbSlot} aria-hidden="true">
          <span className={styles.placeholder} title={name}>
            <Icon name="character" className={styles.placeholderIcon} />
          </span>
        </div>
      )}
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
