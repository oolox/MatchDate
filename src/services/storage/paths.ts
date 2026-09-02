import type { StoragePath } from './types';

export const OPFS_ROOT = '/matchdate';
export const PROMPTS_DIR = `${OPFS_ROOT}/prompts`;
export const PROMPTS_SESSIONS_DIR = `${PROMPTS_DIR}/sessions`;
/** System prompt presets (singular — not chat sessions). */
export const PROMPTS_PRESET_DIR = `${PROMPTS_DIR}/session`;
export const CONFIG_PATH = `${OPFS_ROOT}/config.json`;
export const LIBRARY_PATH = `${OPFS_ROOT}/library.json`;
export const ASSETS_DIR = `${OPFS_ROOT}/assets`;
export const TEXT_ASSETS_DIR = `${ASSETS_DIR}/text`;

export function textFileName(id: string): string {
  return `matchDate-text-${id}.txt`;
}

export function textMetaFileName(id: string): string {
  return `matchDate-text-${id}.json`;
}

export function textPath(id: string): StoragePath {
  return `${TEXT_ASSETS_DIR}/${textFileName(id)}`;
}

export function textMetaPath(id: string): StoragePath {
  return `${TEXT_ASSETS_DIR}/${textMetaFileName(id)}`;
}

export function parseTextIdFromFileName(fileName: string): string | null {
  const prefix = 'matchDate-text-';
  if (!fileName.startsWith(prefix)) {
    return null;
  }
  if (fileName.endsWith('.txt')) {
    return fileName.slice(prefix.length, -'.txt'.length) || null;
  }
  if (fileName.endsWith('.json')) {
    return fileName.slice(prefix.length, -'.json'.length) || null;
  }
  return null;
}

export function presetFileName(slug: string): string {
  return `${slug}.json`;
}

export function presetPath(slug: string): StoragePath {
  return `${PROMPTS_PRESET_DIR}/${presetFileName(slug)}`;
}

export function sessionDocumentFileName(id: string): string {
  return `matchDate-${id}.json`;
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
