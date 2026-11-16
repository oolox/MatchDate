import { useEffect, useState } from 'react';
import { Icon } from '../../ui/Icon/Icon';
import { LibraryCharacterThumb } from '../../library/LibraryList/LibraryCharacterThumb';
import { matchCharacterIdByName } from '../../../features/chat/attach/matchCharacterByName';
import { useOpenCharacterFromChat } from '../../../features/character/openCharacterFromChat';
import { SayPlayButton } from '../../../features/voice/SayPlayButton';
import { listCharacters } from '../../../services/storage/persistenceService';
import { useAppSelector } from '../../../store/hooks';
import { selectLibraryEpoch } from '../../../store/slices/appShellSlice';
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
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const name = speakerName.trim() || '…';
  const line = quote.trim();
  const explicitSpeakerId = speaker?.trim() || '';
  const [speakerId, setSpeakerId] = useState(explicitSpeakerId);

  useEffect(() => {
    if (explicitSpeakerId) {
      setSpeakerId(explicitSpeakerId);
      return;
    }
    let cancelled = false;
    void listCharacters()
      .then((items) => {
        if (cancelled) {
          return;
        }
        const match = matchCharacterIdByName(name, items);
        if (match) {
          setSpeakerId(match);
        }
      })
      .catch((error) => {
        console.info('Could not match quote speaker to a character', { name, error });
      });
    return () => {
      cancelled = true;
    };
  }, [explicitSpeakerId, libraryEpoch, name]);

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
        <div className={styles.nameRow}>
          <cite className={styles.name}>{name}</cite>
          <SayPlayButton speakerId={speakerId} text={line} enabled={complete} />
        </div>
        <p
          className={[styles.quote, line ? '' : styles.quoteEmpty].filter(Boolean).join(' ')}
        >
          {line || (complete ? '' : '…')}
        </p>
      </blockquote>
    </figure>
  );
}
