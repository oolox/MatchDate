import type { ReactNode } from 'react';
import type { LibraryItemMeta } from '../../../services/storage/types';
import { LibraryList } from './LibraryList';
import styles from './LibrarySidebar.module.css';

export type LibraryTabId = 'all' | 'sessions' | 'prompts';

export interface LibrarySidebarProps {
  title?: string;
  tab: LibraryTabId;
  searchQuery: string;
  items: LibraryItemMeta[];
  selectedId?: string | null;
  selectedKind?: string | null;
  activePromptId?: string | null;
  isBusy?: boolean;
  headerActions?: ReactNode;
  onTabChange: (tab: LibraryTabId) => void;
  onSearchChange: (query: string) => void;
  onSelect: (item: LibraryItemMeta) => void;
  onActivateType?: (item: LibraryItemMeta) => void;
  onToggleFavorite: (item: LibraryItemMeta) => void;
  onDelete: (item: LibraryItemMeta) => void;
}

const TABS: Array<{ id: LibraryTabId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'sessions', label: 'Chats' },
  { id: 'prompts', label: 'Prompts' },
];

export function LibrarySidebar({
  title = 'Library',
  tab,
  searchQuery,
  items,
  selectedId,
  selectedKind,
  activePromptId,
  isBusy = false,
  headerActions,
  onTabChange,
  onSearchChange,
  onSelect,
  onActivateType,
  onToggleFavorite,
  onDelete,
}: LibrarySidebarProps) {
  return (
    <aside className={styles.sidebar} aria-label={title}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
          <h2 className={styles.title}>{title}</h2>
          {headerActions}
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Library filter">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              className={[styles.tab, tab === entry.id ? styles.tabActive : ''].filter(Boolean).join(' ')}
              onClick={() => onTabChange(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className={styles.search}
          value={searchQuery}
          placeholder="Search library…"
          aria-label="Search library"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </header>
      <div className={styles.listWrap}>
        <LibraryList
          items={items}
          selectedId={selectedId}
          selectedKind={selectedKind}
          isBusy={isBusy}
          showKindLabels={tab === 'all'}
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
