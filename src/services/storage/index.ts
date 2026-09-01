import { inMemoryFileStorage } from './inMemoryFileStorage';
import { localOpfsStorage } from './localOpfsStorage';
import type { FileStorageService } from './types';

let testOverride: FileStorageService | null = null;

export function setFileStorageForTests(storage: FileStorageService | null): void {
  testOverride = storage;
}

export function getFileStorageService(): FileStorageService {
  if (testOverride) {
    return testOverride;
  }

  if (import.meta.env.MODE === 'test') {
    return inMemoryFileStorage;
  }

  if (
    typeof navigator !== 'undefined' &&
    'storage' in navigator &&
    typeof navigator.storage.getDirectory === 'function'
  ) {
    return localOpfsStorage;
  }

  return inMemoryFileStorage;
}

export * from './types';
