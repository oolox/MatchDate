import type { LibraryItemKind, LibraryItemMeta } from './types';
import {
  assetFileName,
  assetPath,
  characterDocumentFileName,
  characterDocumentPath,
  sessionDocumentFileName,
  sessionDocumentPath,
} from './paths';

export function libraryItem(
  kind: LibraryItemKind,
  id: string,
  name: string,
  overrides: Partial<LibraryItemMeta> = {},
): LibraryItemMeta {
  let fileName: string;
  let path: string;
  if (kind === 'asset') {
    fileName = assetFileName(id);
    path = assetPath(id);
  } else if (kind === 'character') {
    fileName = characterDocumentFileName(id);
    path = characterDocumentPath(id);
  } else {
    fileName = sessionDocumentFileName(id);
    path = sessionDocumentPath(id);
  }

  return {
    kind,
    id,
    name,
    fileName,
    path,
    isFavorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
