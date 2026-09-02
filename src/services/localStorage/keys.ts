export const LOCAL_STORAGE_KEYS = {
  txtModel: 'matchdate.txtModel',
  librarySidebarWidthPx: 'matchdate.librarySidebarWidthPx',
  librarySortSession: 'matchdate.librarySort.session',
  librarySortPrompt: 'matchdate.librarySort.prompt',
  librarySortAsset: 'matchdate.librarySort.asset',
  librarySortAll: 'matchdate.librarySort.all',
} as const;

export type LocalStorageKey = (typeof LOCAL_STORAGE_KEYS)[keyof typeof LOCAL_STORAGE_KEYS];

export type LibrarySortListKind = 'session' | 'prompt' | 'asset' | 'all';

export function librarySortStorageKey(kind: LibrarySortListKind): LocalStorageKey {
  switch (kind) {
    case 'session':
      return LOCAL_STORAGE_KEYS.librarySortSession;
    case 'prompt':
      return LOCAL_STORAGE_KEYS.librarySortPrompt;
    case 'asset':
      return LOCAL_STORAGE_KEYS.librarySortAsset;
    case 'all':
      return LOCAL_STORAGE_KEYS.librarySortAll;
  }
}
