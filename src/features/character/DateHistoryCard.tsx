import { useId, type ReactNode } from 'react';
import { DatePlanBubble } from '../../components/chat/DatePlanBubble/DatePlanBubble';
import { IconButton } from '../../components/ui/IconButton/IconButton';
import styles from './DateHistoryCard.module.css';

export interface DateHistoryCardProps {
  dateTime: string;
  location: string;
  characterIds?: string[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  children: ReactNode;
  onRemove?: () => void;
  removeDisabled?: boolean;
}

export function DateHistoryCard({
  dateTime,
  location,
  characterIds = [],
  expanded,
  onExpandedChange,
  children,
  onRemove,
  removeDisabled = false,
}: DateHistoryCardProps) {
  const panelId = useId();
  const when = dateTime.trim() || 'Date';
  const where = location.trim();
  const label = [when, where].filter(Boolean).join(' · ');

  return (
    <article className={styles.card} aria-label={`Date · ${label}`}>
      <header className={styles.header}>
        <DatePlanBubble
          dateTime={dateTime}
          location={location}
          characterIds={characterIds}
          complete
          embedded
        />
        <div className={styles.headerActions}>
          {onRemove ? (
            <IconButton
              icon="close"
              label="Remove date"
              variant="secondary"
              size="xs"
              className={styles.removeButton}
              disabled={removeDisabled}
              onClick={onRemove}
            />
          ) : null}
          <IconButton
            icon={expanded ? 'caret-up' : 'caret-down'}
            label={expanded ? 'Collapse date' : 'Expand date'}
            variant="secondary"
            size="xs"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => onExpandedChange(!expanded)}
          />
        </div>
      </header>
      <div
        id={panelId}
        className={[styles.body, expanded ? '' : styles.bodyCollapsed]
          .filter(Boolean)
          .join(' ')}
      >
        {expanded ? children : null}
      </div>
    </article>
  );
}
