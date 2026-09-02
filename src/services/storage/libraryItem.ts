import type { LibraryItemKind, LibraryItemMeta } from './types';
import { assetFileName, assetPath, presetFileName, presetPath, sessionDocumentFileName, sessionDocumentPath } from './paths';

export function libraryItem(
  kind: LibraryItemKind,
  id: string,
  name: string,
  overrides: Partial<LibraryItemMeta> = {},
): LibraryItemMeta {
  let fileName: string;
  let path: string;
  if (kind === 'prompt') {
    fileName = presetFileName(id);
    path = presetPath(id);
  } else if (kind === 'asset') {
    fileName = assetFileName(id);
    path = assetPath(id);
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
