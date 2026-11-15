import { useId, useState } from 'react';
import { IconButton } from '../../ui/IconButton/IconButton';
import { QuoteBubble } from '../QuoteBubble/QuoteBubble';
import type { DateTranscriptSegment } from '../../../features/chat/attach/dateTranscriptAttach';
import styles from './DateTranscriptBubble.module.css';

export interface DateTranscriptBubbleProps {
  description: string;
  dateTime: string;
  segments: DateTranscriptSegment[];
  complete?: boolean;
  /** When true (default), header stays visible and a caret toggles the scene body. */
  collapsible?: boolean;
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

export function DateTranscriptBubble({
  description,
  dateTime,
  segments,
  complete = true,
  collapsible = true,
}: DateTranscriptBubbleProps) {
  const detailsId = useId();
  const [expanded, setExpanded] = useState(true);
  const showDetails = !collapsible || expanded;
  const when = formatLocalDateTime(dateTime) || (complete ? '' : '…');
  const outing = description.trim() || (complete ? '' : '…');

  const rootClass = [
    styles.root,
    !complete ? styles.streaming : '',
    collapsible && !expanded ? styles.collapsed : '',
  ]
    .filter(Boolean)
    .join(' ');

  const header = (
    <div className={styles.headerRow}>
      <div className={styles.headerMeta}>
        <p className={styles.label}>Date</p>
        {when ? <p className={styles.dateTime}>{when}</p> : null}
        {outing ? <p className={styles.description}>{outing}</p> : null}
      </div>
      {collapsible ? (
        <IconButton
          icon={expanded ? 'caret-up' : 'caret-down'}
          label={expanded ? 'Collapse date transcript' : 'Expand date transcript'}
          variant="secondary"
          size="xs"
          className={styles.collapseCaret}
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((open) => !open)}
        />
      ) : null}
    </div>
  );

  return (
    <article
      className={rootClass}
      aria-label={`Date transcript · ${when || 'date'}`}
      aria-busy={!complete}
    >
      {header}
      {showDetails ? (
        <div
          id={collapsible ? detailsId : undefined}
          className={styles.segments}
        >
          {segments.length === 0 && !complete ? (
            <p className={styles.placeholder}>…</p>
          ) : null}
          {segments.map((segment, index) => {
            if (segment.type === 'text') {
              return (
                <p key={`text-${index}`} className={styles.narration}>
                  {segment.text || (!complete ? '…' : '')}
                </p>
              );
            }
            const isLast = index === segments.length - 1;
            return (
              <QuoteBubble
                key={`quote-${index}-${segment.id ?? segment.speakerName}`}
                quote={segment.quote}
                speakerName={segment.speakerName}
                speaker={segment.speaker}
                complete={complete || !isLast}
              />
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
