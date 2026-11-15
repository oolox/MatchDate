export const LOCAL_STORAGE_KEYS = {
  txtModel: 'masterdater.txtModel',
  prepromptAssetId: 'masterdater.prepromptAssetId',
  librarySidebarWidthPx: 'masterdater.librarySidebarWidthPx',
  librarySortSession: 'masterdater.librarySort.session',
  librarySortPrompt: 'masterdater.librarySort.prompt',
  librarySortCharacter: 'masterdater.librarySort.character',
  librarySortAsset: 'masterdater.librarySort.asset',
} as const;

export type LocalStorageKey = (typeof LOCAL_STORAGE_KEYS)[keyof typeof LOCAL_STORAGE_KEYS];

export type LibrarySortListKind = 'session' | 'prompt' | 'character' | 'asset';

export function librarySortStorageKey(kind: LibrarySortListKind): LocalStorageKey {
  switch (kind) {
    case 'session':
      return LOCAL_STORAGE_KEYS.librarySortSession;
    case 'prompt':
      return LOCAL_STORAGE_KEYS.librarySortPrompt;
    case 'character':
      return LOCAL_STORAGE_KEYS.librarySortCharacter;
    case 'asset':
      return LOCAL_STORAGE_KEYS.librarySortAsset;
  }
}
