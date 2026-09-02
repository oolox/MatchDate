import type { SavedImageRef } from '../../types/savedImage';
import { createId, nowIso } from '../../utils/id';
import { ensureImageAsset } from './assetPersistence';
import { getFileStorageService } from './index';
import { imageFileName, imagePath } from './paths';

export interface SaveImageOptions {
  name?: string;
}

export async function saveImage(
  blob: Blob,
  options: SaveImageOptions = {},
): Promise<SavedImageRef> {
  const storage = getFileStorageService();
  const id = createId();
  const fileName = imageFileName(id);
  const path = imagePath(id);

  await storage.writeBinary(path, blob);

  const ref: SavedImageRef = {
    id,
    fileName,
    path,
    createdAt: nowIso(),
    metadata: options.name ? { originalName: options.name } : undefined,
  };

  await ensureImageAsset(storage, ref, { name: options.name });
  return ref;
}

export async function loadImage(id: string): Promise<Blob> {
  const storage = getFileStorageService();
  return storage.readBinary(imagePath(id));
}

export async function deleteImage(id: string): Promise<void> {
  const storage = getFileStorageService();
  if (await storage.exists(imagePath(id))) {
    await storage.delete(imagePath(id));
  }
}
