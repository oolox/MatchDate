import { LOCAL_STORAGE_KEYS } from './keys';

/** Sentinel stored when the user explicitly chooses no preprompt. */
export const PREPROMPT_NONE_VALUE = 'none';

/** Default library text asset name when preference is unset. */
export const DEFAULT_PREPROMPT_ASSET_NAME = 'MD-ValueModel.md';

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

/**
 * Raw preprompt preference from localStorage.
 * - `null` — key unset (resolve default MD-ValueModel.md if present)
 * - {@link PREPROMPT_NONE_VALUE} — user chose none
 * - otherwise — text asset id
 */
export function readPrepromptAssetId(): string | null {
  const raw = readRaw(LOCAL_STORAGE_KEYS.prepromptAssetId);
  if (raw === null) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed === PREPROMPT_NONE_VALUE) {
    return PREPROMPT_NONE_VALUE;
  }
  return trimmed;
}

/** Persist preprompt preference (`none` or a text asset id). */
export function writePrepromptAssetId(assetId: string): string {
  const next =
    !assetId.trim() || assetId.trim() === PREPROMPT_NONE_VALUE
      ? PREPROMPT_NONE_VALUE
      : assetId.trim();
  writeRaw(LOCAL_STORAGE_KEYS.prepromptAssetId, next);
  return next;
}
