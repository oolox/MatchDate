import { librarySortStorageKey, type LibrarySortListKind } from './keys';

export type LibrarySortField = 'name' | 'starred' | 'updatedAt' | 'createdAt';
export type LibrarySortDirection = 'asc' | 'desc';

export interface LibrarySortPreference {
  field: LibrarySortField;
  direction: LibrarySortDirection;
}

const LIBRARY_SORT_DEFAULTS: Record<LibrarySortListKind, LibrarySortPreference> = {
  session: { field: 'updatedAt', direction: 'desc' },
  prompt: { field: 'name', direction: 'asc' },
  asset: { field: 'updatedAt', direction: 'desc' },
  all: { field: 'updatedAt', direction: 'desc' },
};

const LIBRARY_SORT_FIELDS: LibrarySortField[] = ['name', 'starred', 'updatedAt', 'createdAt'];

function readRaw(key: string): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // best-effort
  }
}

function isLibrarySortField(value: unknown): value is LibrarySortField {
  return typeof value === 'string' && LIBRARY_SORT_FIELDS.includes(value as LibrarySortField);
}

function isLibrarySortDirection(value: unknown): value is LibrarySortDirection {
  return value === 'asc' || value === 'desc';
}

export function getDefaultLibrarySort(kind: LibrarySortListKind): LibrarySortPreference {
  return { ...LIBRARY_SORT_DEFAULTS[kind] };
}

export function readLibrarySortPreference(kind: LibrarySortListKind): LibrarySortPreference {
  const fallback = getDefaultLibrarySort(kind);
  const raw = readRaw(librarySortStorageKey(kind));
  if (!raw) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<LibrarySortPreference>;
    if (!isLibrarySortField(parsed.field) || !isLibrarySortDirection(parsed.direction)) {
      return fallback;
    }
    return { field: parsed.field, direction: parsed.direction };
  } catch {
    return fallback;
  }
}

export function writeLibrarySortPreference(
  kind: LibrarySortListKind,
  preference: LibrarySortPreference,
): LibrarySortPreference {
  const next: LibrarySortPreference = {
    field: isLibrarySortField(preference.field)
      ? preference.field
      : getDefaultLibrarySort(kind).field,
    direction: isLibrarySortDirection(preference.direction)
      ? preference.direction
      : getDefaultLibrarySort(kind).direction,
  };
  writeRaw(librarySortStorageKey(kind), JSON.stringify(next));
  return next;
}

export function loadLibrarySortState(): Record<LibrarySortListKind, LibrarySortPreference> {
  return {
    session: readLibrarySortPreference('session'),
    prompt: readLibrarySortPreference('prompt'),
    asset: readLibrarySortPreference('asset'),
    all: readLibrarySortPreference('all'),
  };
}
