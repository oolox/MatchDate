import { collectOpfsTree } from './opfsBackup';
import {
  OPFS_ROOT,
  OPFS_ROOT_LEGACY,
  rewriteBrandText,
  toCanonicalStoragePath,
} from './paths';
import type { FileStorageService, StoragePath } from './types';

const LEGACY_LOCAL_STORAGE_KEYS: Array<{ legacy: string; next: string }> = [
  { legacy: 'matchdate.txtModel', next: 'masterdater.txtModel' },
  { legacy: 'matchdate.prepromptAssetId', next: 'masterdater.prepromptAssetId' },
  { legacy: 'matchdate.librarySidebarWidthPx', next: 'masterdater.librarySidebarWidthPx' },
  { legacy: 'matchdate.librarySort.session', next: 'masterdater.librarySort.session' },
  { legacy: 'matchdate.librarySort.prompt', next: 'masterdater.librarySort.prompt' },
  { legacy: 'matchdate.librarySort.character', next: 'masterdater.librarySort.character' },
  { legacy: 'matchdate.librarySort.asset', next: 'masterdater.librarySort.asset' },
];

function isTextLikePath(path: StoragePath): boolean {
  return (
    path.endsWith('.json') ||
    path.endsWith('.txt') ||
    path.endsWith('.md') ||
    path.endsWith('.css') ||
    path.endsWith('.html')
  );
}

/** Copy legacy localStorage keys into MasterDater keys (never wipe legacy). */
export function migrateBrandLocalStorage(
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
): void {
  for (const { legacy, next } of LEGACY_LOCAL_STORAGE_KEYS) {
    try {
      const existing = storage.getItem(next);
      if (existing != null && existing !== '') {
        continue;
      }
      const previous = storage.getItem(legacy);
      if (previous == null) {
        continue;
      }
      storage.setItem(next, previous);
    } catch {
      // Ignore quota / private-mode failures; app continues with defaults.
    }
  }
}

async function migrateTreeFromRoot(
  storage: FileStorageService,
  root: StoragePath,
): Promise<void> {
  let files;
  try {
    files = await collectOpfsTree(storage, root);
  } catch {
    return;
  }

  for (const file of files) {
    const canonical = toCanonicalStoragePath(file.path);
    let bytes = file.bytes;
    let textChanged = false;
    if (isTextLikePath(file.path) || isTextLikePath(canonical)) {
      const text = new TextDecoder().decode(file.bytes);
      const rewritten = rewriteBrandText(text);
      if (rewritten !== text) {
        bytes = new TextEncoder().encode(rewritten);
        textChanged = true;
      }
    }

    const needsMove = canonical !== file.path;
    if (!needsMove && !textChanged) {
      continue;
    }

    if (needsMove) {
      if (!(await storage.exists(canonical))) {
        await storage.writeBinary(canonical, bytes);
      } else if (textChanged) {
        // Dest exists; still rewrite brand strings in the canonical file.
        await storage.writeBinary(canonical, bytes);
      }
      await storage.delete(file.path);
    } else {
      await storage.writeBinary(canonical, bytes);
    }
  }
}

/**
 * Soft-migrate MatchDate OPFS + localStorage brand to MasterDater.
 * Safe to run on every bootstrap; no-ops when already canonical.
 */
export async function migrateBrandStorage(storage: FileStorageService): Promise<void> {
  migrateBrandLocalStorage();
  await migrateTreeFromRoot(storage, OPFS_ROOT_LEGACY);
  await migrateTreeFromRoot(storage, OPFS_ROOT);
}
