import type { StoragePath } from './types';

/** Canonical OPFS root (MasterDater). */
export const OPFS_ROOT = '/masterdater';
/** Legacy MatchDate root — read/migrate only. */
export const OPFS_ROOT_LEGACY = '/matchdate';

/** Canonical file basename brand prefix. */
export const FILE_BRAND_PREFIX = 'masterDater-';
/** Legacy MatchDate file basename prefix. */
export const FILE_BRAND_PREFIX_LEGACY = 'matchDate-';

export const PROMPTS_DIR = `${OPFS_ROOT}/prompts`;
export const PROMPTS_SESSIONS_DIR = `${PROMPTS_DIR}/sessions`;
/** System prompt presets (singular — not chat sessions). */
export const PROMPTS_PRESET_DIR = `${PROMPTS_DIR}/session`;
export const CONFIG_PATH = `${OPFS_ROOT}/config.json`;
export const LIBRARY_PATH = `${OPFS_ROOT}/library.json`;
export const ASSETS_DIR = `${OPFS_ROOT}/assets`;
export const ASSETS_IMG_DIR = `${ASSETS_DIR}/img`;
export const ASSETS_VID_DIR = `${ASSETS_DIR}/vid`;
export const TEXT_ASSETS_DIR = `${ASSETS_DIR}/text`;
export const VOICE_ASSETS_DIR = `${ASSETS_DIR}/voice`;
export const ASSETS_METADATA_DIR = `${ASSETS_DIR}/metadata`;
export const CHARACTERS_DIR = `${OPFS_ROOT}/characters`;

/** Rewrite legacy root + file brand prefixes in a storage path. */
export function toCanonicalStoragePath(path: StoragePath): StoragePath {
  let next = path.replace(/\\/g, '/');
  if (next === OPFS_ROOT_LEGACY || next.startsWith(`${OPFS_ROOT_LEGACY}/`)) {
    next = `${OPFS_ROOT}${next.slice(OPFS_ROOT_LEGACY.length)}`;
  }
  return next.split('/').map((segment) => {
    if (!segment) {
      return segment;
    }
    if (segment.startsWith(FILE_BRAND_PREFIX_LEGACY)) {
      return `${FILE_BRAND_PREFIX}${segment.slice(FILE_BRAND_PREFIX_LEGACY.length)}`;
    }
    return segment;
  }).join('/');
}

/** Rewrite legacy brand strings inside JSON/text payloads. */
export function rewriteBrandText(content: string): string {
  return content
    .split(OPFS_ROOT_LEGACY).join(OPFS_ROOT)
    .split(FILE_BRAND_PREFIX_LEGACY).join(FILE_BRAND_PREFIX);
}

export function characterDocumentFileName(id: string): string {
  return `${FILE_BRAND_PREFIX}char-${id}.json`;
}

export function imageFileName(id: string): string {
  return `${FILE_BRAND_PREFIX}img-${id}.png`;
}

export function videoFileName(id: string): string {
  return `${FILE_BRAND_PREFIX}vid-${id}.mp4`;
}

export function assetFileName(id: string): string {
  return `${FILE_BRAND_PREFIX}asset-${id}.json`;
}

export function imagePath(id: string): StoragePath {
  return `${ASSETS_IMG_DIR}/${imageFileName(id)}`;
}

export function videoPath(id: string): StoragePath {
  return `${ASSETS_VID_DIR}/${videoFileName(id)}`;
}

export function assetPath(id: string): StoragePath {
  return `${ASSETS_METADATA_DIR}/${assetFileName(id)}`;
}

export function characterDocumentPath(id: string): StoragePath {
  return `${CHARACTERS_DIR}/${characterDocumentFileName(id)}`;
}

export function textFileName(id: string): string {
  return `${FILE_BRAND_PREFIX}text-${id}.txt`;
}

export function textMetaFileName(id: string): string {
  return `${FILE_BRAND_PREFIX}text-${id}.json`;
}

export function textPath(id: string): StoragePath {
  return `${TEXT_ASSETS_DIR}/${textFileName(id)}`;
}

export function textMetaPath(id: string): StoragePath {
  return `${TEXT_ASSETS_DIR}/${textMetaFileName(id)}`;
}

export function voiceFileName(id: string): string {
  return `${FILE_BRAND_PREFIX}voice-${id}.bin`;
}

export function voicePath(id: string): StoragePath {
  return `${VOICE_ASSETS_DIR}/${voiceFileName(id)}`;
}

function idFromPrefixedFileName(
  fileName: string,
  kind: 'text' | 'char' | 'asset' | 'img' | 'vid' | 'voice' | 'session',
  extensions: string[],
): string | null {
  const prefixes = [
    `${FILE_BRAND_PREFIX}${kind === 'session' ? '' : `${kind}-`}`,
    `${FILE_BRAND_PREFIX_LEGACY}${kind === 'session' ? '' : `${kind}-`}`,
  ];
  // session files are masterDater-{id}.json / matchDate-{id}.json (no extra kind segment)
  const sessionPrefixes = [FILE_BRAND_PREFIX, FILE_BRAND_PREFIX_LEGACY];
  const usePrefixes = kind === 'session' ? sessionPrefixes : prefixes;

  for (const prefix of usePrefixes) {
    if (!fileName.startsWith(prefix)) {
      continue;
    }
    for (const ext of extensions) {
      if (fileName.endsWith(ext)) {
        const id = fileName.slice(prefix.length, -ext.length);
        return id || null;
      }
    }
  }
  return null;
}

export function parseTextIdFromFileName(fileName: string): string | null {
  return idFromPrefixedFileName(fileName, 'text', ['.txt', '.json']);
}

export function parseCharacterIdFromFileName(fileName: string): string | null {
  return idFromPrefixedFileName(fileName, 'char', ['.json']);
}

export function parseAssetIdFromFileName(fileName: string): string | null {
  return idFromPrefixedFileName(fileName, 'asset', ['.json']);
}

export function parseSessionIdFromFileName(fileName: string): string | null {
  return idFromPrefixedFileName(fileName, 'session', ['.json']);
}

export function presetFileName(slug: string): string {
  return `${slug}.json`;
}

export function presetPath(slug: string): StoragePath {
  return `${PROMPTS_PRESET_DIR}/${presetFileName(slug)}`;
}

export function sessionDocumentFileName(id: string): string {
  return `${FILE_BRAND_PREFIX}${id}.json`;
}

export function sessionDocumentPath(id: string): StoragePath {
  return `${PROMPTS_SESSIONS_DIR}/${sessionDocumentFileName(id)}`;
}

export function normalizePath(path: StoragePath): string[] {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (segment === '..') {
        throw new StoragePathError();
      }
      return segment;
    });
}

export class StoragePathError extends Error {
  constructor() {
    super('Invalid storage path');
    this.name = 'StoragePathError';
  }
}
