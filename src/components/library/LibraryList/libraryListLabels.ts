import type { LibraryItemKind } from '../../../services/storage/types';
import type { LibrarySortListKind } from '../../../services/localStorage/keys';

export type LibraryListKind = LibrarySortListKind;

export interface LibraryListLabels {
  title: string;
  loading: string;
  empty: string;
  ariaLabel: string;
}

const LABELS: Record<LibraryListKind, LibraryListLabels> = {
  session: {
    title: 'Chats',
    loading: 'Loading chats…',
    empty: 'No saved chats yet.',
    ariaLabel: 'Chats',
  },
  prompt: {
    title: 'Prompt',
    loading: 'Loading presets…',
    empty: 'No saved presets yet.',
    ariaLabel: 'Prompt',
  },
  character: {
    title: 'Character',
    loading: 'Loading characters…',
    empty: 'No saved characters yet.',
    ariaLabel: 'Character',
  },
  asset: {
    title: 'Asset',
    loading: 'Loading assets…',
    empty: 'No saved assets yet.',
    ariaLabel: 'Asset',
  },
  all: {
    title: 'All',
    loading: 'Loading library…',
    empty: 'No saved items yet.',
    ariaLabel: 'All library items',
  },
};

export function getLibraryListLabels(kind: LibraryListKind): LibraryListLabels {
  return LABELS[kind];
}

export function getLibraryKindLabel(kind: LibraryItemKind): string {
  switch (kind) {
    case 'session':
      return 'Chat';
    case 'prompt':
      return 'Prompt';
    case 'character':
      return 'Character';
    case 'asset':
      return 'Asset';
    default:
      return kind;
  }
}

export function getLibraryKindBadge(kind: LibraryItemKind): string | null {
  switch (kind) {
    case 'session':
      return 'CHAT';
    case 'asset':
      return 'AST';
    case 'character':
      return 'CHAR';
    case 'prompt':
      return null;
    default:
      return null;
  }
}
