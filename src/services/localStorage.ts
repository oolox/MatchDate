export const LOCAL_STORAGE_KEYS = {
  librarySidebarWidthPx: 'matchdate.librarySidebarWidthPx',
} as const;

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

export function hasLocalStorageItem(key: string): boolean {
  return readRaw(key) !== null;
}

export function readPositiveWidthPx(key: string, fallback: number): number {
  const raw = readRaw(key);
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function writePositiveWidthPx(key: string, value: number, fallback: number): number {
  const next = Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
  writeRaw(key, String(next));
  return next;
}
