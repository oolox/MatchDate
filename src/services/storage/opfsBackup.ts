import { unzipSync, zipSync } from 'fflate';
import {
  ASSETS_METADATA_DIR,
  CHARACTER_SETS_DIR,
  LIBRARY_PATH,
  OPFS_ROOT,
  OPFS_ROOT_LEGACY,
  PROMPTS_SESSIONS_DIR,
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

/** What a zip export or character-set copy keeps from the live store. */
export type OpfsBackupOptions = {
  /** When false, session files and session library rows are left out of the copy. */
  includeChat?: boolean;
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

function includeChats(options?: OpfsBackupOptions): boolean {
  return options?.includeChat !== false;
}

/** Session documents, including copies nested inside an earlier character-set snapshot. */
export function isChatDocumentPath(path: StoragePath): boolean {
  return path === PROMPTS_SESSIONS_DIR || path.includes(`${PROMPTS_SESSIONS_DIR}/`);
}

function isLibraryIndexPath(path: StoragePath): boolean {
  return path === LIBRARY_PATH || path.endsWith('/library.json');
}

/** Drop `kind: "session"` rows so a no-chat copy has no chat metadata. */
export function libraryBytesWithoutChats(bytes: Uint8Array): Uint8Array {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return bytes;
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { items?: unknown }).items)) {
    return bytes;
  }
  const index = parsed as { items: Array<{ kind?: unknown }> };
  const items = index.items.filter((item) => !item || item.kind !== 'session');
  return new TextEncoder().encode(JSON.stringify({ ...index, items }));
}

function filesForBackup(files: OpfsTreeFile[], options?: OpfsBackupOptions): OpfsTreeFile[] {
  if (includeChats(options)) {
    return files;
  }
  return files.flatMap((file) => {
    if (isChatDocumentPath(file.path)) {
      return [];
    }
    if (isLibraryIndexPath(file.path)) {
      return [{ ...file, bytes: libraryBytesWithoutChats(file.bytes) }];
    }
    return [file];
  });
}

export async function exportOpfsZipBlob(
  storage: FileStorageService,
  root: StoragePath = OPFS_BACKUP_ROOT,
  options?: OpfsBackupOptions,
): Promise<{ blob: Blob; fileCount: number }> {
  const files = filesForBackup(await collectOpfsTree(storage, root), options);
  const archive: Record<string, Uint8Array> = {};
  for (const file of files) {
    archive[toZipEntryPath(file.path)] = file.bytes;
  }
  return {
    blob: zipEntriesToBlob(archive),
    fileCount: files.length,
  };
}

/** Asset records for character-set saves. These are the save slots, not game state. */
async function characterSetAssetPaths(storage: FileStorageService): Promise<Set<StoragePath>> {
  const paths = new Set<StoragePath>();
  let entries: Awaited<ReturnType<FileStorageService['list']>> = [];
  try {
    entries = await storage.list(ASSETS_METADATA_DIR);
  } catch {
    return paths;
  }
  for (const entry of entries) {
    if (entry.kind !== 'file') {
      continue;
    }
    try {
      const parsed = JSON.parse(await storage.read(entry.path)) as { subtype?: unknown };
      if (parsed?.subtype === 'characterSet') {
        paths.add(entry.path);
      }
    } catch {
      // Leave non-set metadata eligible for replacement.
    }
  }
  return paths;
}

/**
 * Remove live files so a load can write the save as the whole store.
 * Character-set copies and their asset records stay, because a set snapshot
 * does not contain the save library.
 */
async function deleteReplacedStoreFiles(
  storage: FileStorageService,
  options: { preserveCharacterSets: boolean },
): Promise<void> {
  const preserveAssets = options.preserveCharacterSets
    ? await characterSetAssetPaths(storage)
    : new Set<StoragePath>();
  const files = await collectOpfsTree(storage);
  for (const file of files) {
    if (options.preserveCharacterSets && isCharacterSetStorePath(file.path)) {
      continue;
    }
    if (preserveAssets.has(file.path)) {
      continue;
    }
    await storage.delete(file.path);
  }
}

export async function importOpfsZip(
  storage: FileStorageService,
  zipBytes: Uint8Array | ArrayBuffer,
  root: StoragePath = OPFS_BACKUP_ROOT,
): Promise<{ written: number; skipped: number }> {
  const bytes =
    zipBytes instanceof Uint8Array ? zipBytes : new Uint8Array(zipBytes);
  const archive = unzipSync(bytes);
  const planned: Array<{ path: StoragePath; payload: Uint8Array }> = [];
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
      planned.push({ path, payload });
    } catch (error) {
      if (error instanceof StorageError && error.code === 'INVALID_PATH') {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  if (planned.length === 0) {
    return { written: 0, skipped };
  }

  await deleteReplacedStoreFiles(storage, { preserveCharacterSets: false });
  for (const file of planned) {
    await storage.writeBinary(file.path, file.payload);
  }

  return { written: planned.length, skipped };
}

export function defaultOpfsBackupFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `masterdater-opfs-${stamp}.zip`;
}

