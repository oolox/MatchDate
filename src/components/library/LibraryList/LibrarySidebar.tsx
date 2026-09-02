import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ListSubHeader } from '../../ui/ListSubHeader';
import { IconTextInput } from '../../ui/IconTextInput';
import type { LibraryItemMeta } from '../../../services/storage/types';
import { searchLibraryItems } from '../../../services/library/searchLibraryItems';
import { getLibraryListLabels, type LibraryListKind } from './libraryListLabels';
import { LibraryList } from './LibraryList';
import { LibraryListSortSelect } from './LibraryListSortSelect';
import { useLibraryListSort } from './useLibraryListSort';
import styles from './LibrarySidebar.module.css';

export interface LibrarySidebarSubHeaderExtras {
  sortSelect: ReactNode | null;
  searchInput: ReactNode | null;
}

export interface LibrarySidebarProps {
  kind: LibraryListKind;
  items: LibraryItemMeta[];
  selectedId?: string | null;
  selectedKind?: string | null;
  activePromptId?: string | null;
  storageReady: boolean;
  isBusy: boolean;
  header?: ReactNode;
  subHeader?: ReactNode | ((extras: LibrarySidebarSubHeaderExtras) => ReactNode);
  chromeKey?: string;
  showKindLabels?: boolean;
  headerActions?: ReactNode;
  sortSelectClassName?: string;
  searchInputClassName?: string;
  onSelect: (item: LibraryItemMeta) => void;
  onActivateType?: (item: LibraryItemMeta) => void;
  onToggleFavorite: (item: LibraryItemMeta) => void;
  onDelete: (item: LibraryItemMeta) => void;
}

export function LibrarySidebar({
  kind,
  items,
  selectedId = null,
  selectedKind = null,
  activePromptId = null,
  storageReady,
  isBusy,
  header,
  subHeader,
  chromeKey,
  showKindLabels = false,
  headerActions,
  sortSelectClassName,
  searchInputClassName,
  onSelect,
  onActivateType,
  onToggleFavorite,
  onDelete,
}: LibrarySidebarProps) {
  const labels = getLibraryListLabels(kind);
  const sidebarRef = useRef<HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { field, direction, setField, toggleDirection, sortedItems } = useLibraryListSort(kind);

  useEffect(() => {
    setSearchQuery('');
  }, [chromeKey]);

  const visibleItems = useMemo(() => {
    return sortedItems(searchLibraryItems(items, searchQuery));
  }, [items, searchQuery, sortedItems]);

  const subSubHeaderSortSelect = storageReady ? (
    <LibraryListSortSelect
      className={sortSelectClassName}
      field={field}
      direction={direction}
      disabled={isBusy}
      onFieldChange={setField}
      onToggleDirection={toggleDirection}
    />
  ) : null;

  const subSubHeaderSearchInput = storageReady ? (
    <IconTextInput
      className={searchInputClassName}
      aria-label={`Search ${labels.title}`}
      icon="search"
      value={searchQuery}
      disabled={isBusy}
      placeholder="SEARCH"
      onChange={setSearchQuery}
    />
  ) : null;

  const resolvedSubHeader =
    typeof subHeader === 'function'
      ? subHeader({ sortSelect: subSubHeaderSortSelect, searchInput: subSubHeaderSearchInput })
      : subHeader;

  return (
    <aside ref={sidebarRef} className={styles.sidebar} aria-label={labels.ariaLabel}>
      <ListSubHeader
        trailing={storageReady ? headerActions : null}
      >
        {header ?? <h3 className={styles.title}>{labels.title}</h3>}
      </ListSubHeader>
      {resolvedSubHeader}
      <div className={styles.listWrap}>
        <LibraryList
          items={visibleItems}
          selectedId={selectedId}
          selectedKind={selectedKind}
          isBusy={isBusy}
          showKindLabels={showKindLabels}
          activePromptId={activePromptId}
          onSelect={onSelect}
          onActivateType={onActivateType}
          onToggleFavorite={onToggleFavorite}
          onDelete={onDelete}
        />
      </div>
    </aside>
  );
}
