import type { StoragePath } from './types';

export const OPFS_ROOT = '/matchdate';
export const PROMPTS_DIR = `${OPFS_ROOT}/prompts`;
export const PROMPTS_SESSIONS_DIR = `${PROMPTS_DIR}/sessions`;
/** System prompt presets (singular — not chat sessions). */
export const PROMPTS_PRESET_DIR = `${PROMPTS_DIR}/session`;
export const CONFIG_PATH = `${OPFS_ROOT}/config.json`;
export const LIBRARY_PATH = `${OPFS_ROOT}/library.json`;

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
