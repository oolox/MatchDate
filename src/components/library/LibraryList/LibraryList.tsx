import type { LibraryItemMeta } from '../../../services/storage/types';
import { LibraryListItem } from './LibraryListItem';
import styles from './LibrarySidebar.module.css';

export interface LibraryListProps {
  items: LibraryItemMeta[];
  selectedId?: string | null;
  selectedKind?: string | null;
  isBusy?: boolean;
  onSelect: (item: LibraryItemMeta) => void;
  onToggleFavorite: (item: LibraryItemMeta) => void;
  onCopy?: (item: LibraryItemMeta) => void;
  onDelete: (item: LibraryItemMeta) => void;
}

export function LibraryList({
  items,
  selectedId = null,
  selectedKind = null,
  isBusy = false,
  onSelect,
  onToggleFavorite,
  onCopy,
  onDelete,
}: LibraryListProps) {
  if (items.length === 0) {
    return <p className={styles.empty}>No items yet.</p>;
  }

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <LibraryListItem
          key={`${item.kind}:${item.id}`}
          item={item}
          selected={item.id === selectedId && item.kind === selectedKind}
          disabled={isBusy}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
