import type { AssetDocument } from '../../types/opfsDoc';
import { OPFS_SCHEMA_VERSION } from '../../types/opfsDoc';
import { nowIso } from '../../utils/id';
import { assetDocumentFromImageRef, assetDocumentFromTextRef, assetDocumentFromVideoRef } from './assetDocument';
import { parseAsset } from './libraryRegistry';
import { removeLibraryItem, upsertLibraryItem } from './libraryIndex';
import { assetPath } from './paths';
import type { FileStorageService } from './types';
import { StorageError } from './types';
import type { SavedImageRef } from '../../types/savedImage';
import type { SavedVideoRef } from '../../types/savedVideo';
import type { SavedTextRef } from '../../types/savedText';

export async function saveAssetDocument(
  storage: FileStorageService,
  document: AssetDocument,
): Promise<AssetDocument> {
  const id = document.id.trim();
  if (!id) {
    throw new StorageError('PARSE_ERROR', 'asset id is required');
  }

  const now = nowIso();
  const path = assetPath(id);
  let createdAt = document.createdAt || now;
  if (await storage.exists(path)) {
    try {
      const existing = parseAsset(await storage.read(path), path);
      createdAt = existing.createdAt;
    } catch (error) {
      console.info('Could not read existing asset createdAt; keeping document value', {
        id,
        error,
      });
    }
  }

  const saved: AssetDocument = {
    ...document,
    schemaVersion: OPFS_SCHEMA_VERSION,
    type: 'asset',
    id,
    createdAt,
    updatedAt: now,
  };

  await storage.write(path, JSON.stringify(saved, null, 2));
  await upsertLibraryItem(storage, {
    kind: 'asset',
    id: saved.id,
    name: saved.name,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
    type: 'asset',
    subtype: saved.subtype,
  });
  return saved;
}

export async function loadAssetDocument(
  storage: FileStorageService,
  id: string,
): Promise<AssetDocument> {
  const primary = assetPath(id);
  return parseAsset(await storage.read(primary), primary);
}

export async function tryLoadAssetDocument(
  storage: FileStorageService,
  id: string,
): Promise<AssetDocument | null> {
  const primary = assetPath(id);
  if (!(await storage.exists(primary))) {
    return null;
  }
  try {
    return parseAsset(await storage.read(primary), primary);
  } catch {
    return null;
  }
}

export async function deleteAssetDocument(
  storage: FileStorageService,
  id: string,
): Promise<void> {
  const path = assetPath(id);
  if (await storage.exists(path)) {
    await storage.delete(path);
  }
  await removeLibraryItem(storage, 'asset', id);
}

export async function ensureTextAsset(
  storage: FileStorageService,
  ref: SavedTextRef,
  options?: { name?: string },
): Promise<AssetDocument> {
  const existing = await tryLoadAssetDocument(storage, ref.id);
  if (existing) {
    return existing;
  }
  return saveAssetDocument(storage, assetDocumentFromTextRef(ref, options));
}

export async function ensureImageAsset(
  storage: FileStorageService,
  ref: SavedImageRef,
  options?: { name?: string },
): Promise<AssetDocument> {
  const existing = await tryLoadAssetDocument(storage, ref.id);
  if (existing) {
    return existing;
  }
  return saveAssetDocument(storage, assetDocumentFromImageRef(ref, options));
}

export async function ensureVideoAsset(
  storage: FileStorageService,
  ref: SavedVideoRef,
  options?: { name?: string },
): Promise<AssetDocument> {
  const existing = await tryLoadAssetDocument(storage, ref.id);
  if (existing) {
    return existing;
  }
  return saveAssetDocument(storage, assetDocumentFromVideoRef(ref, options));
}
