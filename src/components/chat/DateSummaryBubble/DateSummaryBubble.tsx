import { useEffect, useState } from 'react';
import { Icon } from '../../ui/Icon/Icon';
import { IconButton } from '../../ui/IconButton/IconButton';
import { LibraryCharacterThumb } from '../../library/LibraryList/LibraryCharacterThumb';
import { useOpenCharacterFromChat } from '../../../features/character/openCharacterFromChat';
import type { DateSummaryCharacterEntry } from '../../../features/chat/attach/dateSummaryAttach';
import { loadCharacter } from '../../../services/storage/persistenceService';
import { useAppSelector } from '../../../store/hooks';
import { selectLibraryEpoch } from '../../../store/slices/appShellSlice';
import styles from './DateSummaryBubble.module.css';

export interface DateSummaryBubbleProps {
  shortSummary: string;
  location: string;
  justification: string;
  character: DateSummaryCharacterEntry[];
  dateTime: string;
  chatId?: string;
  complete?: boolean;
}

function tryParseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatOneLocalDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Localize a single ISO instant or an inclusive range (`… to …` / `… – …`). */
function formatLocalDateTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const rangeParts = trimmed.split(/\s+(?:to|–|-|—)\s+/i);
  if (rangeParts.length >= 2) {
    const dates = rangeParts.map((part) => tryParseDate(part));
    if (dates.every((date): date is Date => date != null)) {
      return dates.map(formatOneLocalDateTime).join(' – ');
    }
  }
  const single = tryParseDate(trimmed);
  return single ? formatOneLocalDateTime(single) : trimmed;
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function formatScore(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  return String(Math.round(value));
}

export function DateSummaryBubble({
  shortSummary,
  location,
  justification,
  character,
  dateTime,
  chatId,
  complete = true,
}: DateSummaryBubbleProps) {
  const openCharacter = useOpenCharacterFromChat();
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const entries = character.filter((entry) => entry.id.trim());
  const ids = entries.map((entry) => entry.id.trim());
  const [namesById, setNamesById] = useState<Record<string, string>>({});
  const [compatibilityOpen, setCompatibilityOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const characterIds = character.map((entry) => entry.id.trim()).filter(Boolean);
    if (characterIds.length === 0) {
      setNamesById({});
      return;
    }

    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        characterIds.map(async (characterId) => {
          try {
            const loaded = await loadCharacter(characterId);
            if (!cancelled && loaded.name?.trim()) {
              next[characterId] = loaded.name.trim();
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
  }, [character, libraryEpoch]);

  const nameLine =
    ids
      .map((id) => firstName(namesById[id] ?? '') || id.slice(-8))
      .filter(Boolean)
      .join(' & ') || (complete ? '' : '…');
  const when = formatLocalDateTime(dateTime) || (complete ? '' : '…');
  const where = location.trim();
  const summary = shortSummary.trim();
  const why = justification.trim();

  return (
    <figure
      className={[styles.root, complete ? '' : styles.streaming].filter(Boolean).join(' ')}
      aria-label={`Date summary · ${nameLine || 'characters'} · ${when || 'date'}`}
      aria-busy={complete ? undefined : true}
      data-chat-id={chatId?.trim() || undefined}
    >
      <blockquote className={styles.body}>
        <cite className={styles.names}>{nameLine}</cite>
        <p className={styles.dateTime}>{when}</p>
        {where || !complete ? (
          <p className={[styles.location, where ? '' : styles.empty].filter(Boolean).join(' ')}>
            {where || '…'}
          </p>
        ) : null}
        <p
          className={[styles.shortSummary, summary ? '' : styles.empty].filter(Boolean).join(' ')}
        >
          {summary || (complete ? '' : '…')}
        </p>

        {entries.length > 0 ? (
          <div className={styles.reviews}>
            {entries.map((entry) => {
              const id = entry.id.trim();
              const name = namesById[id] ?? id.slice(-8);
              const displayName = firstName(name) || name;
              const review = entry.dateReview.trim();
              const hasScores = entry.dateScore > 0 || entry.dateFit > 0;
              return (
                <section key={id} className={styles.reviewCard}>
                  <button
                    type="button"
                    className={styles.thumbButton}
                    aria-label={`Open ${displayName}`}
                    onClick={() => {
                      void openCharacter(id);
                    }}
                  >
                    <LibraryCharacterThumb characterId={id} name={name} />
                  </button>
                  <div className={styles.reviewBody}>
                    <header className={styles.reviewHeader}>
                      <button
                        type="button"
                        className={styles.reviewNameButton}
                        onClick={() => {
                          void openCharacter(id);
                        }}
                      >
                        {displayName}
                      </button>
                      {hasScores ? (
                        <p className={styles.scores}>
                          <span>Score {formatScore(entry.dateScore)}/10</span>
                          <span aria-hidden="true"> · </span>
                          <span>Fit {formatScore(entry.dateFit)}/10</span>
                        </p>
                      ) : null}
                    </header>
                    {review || !complete ? (
                      <p
                        className={[styles.review, review ? '' : styles.empty]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {review || '…'}
                      </p>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className={styles.thumbSlot} aria-hidden="true">
            <span className={styles.placeholder}>
              <Icon name="character" className={styles.placeholderIcon} />
            </span>
          </div>
        )}

        <div className={styles.compatibilityBox}>
          <div className={styles.compatibilityHeader}>
            <IconButton
              icon={compatibilityOpen ? 'caret-up' : 'caret-down'}
              label={compatibilityOpen ? 'Hide analysis' : 'Show analysis'}
              variant="secondary"
              size="xs"
              className={styles.compatibilityCaret}
              onClick={() => setCompatibilityOpen((open) => !open)}
            />
            <p className={styles.sectionLabel}>ANALYSIS</p>
          </div>
          {compatibilityOpen ? (
            <p
              className={[styles.justification, why ? '' : styles.empty]
                .filter(Boolean)
                .join(' ')}
            >
              {why || (complete ? '' : '…')}
            </p>
          ) : null}
        </div>
      </blockquote>
    </figure>
  );
}
