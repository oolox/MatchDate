import type { ChatAttachment } from '../../../types/chat';
import { IconButton } from '../../ui/IconButton/IconButton';
import styles from './AttachmentChips.module.css';

export interface AttachmentChipsProps {
  items: ChatAttachment[];
  onRemove?: (assetId: string) => void;
}

function chipLabel(item: ChatAttachment): string {
  return item.kind === 'character' ? `@${item.name}` : item.name;
}

export function AttachmentChips({ items, onRemove }: AttachmentChipsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className={styles.list} aria-label="Attachments">
      {items.map((item) => {
        const label = chipLabel(item);
        return (
          <li key={`${item.kind ?? 'text'}:${item.assetId}`} className={styles.chip}>
            <span className={styles.name} title={label}>
              {label}
            </span>
            {onRemove ? (
              <IconButton
                icon="close"
                label={`Remove ${label}`}
                variant="secondary"
                size="xs"
                onClick={() => onRemove(item.assetId)}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