/** Stem used inside `MSTD-GAME-{filename}.zip`. Unsafe path characters are removed. */
export function gameSaveStem(fileName: string): string {
  return fileName.trim().replace(/[\\/:*?"<>|]/g, '');
}

export function gameBackupFilename(fileName: string): string {
  return `MSTD-GAME-${gameSaveStem(fileName)}.zip`;
}

function isCharacterSetStorePath(path: StoragePath): boolean {
  return path === CHARACTER_SETS_DIR || path.startsWith(`${CHARACTER_SETS_DIR}/`);
}

/** Path of one live file inside a character-set snapshot. */
export function characterSetSnapshotPath(rootPath: StoragePath, sourcePath: StoragePath): StoragePath {
  const root = rootPath.replace(/\/+$/, '');
  const relative = sourcePath.replace(/^\/+/, '');
  return `${root}/${relative}`;
}

/**
 * Copy the live store into `rootPath`, using the same files an export would zip.
 * Earlier character-set folders are left out so a set does not nest other sets.
 */
export async function copyOpfsStoreSnapshot(
  storage: FileStorageService,
  rootPath: StoragePath,
  options?: OpfsBackupOptions,
): Promise<{ fileCount: number }> {
  const files = await collectOpfsTree(storage);
  const snapshot = filesForBackup(
    files.filter((file) => !isCharacterSetStorePath(file.path)),
    options,
  );
  for (const file of snapshot) {
    await storage.writeBinary(characterSetSnapshotPath(rootPath, file.path), file.bytes);
  }
  return { fileCount: snapshot.length };
}

/** Live path for a file stored inside a character-set snapshot. */
export function livePathFromCharacterSetSnapshot(
  rootPath: StoragePath,
  snapshotPath: StoragePath,
): StoragePath | null {
  const root = rootPath.replace(/\/+$/, '');
  const prefix = `${root}/`;
  if (!snapshotPath.startsWith(prefix)) {
    return null;
  }
  const relative = snapshotPath.slice(prefix.length);
  const segments = relative.split('/').filter(Boolean);
  if (!relative || segments.length === 0 || segments.some((segment) => segment === '..' || segment === '.')) {
    return null;
  }
  return `/${segments.join('/')}`;
}

/**
 * Replace live game state with a character-set snapshot.
 * Files that are not in the snapshot are removed. Save slots stay.
 */
export async function restoreOpfsStoreSnapshot(
  storage: FileStorageService,
  rootPath: StoragePath,
): Promise<{ written: number }> {
  const files = await collectOpfsTree(storage, rootPath);
  const writes: Array<{ path: StoragePath; bytes: Uint8Array }> = [];
  for (const file of files) {
    const livePath = livePathFromCharacterSetSnapshot(rootPath, file.path);
    if (!livePath || isCharacterSetStorePath(livePath)) {
      continue;
    }
    writes.push({ path: livePath, bytes: file.bytes });
  }

  await deleteReplacedStoreFiles(storage, { preserveCharacterSets: true });
  for (const file of writes) {
    await storage.writeBinary(file.path, file.bytes);
  }
  return { written: writes.length };
}

/** A character-set folder under `/masterdater/characterSets/{id}`, never the live store. */
export function characterSetDeleteRoot(rootPath: StoragePath): StoragePath {
  const root = rootPath.replace(/\/+$/, '');
  const prefix = `${CHARACTER_SETS_DIR}/`;
  const id = root.startsWith(prefix) ? root.slice(prefix.length) : '';
  if (!id || id === '.' || id === '..' || id.includes('/') || id.includes('..')) {
    throw new StorageError('INVALID_PATH', 'Character set delete must stay inside characterSets');
  }
  return root;
}

/** Remove a character-set snapshot: copied files, then the snapshot folder. */
export async function deleteOpfsTree(
  storage: FileStorageService,
  rootPath: StoragePath,
): Promise<void> {
  const root = characterSetDeleteRoot(rootPath);
  const files = await collectOpfsTree(storage, root);
  for (const file of files) {
    if (file.path === root || file.path.startsWith(`${root}/`)) {
      await storage.delete(file.path);
    }
  }
  await storage.delete(root);
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
