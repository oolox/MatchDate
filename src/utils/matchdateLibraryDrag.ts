import type { LibraryItemKind, OpfsDocSubtype } from '../services/storage/types';

/** Custom MIME for MatchDate library → composer drags. */
export const MATCHDATE_LIBRARY_MIME = 'application/x-matchdate-library';

export interface MatchDateLibraryDragPayload {
  kind: LibraryItemKind;
  id: string;
  subtype?: OpfsDocSubtype;
}

export function canDragLibraryItem(item: {
  kind: LibraryItemKind;
  subtype?: OpfsDocSubtype;
}): boolean {
  if (item.kind === 'character') {
    return true;
  }
  return item.kind === 'asset' && item.subtype === 'text';
}

export function setMatchDateLibraryDragData(
  dataTransfer: DataTransfer,
  payload: MatchDateLibraryDragPayload,
): void {
  const id = payload.id.trim();
  if (!id) {
    return;
  }
  const body: MatchDateLibraryDragPayload = {
    kind: payload.kind,
    id,
    subtype: payload.subtype,
  };
  dataTransfer.setData(MATCHDATE_LIBRARY_MIME, JSON.stringify(body));
  dataTransfer.setData('text/plain', id);
  dataTransfer.effectAllowed = 'copy';
}

export function readMatchDateLibraryDragPayload(
  dataTransfer: DataTransfer | null | undefined,
): MatchDateLibraryDragPayload | null {
  if (!dataTransfer) {
    return null;
  }
  const raw = dataTransfer.getData(MATCHDATE_LIBRARY_MIME)?.trim();
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<MatchDateLibraryDragPayload>;
    if (
      typeof parsed.id === 'string' &&
      parsed.id.trim() &&
      typeof parsed.kind === 'string' &&
      parsed.kind.trim()
    ) {
      return {
        kind: parsed.kind,
        id: parsed.id.trim(),
        subtype: parsed.subtype,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function dataTransferHasMatchDateLibrary(
  dataTransfer: DataTransfer | null | undefined,
): boolean {
  if (!dataTransfer) {
    return false;
  }
  return Array.from(dataTransfer.types).includes(MATCHDATE_LIBRARY_MIME);
}
