import { useId, type ReactNode } from 'react';
import { IconButton } from '../../components/ui/IconButton/IconButton';
import styles from './CharacterCollapsibleCard.module.css';

export interface CharacterCollapsibleCardProps {
  title: string;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  children: ReactNode;
  /** When true, card grows to fill remaining vertical space while expanded. */
  fill?: boolean;
  /** When true, hide body content while collapsed (History). Attributes keep compact body. */
  hideBodyWhenCollapsed?: boolean;
  className?: string;
  bodyClassName?: string;
}

export function CharacterCollapsibleCard({
  title,
  expanded,
  onExpandedChange,
  children,
  fill = false,
  hideBodyWhenCollapsed = false,
  className,
  bodyClassName,
}: CharacterCollapsibleCardProps) {
  const panelId = useId();
  const caretIcon = expanded ? 'caret-up' : 'caret-down';
  const hideBody = hideBodyWhenCollapsed && !expanded;
  const cardClass = [
    styles.card,
    expanded ? styles.cardExpanded : styles.cardCollapsed,
    fill && expanded ? styles.cardFill : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const bodyClass = [styles.body, hideBody ? styles.bodyCollapsed : '', bodyClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={cardClass} aria-label={title}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        <IconButton
          icon={caretIcon}
          label={expanded ? `Collapse ${title}` : `Expand ${title}`}
          variant="secondary"
          size="xs"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => onExpandedChange(!expanded)}
        />
      </header>
      <div id={panelId} className={bodyClass}>
        {hideBody ? null : children}
      </div>
    </section>
  );
}
