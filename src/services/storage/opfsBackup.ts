import { unzipSync, zipSync } from 'fflate';
import {
  OPFS_ROOT,
  OPFS_ROOT_LEGACY,
  rewriteBrandText,
  toCanonicalStoragePath,
} from './paths';
import type { FileStorageService, StoragePath } from './types';
import { StorageError } from './types';

export const OPFS_BACKUP_ROOT = OPFS_ROOT;

export type OpfsTreeFile = {
  path: StoragePath;
  bytes: Uint8Array;
};

/** Recursive walk of OPFS (or any FileStorageService) under `root`. */
export async function collectOpfsTree(
  storage: FileStorageService,
  root: StoragePath = OPFS_BACKUP_ROOT,
): Promise<OpfsTreeFile[]> {
  const files: OpfsTreeFile[] = [];

  async function walk(directory: StoragePath): Promise<void> {
    const entries = await storage.list(directory);
    for (const entry of entries) {
      if (entry.kind === 'directory') {
        await walk(entry.path);
        continue;
      }
      const blob = await storage.readBinary(entry.path);
      const buffer = new Uint8Array(await blob.arrayBuffer());
      files.push({ path: entry.path, bytes: buffer });
    }
  }

  await walk(root);

  const byPath = new Map<string, OpfsTreeFile>();
  for (const file of files) {
    byPath.set(file.path, file);
  }
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

/** Zip entry path: strip leading slash so zip tools show masterdater/... */
export function toZipEntryPath(storagePath: StoragePath): string {
  return storagePath.replace(/^\/+/, '');
}

export function zipEntriesToBlob(entries: Record<string, Uint8Array>): Blob {
  const zipped = zipSync(entries, { level: 6 });
  const copy = new Uint8Array(zipped.byteLength);
  copy.set(zipped);
  return new Blob([copy], { type: 'application/zip' });
}

/**
 * Normalize a zip entry to an absolute storage path under OPFS_BACKUP_ROOT.
 * Accepts legacy `/matchdate` + `matchDate-*` entries and canonicalizes them.
 * Rejects `..` and paths outside MatchDate/MasterDater roots.
 */
export function zipEntryToStoragePath(
  entryName: string,
  root: StoragePath = OPFS_BACKUP_ROOT,
): StoragePath {
  const trimmed = entryName.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!trimmed || trimmed.endsWith('/')) {
    throw new StorageError('INVALID_PATH', `Skipping directory entry: ${entryName}`);
  }
  const segments = trimmed.split('/').filter(Boolean);
  if (segments.some((s) => s === '..' || s === '.')) {
    throw new StorageError('INVALID_PATH', `Unsafe zip entry: ${entryName}`);
  }

  const absolute = `/${segments.join('/')}`;
  const allowedRoots = [root, OPFS_ROOT, OPFS_ROOT_LEGACY].map((value) =>
    value.endsWith('/') ? value.slice(0, -1) : value,
  );
  const ok = allowedRoots.some(
    (rootPrefix) => absolute === rootPrefix || absolute.startsWith(`${rootPrefix}/`),
  );
  if (!ok) {
    throw new StorageError(
      'INVALID_PATH',
      `Zip entry outside ${OPFS_ROOT}: ${entryName}`,
    );
  }
  return toCanonicalStoragePath(absolute);
}

export async function exportOpfsZipBlob(
  storage: FileStorageService,
  root: StoragePath = OPFS_BACKUP_ROOT,
): Promise<{ blob: Blob; fileCount: number }> {
  const files = await collectOpfsTree(storage, root);
  const archive: Record<string, Uint8Array> = {};
  for (const file of files) {
    archive[toZipEntryPath(file.path)] = file.bytes;
  }
  return {
    blob: zipEntriesToBlob(archive),
    fileCount: files.length,
  };
}

export async function importOpfsZip(
  storage: FileStorageService,
  zipBytes: Uint8Array | ArrayBuffer,
  root: StoragePath = OPFS_BACKUP_ROOT,
): Promise<{ written: number; skipped: number }> {
  const bytes =
    zipBytes instanceof Uint8Array ? zipBytes : new Uint8Array(zipBytes);
  const archive = unzipSync(bytes);
  let written = 0;
  let skipped = 0;

  for (const [entryName, data] of Object.entries(archive)) {
    if (entryName.endsWith('/')) {
      skipped += 1;
      continue;
    }
    try {
      const path = zipEntryToStoragePath(entryName, root);
      let payload: Uint8Array = data;
      if (path.endsWith('.json') || path.endsWith('.txt')) {
        const text = new TextDecoder().decode(data);
        const rewritten = rewriteBrandText(text);
        if (rewritten !== text) {
          payload = new TextEncoder().encode(rewritten);
        }
      }
      await storage.writeBinary(path, payload);
      written += 1;
    } catch (error) {
      if (error instanceof StorageError && error.code === 'INVALID_PATH') {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  return { written, skipped };
}

export function defaultOpfsBackupFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `masterdater-opfs-${stamp}.zip`;
}

/** Save a blob to the user's disk (File System Access API or download fallback). */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const w = window as Window & {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{ description?: string; accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle>;
  };

  if (typeof w.showSaveFilePicker === 'function') {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'ZIP archive',
            accept: { 'application/zip': ['.zip'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      // User cancel — don't fall through to forced download.
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      // Unsupported / denied — fall back.
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Open a single .zip via hidden file input. */
export function pickZipFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,application/zip';
    input.style.display = 'none';
    const cleanup = () => {
      input.remove();
    };
    input.addEventListener('change', () => {
      const file = input.files?.[0] ?? null;
      cleanup();
      resolve(file);
    });
    // If the picker is cancelled, `change` may not fire; resolve null on focus return.
    const onFocus = () => {
      window.removeEventListener('focus', onFocus);
      window.setTimeout(() => {
        if (!input.isConnected) {
          return;
        }
        if (!input.files?.length) {
          cleanup();
          resolve(null);
        }
      }, 300);
    };
    window.addEventListener('focus', onFocus);
    document.body.appendChild(input);
    input.click();
  });
}
