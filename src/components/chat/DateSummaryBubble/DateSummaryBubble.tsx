import { useEffect, useState } from 'react';
import { Icon } from '../../ui/Icon/Icon';
import { LibraryCharacterThumb } from '../../library/LibraryList/LibraryCharacterThumb';
import { useOpenCharacterFromChat } from '../../../features/character/openCharacterFromChat';
import { loadCharacter } from '../../../services/storage/persistenceService';
import { useAppSelector } from '../../../store/hooks';
import { selectLibraryEpoch } from '../../../store/slices/appShellSlice';
import styles from './DateSummaryBubble.module.css';

export interface DateSummaryBubbleProps {
  shortSummary: string;
  transcript: string;
  justification: string;
  characters: string[];
  dateTime: string;
  chatId?: string;
  complete?: boolean;
}

function formatLocalDateTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return trimmed;
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function DateSummaryBubble({
  shortSummary,
  transcript,
  justification,
  characters,
  dateTime,
  chatId,
  complete = true,
}: DateSummaryBubbleProps) {
  const openCharacter = useOpenCharacterFromChat();
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const ids = characters.map((id) => id.trim()).filter(Boolean);
  const [namesById, setNamesById] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const characterIds = characters.map((id) => id.trim()).filter(Boolean);
    if (characterIds.length === 0) {
      setNamesById({});
      return;
    }

    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        characterIds.map(async (characterId) => {
          try {
            const character = await loadCharacter(characterId);
            if (!cancelled && character.name?.trim()) {
              next[characterId] = character.name.trim();
            }
          } catch {
            // Keep fallback label when the sheet is missing.
          }
        }),
      );
      if (!cancelled) {
        setNamesById(next);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [characters, libraryEpoch]);

  const nameLine =
    ids
      .map((id) => firstName(namesById[id] ?? '') || id.slice(-8))
      .filter(Boolean)
      .join(' & ') || (complete ? '' : '…');
  const when = formatLocalDateTime(dateTime) || (complete ? '' : '…');
  const summary = shortSummary.trim();
  const log = transcript.trim();
  const why = justification.trim();

  return (
    <figure
      className={[styles.root, complete ? '' : styles.streaming].filter(Boolean).join(' ')}
      aria-label={`Date summary · ${nameLine || 'characters'} · ${when || 'date'}`}
      aria-busy={complete ? undefined : true}
      data-chat-id={chatId?.trim() || undefined}
    >
      <div className={styles.thumbs}>
        {ids.length > 0 ? (
          ids.map((characterId) => {
            const name = namesById[characterId] ?? characterId;
            return (
              <button
                key={characterId}
                type="button"
                className={styles.thumbButton}
                aria-label={`Open ${name}`}
                onClick={() => {
                  void openCharacter(characterId);
                }}
              >
                <LibraryCharacterThumb characterId={characterId} name={name} />
              </button>
            );
          })
        ) : (
          <div className={styles.thumbSlot} aria-hidden="true">
            <span className={styles.placeholder}>
              <Icon name="character" className={styles.placeholderIcon} />
            </span>
          </div>
        )}
      </div>
      <blockquote className={styles.body}>
        <cite className={styles.names}>{nameLine}</cite>
        <p className={styles.dateTime}>{when}</p>
        <p
          className={[styles.shortSummary, summary ? '' : styles.empty].filter(Boolean).join(' ')}
        >
          {summary || (complete ? '' : '…')}
        </p>
        <p className={styles.sectionLabel}>Transcript</p>
        <p className={[styles.transcript, log ? '' : styles.empty].filter(Boolean).join(' ')}>
          {log || (complete ? '' : '…')}
        </p>
        <p className={styles.sectionLabel}>Compatibility</p>
        <p
          className={[styles.justification, why ? '' : styles.empty].filter(Boolean).join(' ')}
        >
          {why || (complete ? '' : '…')}
        </p>
      </blockquote>
    </figure>
  );
}
