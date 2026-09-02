import type { LibraryItemMeta } from '../../../services/storage/types';
import { LibraryListItem } from './LibraryListItem';
import styles from './LibrarySidebar.module.css';

export interface LibraryListProps {
  items: LibraryItemMeta[];
  selectedId?: string | null;
  selectedKind?: string | null;
  isBusy?: boolean;
  showKindLabels?: boolean;
  activePromptId?: string | null;
  onSelect: (item: LibraryItemMeta) => void;
  onActivateType?: (item: LibraryItemMeta) => void;
  onToggleFavorite: (item: LibraryItemMeta) => void;
  onDelete: (item: LibraryItemMeta) => void;
}

export function LibraryList({
  items,
  selectedId = null,
  selectedKind = null,
  isBusy = false,
  showKindLabels = false,
  activePromptId = null,
  onSelect,
  onActivateType,
  onToggleFavorite,
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
          showKindLabel={showKindLabels}
          typeActive={item.kind === 'prompt' && item.id === activePromptId}
          onSelect={onSelect}
          onActivateType={onActivateType}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
