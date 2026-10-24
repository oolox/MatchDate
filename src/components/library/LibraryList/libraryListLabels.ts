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
};

export function getLibraryListLabels(kind: LibraryListKind): LibraryListLabels {
  return LABELS[kind];
}
