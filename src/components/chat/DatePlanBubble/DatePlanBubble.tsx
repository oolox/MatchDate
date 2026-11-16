import { useEffect, useState } from 'react';
import { loadCharacter } from '../../../services/storage/persistenceService';
import { useAppSelector } from '../../../store/hooks';
import { selectLibraryEpoch } from '../../../store/slices/appShellSlice';
import styles from './DatePlanBubble.module.css';

export interface DatePlanBubbleProps {
  dateTime: string;
  location: string;
  characterIds?: string[];
  complete?: boolean;
  /**
   * When true, render names/dateTime/location only (no outer card chrome).
   * Used inside DateHistoryCard on the character sheet.
   */
  embedded?: boolean;
}

function tryParseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLocalDateTime(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const single = tryParseDate(trimmed);
  return single
    ? single.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : trimmed;
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function DatePlanBubble({
  dateTime,
  location,
  characterIds = [],
  complete = true,
  embedded = false,
}: DatePlanBubbleProps) {
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const ids = characterIds.map((id) => id.trim()).filter(Boolean);
  const idsKey = ids.join('|');
  const [namesById, setNamesById] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) {
      setNamesById({});
      return;
    }

    void (async () => {
      const next: Record<string, string> = {};
      await Promise.all(
        ids.map(async (characterId) => {
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
  }, [idsKey, libraryEpoch]);

  const nameLine =
    ids
      .map((id) => firstName(namesById[id] ?? '') || id.slice(-8))
      .filter(Boolean)
      .join(' & ') || (complete ? '' : '…');
  const when = formatLocalDateTime(dateTime) || (complete ? '' : '…');
  const where = location.trim() || (complete ? '' : '…');

  const meta = (
    <>
      {nameLine ? <p className={styles.names}>{nameLine}</p> : null}
      {when ? <p className={styles.dateTime}>{when}</p> : null}
      {where ? <p className={styles.location}>{where}</p> : null}
    </>
  );

  if (embedded) {
    return (
      <div
        className={styles.meta}
        aria-label={`Date plan · ${nameLine || 'characters'} · ${when || 'date'}`}
        aria-busy={!complete}
      >
        {meta}
      </div>
    );
  }

  return (
    <article
      className={[styles.root, !complete ? styles.streaming : ''].filter(Boolean).join(' ')}
      aria-label={`Date plan · ${nameLine || 'characters'} · ${when || 'date'}`}
      aria-busy={!complete}
    >
      {meta}
    </article>
  );
}
