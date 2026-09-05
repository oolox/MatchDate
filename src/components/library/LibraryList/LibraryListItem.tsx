import type { DragEvent } from 'react';
import { IconButton } from '../../ui/IconButton/IconButton';
import type { LibraryItemMeta } from '../../../services/storage/types';
import {
  canDragLibraryItem,
  setMatchDateLibraryDragData,
} from '../../../utils/matchdateLibraryDrag';
import { formatLibraryListDateTime } from './libraryListDateTime';
import { getLibraryKindBadge, getLibraryKindLabel } from './libraryListLabels';
import { LibraryAssetThumb } from './LibraryAssetThumb';
import { LibraryTextThumb } from './LibraryTextThumb';
import { LibraryVideoThumb } from './LibraryVideoThumb';
import styles from './LibraryList.module.css';

const ASSET_NAME_MAX = 40;

function truncateAssetName(name: string): string {
  if (name.length <= ASSET_NAME_MAX) {
    return name;
  }
  return `${name.slice(0, ASSET_NAME_MAX - 1)}…`;
}

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
  const kindBadge = showKindLabel ? getLibraryKindBadge(item.kind) : null;
  const isAsset = item.kind === 'asset';
  const displayName = isAsset ? truncateAssetName(item.name) : item.name;

  const assetSubtype = item.subtype ?? (isAsset ? 'image' : undefined);
  const canDrag = canDragLibraryItem(item);

  const handleDragStart = (event: DragEvent<HTMLElement>) => {
    if (!canDrag) {
      return;
    }
    setMatchDateLibraryDragData(event.dataTransfer, {
      kind: item.kind,
      id: item.id,
      subtype: item.subtype,
    });
  };

  return (
    <li
      className={[styles.item, selected ? styles.itemSelected : ''].filter(Boolean).join(' ')}
      draggable={canDrag}
      onDragStart={canDrag ? handleDragStart : undefined}
    >
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
      ) : kindBadge ? (
        <span className={styles.kindBadge} aria-hidden="true">
          {kindBadge}
        </span>
      ) : kindLabel ? (
        <span className={styles.kindBadge} aria-hidden="true">
          {kindLabel}
        </span>
      ) : null}
      {isAsset && assetSubtype === 'text' ? <LibraryTextThumb name={item.name} /> : null}
      {isAsset && assetSubtype === 'image' ? <LibraryAssetThumb name={item.name} /> : null}
      {isAsset && assetSubtype === 'video' ? <LibraryVideoThumb name={item.name} /> : null}
      <button
        type="button"
        className={styles.select}
        aria-label={item.name}
        aria-current={selected ? 'true' : undefined}
        disabled={disabled}
        onClick={() => onSelect(item)}
      >
        <span className={[styles.name, isAsset ? styles.assetName : ''].filter(Boolean).join(' ')}>
          {displayName}
        </span>
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
