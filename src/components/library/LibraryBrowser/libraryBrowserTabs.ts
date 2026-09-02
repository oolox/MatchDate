import type { LibraryItemKind } from '../../../services/storage/types';
import type { LibraryListKind } from '../LibraryList/libraryListLabels';

export type LibraryBrowserTabId = 'all' | 'sessions' | 'prompts' | 'characters' | 'assets';

export const LIBRARY_BROWSER_TABS: ReadonlyArray<{
  id: LibraryBrowserTabId;
  label: string;
  kinds: readonly LibraryItemKind[] | null;
  listKind: LibraryListKind;
}> = [
  { id: 'sessions', label: 'CHATS', kinds: ['session'], listKind: 'session' },
  { id: 'prompts', label: 'PROMPT', kinds: ['prompt'], listKind: 'prompt' },
  { id: 'characters', label: 'CHARACTER', kinds: ['character'], listKind: 'character' },
  { id: 'assets', label: 'ASSETS', kinds: ['asset'], listKind: 'asset' },
  { id: 'all', label: 'ALL', kinds: null, listKind: 'all' },
] as const;

export function defaultTabForLoadableKinds(
  loadableKinds: readonly LibraryItemKind[],
): LibraryBrowserTabId {
  const loadable = new Set(loadableKinds);
  for (const tab of LIBRARY_BROWSER_TABS) {
    if (tab.kinds === null) {
      continue;
    }
    if (tab.kinds.some((kind) => loadable.has(kind))) {
      return tab.id;
    }
  }
  return 'sessions';
}

export function kindsForTab(tabId: LibraryBrowserTabId): readonly LibraryItemKind[] | null {
  return LIBRARY_BROWSER_TABS.find((tab) => tab.id === tabId)?.kinds ?? null;
}

export function listKindForTab(tabId: LibraryBrowserTabId): LibraryListKind {
  return LIBRARY_BROWSER_TABS.find((tab) => tab.id === tabId)?.listKind ?? 'all';
}
