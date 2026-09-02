import { IconButton } from '../../ui/IconButton/IconButton';
import type { LibraryItemMeta } from '../../../services/storage/types';
import { formatLibraryListDateTime } from './libraryListDateTime';
import { getLibraryKindLabel } from './libraryListLabels';
import styles from './LibraryList.module.css';

export interface LibraryListItemProps {
  item: LibraryItemMeta;
  selected: boolean;
  disabled: boolean;
  showKindLabel?: boolean;
  typeActive?: boolean;
  onSelect: (item: LibraryItemMeta) => void;
  onActivateType?: (item: LibraryItemMeta) => void;
  onToggleFavorite: (item: LibraryItemMeta) => void;
  onDelete: (item: LibraryItemMeta) => void;
}

export function LibraryListItem({
  item,
  selected,
  disabled,
  showKindLabel = false,
  typeActive = false,
  onSelect,
  onActivateType,
  onToggleFavorite,
  onDelete,
}: LibraryListItemProps) {
  const updated = formatLibraryListDateTime(item.updatedAt);
  const kindLabel = showKindLabel ? getLibraryKindLabel(item.kind) : null;

  return (
    <li className={styles.item}>
      {item.kind === 'prompt' ? (
        <button
          type="button"
          className={[styles.typeTag, typeActive ? styles.typeTagActive : ''].filter(Boolean).join(' ')}
          aria-label={`Activate ${item.name}`}
          aria-pressed={typeActive}
          disabled={disabled || !onActivateType}
          onClick={() => onActivateType?.(item)}
        >
          SYS
        </button>
      ) : kindLabel ? (
        <span className={styles.kindBadge} aria-hidden="true">
          {kindLabel}
        </span>
      ) : null}
      <button
        type="button"
        className={styles.select}
        aria-label={item.name}
        aria-current={selected ? 'true' : undefined}
        disabled={disabled}
        onClick={() => onSelect(item)}
      >
        <span className={styles.name}>{item.name}</span>
        {updated ? (
          <span className={styles.meta} aria-hidden="true">
            <span>{updated}</span>
          </span>
        ) : null}
      </button>
      <IconButton
        className={item.isFavorite ? styles.favoriteActive : styles.itemAction}
        icon={item.isFavorite ? 'star-filled' : 'star'}
        label={item.isFavorite ? `Unfavorite ${item.name}` : `Favorite ${item.name}`}
        variant="secondary"
        size="md"
        disabled={disabled}
        aria-pressed={item.isFavorite}
        onClick={() => onToggleFavorite(item)}
      />
      <IconButton
        className={styles.itemAction}
        icon="close"
        label={`Delete ${item.name}`}
        variant="secondary"
        size="md"
        disabled={disabled}
        onClick={() => onDelete(item)}
      />
    </li>
  );
}
