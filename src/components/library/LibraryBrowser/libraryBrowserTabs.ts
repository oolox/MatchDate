import type { LibraryItemKind } from '../../../services/storage/types';
import type { LibraryListKind } from '../LibraryList/libraryListLabels';

export type LibraryBrowserTabId = 'sessions' | 'prompts' | 'characters' | 'assets';

export const LIBRARY_BROWSER_TABS: ReadonlyArray<{
  id: LibraryBrowserTabId;
  label: string;
  kinds: readonly LibraryItemKind[];
  listKind: LibraryListKind;
}> = [
  { id: 'sessions', label: 'CHATS', kinds: ['session'], listKind: 'session' },
  { id: 'characters', label: 'CHARACTER', kinds: ['character'], listKind: 'character' },
  { id: 'prompts', label: 'PROMPT', kinds: ['prompt'], listKind: 'prompt' },
  { id: 'assets', label: 'ASSETS', kinds: ['asset'], listKind: 'asset' },
] as const;

export function defaultTabForLoadableKinds(
  loadableKinds: readonly LibraryItemKind[],
): LibraryBrowserTabId {
  const loadable = new Set(loadableKinds);
  for (const tab of LIBRARY_BROWSER_TABS) {
    if (tab.kinds.some((kind) => loadable.has(kind))) {
      return tab.id;
    }
  }
  return 'sessions';
}

export function kindsForTab(tabId: LibraryBrowserTabId): readonly LibraryItemKind[] {
  return LIBRARY_BROWSER_TABS.find((tab) => tab.id === tabId)?.kinds ?? ['session'];
}

export function listKindForTab(tabId: LibraryBrowserTabId): LibraryListKind {
  return LIBRARY_BROWSER_TABS.find((tab) => tab.id === tabId)?.listKind ?? 'session';
}
