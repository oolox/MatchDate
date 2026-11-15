import type { LibraryItemKind, OpfsDocSubtype } from '../services/storage/types';

/** Custom MIME for MasterDater library → composer drags. */
export const MASTERDATER_LIBRARY_MIME = 'application/x-masterdater-library';
/** Legacy MatchDate MIME — still accepted on drop. */
export const MATCHDATE_LIBRARY_MIME_LEGACY = 'application/x-matchdate-library';

export interface MasterDaterLibraryDragPayload {
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
  return (
    item.kind === 'asset' &&
    (item.subtype === 'text' || item.subtype === 'image' || item.subtype === 'voice')
  );
}

export function setMasterDaterLibraryDragData(
  dataTransfer: DataTransfer,
  payload: MasterDaterLibraryDragPayload,
): void {
  const id = payload.id.trim();
  if (!id) {
    return;
  }
  const body: MasterDaterLibraryDragPayload = {
    kind: payload.kind,
    id,
    subtype: payload.subtype,
  };
  dataTransfer.setData(MASTERDATER_LIBRARY_MIME, JSON.stringify(body));
  dataTransfer.setData('text/plain', id);
  dataTransfer.effectAllowed = 'copy';
}

function parsePayload(raw: string): MasterDaterLibraryDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<MasterDaterLibraryDragPayload>;
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

export function readMasterDaterLibraryDragPayload(
  dataTransfer: DataTransfer | null | undefined,
): MasterDaterLibraryDragPayload | null {
  if (!dataTransfer) {
    return null;
  }
  const raw =
    dataTransfer.getData(MASTERDATER_LIBRARY_MIME)?.trim() ||
    dataTransfer.getData(MATCHDATE_LIBRARY_MIME_LEGACY)?.trim();
  if (!raw) {
    return null;
  }
  return parsePayload(raw);
}

export function dataTransferHasMasterDaterLibrary(
  dataTransfer: DataTransfer | null | undefined,
): boolean {
  if (!dataTransfer) {
    return false;
  }
  const types = Array.from(dataTransfer.types);
  return (
    types.includes(MASTERDATER_LIBRARY_MIME) ||
    types.includes(MATCHDATE_LIBRARY_MIME_LEGACY)
  );
}
