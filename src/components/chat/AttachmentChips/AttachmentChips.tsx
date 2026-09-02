import type { ChatTextAttachment } from '../../../types/chat';
import { IconButton } from '../../ui/IconButton/IconButton';
import styles from './AttachmentChips.module.css';

export interface AttachmentChipsProps {
  items: ChatTextAttachment[];
  onRemove?: (assetId: string) => void;
}

export function AttachmentChips({ items, onRemove }: AttachmentChipsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className={styles.list} aria-label="Attached files">
      {items.map((item) => (
        <li key={item.assetId} className={styles.chip}>
          <span className={styles.name} title={item.name}>
            {item.name}
          </span>
          {onRemove ? (
            <IconButton
              icon="close"
              label={`Remove ${item.name}`}
              variant="secondary"
              size="xs"
              onClick={() => onRemove(item.assetId)}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
