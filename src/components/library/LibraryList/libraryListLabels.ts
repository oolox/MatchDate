import type { LibraryItemKind } from '../../../services/storage/types';

export function getLibraryKindLabel(kind: LibraryItemKind): string {
  switch (kind) {
    case 'session':
      return 'Chat';
    case 'prompt':
      return 'Prompt';
    default:
      return kind;
  }
}
