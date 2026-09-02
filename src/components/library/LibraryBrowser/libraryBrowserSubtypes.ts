import type { OpfsDocSubtype } from '../../../types/opfsDoc';
import type { LibraryItemKind, LibraryItemMeta } from '../../../services/storage/types';
import type { LibraryBrowserTabId } from './libraryBrowserTabs';

export type LibraryBrowserSubtypeId = string;

export interface LibraryBrowserSubtypeTab {
  id: LibraryBrowserSubtypeId;
  label: string;
  kind?: LibraryItemKind | null;
  docSubtype?: OpfsDocSubtype | null;
}

const ASSETS_SUBTYPES: readonly LibraryBrowserSubtypeTab[] = [
  { id: 'image', label: 'IMAGE', docSubtype: 'image' },
  { id: 'video', label: 'VIDEO', docSubtype: 'video' },
  { id: 'text', label: 'TEXT', docSubtype: 'text' },
  { id: 'all', label: 'ALL', docSubtype: null },
] as const;

const CHARACTERS_SUBTYPES: readonly LibraryBrowserSubtypeTab[] = [
  { id: 'all', label: 'ALL', kind: 'character' },
];

const SESSIONS_SUBTYPES: readonly LibraryBrowserSubtypeTab[] = [
  { id: 'all', label: 'ALL', kind: null },
];

const PROMPTS_SUBTYPES: readonly LibraryBrowserSubtypeTab[] = [
  { id: 'all', label: 'ALL', kind: null },
];

const ALL_SUBTYPES: readonly LibraryBrowserSubtypeTab[] = [
  { id: 'all', label: 'ALL', kind: null },
];

export function subtypesForFolder(
  tabId: LibraryBrowserTabId,
): readonly LibraryBrowserSubtypeTab[] | null {
  if (tabId === 'sessions') {
    return SESSIONS_SUBTYPES;
  }
  if (tabId === 'all') {
    return ALL_SUBTYPES;
  }
  if (tabId === 'prompts') {
    return PROMPTS_SUBTYPES;
  }
  if (tabId === 'characters') {
    return CHARACTERS_SUBTYPES;
  }
  if (tabId === 'assets') {
    return ASSETS_SUBTYPES;
  }
  return null;
}

export function defaultSubtypeForLoadableKinds(
  tabId: LibraryBrowserTabId,
  subtypes: readonly LibraryBrowserSubtypeTab[],
): LibraryBrowserSubtypeId {
  if (tabId === 'assets') {
    return 'text';
  }
  return subtypes[0]?.id ?? 'all';
}

export function itemMatchesSubtypeTab(
  item: LibraryItemMeta,
  tab: LibraryBrowserSubtypeTab,
): boolean {
  if (tab.kind != null && item.kind !== tab.kind) {
    return false;
  }
  if (tab.docSubtype != null) {
    const effective = item.subtype ?? (item.kind === 'asset' ? 'image' : undefined);
    if (effective !== tab.docSubtype) {
      return false;
    }
  }
  return true;
}

export function subtypeTabsLabel(tabId: LibraryBrowserTabId): string {
  if (tabId === 'assets') {
    return 'Asset subtypes';
  }
  if (tabId === 'sessions') {
    return 'Chat subtypes';
  }
  if (tabId === 'all') {
    return 'All subtypes';
  }
  if (tabId === 'prompts') {
    return 'Prompt subtypes';
  }
  if (tabId === 'characters') {
    return 'Character subtypes';
  }
  return 'Subtypes';
}
