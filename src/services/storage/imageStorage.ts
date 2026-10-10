import {
  normalizeSavedImageMetadata,
  type SavedImageMetadata,
  type SavedImageRef,
} from '../../types/savedImage';
import { createId, nowIso } from '../../utils/id';
import { assetDocumentFromImageRef } from './assetDocument';
import {
  ensureImageAsset,
  saveAssetDocument,
  tryLoadAssetDocument,
} from './assetPersistence';
import { getFileStorageService } from './index';
import { imageFileName, imagePath } from './paths';

export interface SaveImageOptions {
  metadata?: SavedImageMetadata;
  /** Human catalog label for IMAGE rows. */
  name?: string;
}

async function ensurePngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') {
    return blob;
  }

  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return blob;
  }

  try {
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      if (!context) {
        return blob;
      }
      context.drawImage(bitmap, 0, 0);

      const pngBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), 'image/png');
      });

      return pngBlob ?? blob;
    } finally {
      bitmap.close();
    }
  } catch (error) {
    console.info('Could not normalize image to PNG; storing original blob', { error });
    return blob;
  }
}

async function readImagePixels(
  blob: Blob,
): Promise<{ width: number; height: number } | undefined> {
  if (typeof createImageBitmap !== 'function') {
    return undefined;
  }
  try {
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return undefined;
  }
}

/**
 * Writes a PNG blob and registers an IMAGE asset (best-effort catalog registration).
 */
export async function saveImage(
  blob: Blob,
  options: SaveImageOptions = {},
): Promise<SavedImageRef> {
  const storage = getFileStorageService();
  const id = createId();
  const fileName = imageFileName(id);
  const path = imagePath(id);
  const pngBlob = await ensurePngBlob(blob);
  const pixels = await readImagePixels(pngBlob);
  const metadata = normalizeSavedImageMetadata({
    ...options.metadata,
    ...(options.name?.trim() ? { originalName: options.name.trim() } : {}),
    ...(pixels ?? {}),
  });

  await storage.writeBinary(path, pngBlob);

  const ref: SavedImageRef = {
    id,
    fileName,
    path,
    createdAt: nowIso(),
    ...(metadata ? { metadata } : {}),
  };

  try {
    await ensureImageAsset(storage, ref, { name: options.name });
  } catch (error) {
    console.info('Could not register image asset metadata', { id, error });
  }

  return ref;
}

/** Overwrite an existing IMAGE blob and refresh catalog metadata. */
export async function updateImage(
  id: string,
  blob: Blob,
  options: SaveImageOptions = {},
): Promise<SavedImageRef> {
  const storage = getFileStorageService();
  const existing = await tryLoadAssetDocument(storage, id);
  const path =
    existing?.blobPath && existing.blobPath.startsWith('/')
      ? existing.blobPath
      : imagePath(id);
  const fileName = existing?.fileName?.trim() || imageFileName(id);
  const pngBlob = await ensurePngBlob(blob);
  const pixels = await readImagePixels(pngBlob);

  const previousMeta =
    existing?.metadata && typeof existing.metadata === 'object'
      ? (existing.metadata as SavedImageMetadata)
      : undefined;
  const metadata = normalizeSavedImageMetadata({
    ...previousMeta,
    ...options.metadata,
    ...(options.name?.trim() ? { originalName: options.name.trim() } : {}),
    ...(pixels ?? {}),
  });

  await storage.writeBinary(path, pngBlob);

  const createdAt = existing?.createdAt || nowIso();
  const ref: SavedImageRef = {
    id,
    fileName,
    path,
    createdAt,
    ...(metadata ? { metadata } : {}),
  };

  await saveAssetDocument(
    storage,
    assetDocumentFromImageRef(ref, {
      name: options.name?.trim() || existing?.name,
    }),
  );

  return ref;
}

/** Load by id or absolute blob path. */
export async function loadImage(idOrPath: string): Promise<Blob> {
  const storage = getFileStorageService();
  if (idOrPath.startsWith('/')) {
    return storage.readBinary(idOrPath);
  }
  return storage.readBinary(imagePath(idOrPath));
}

export async function deleteImage(id: string): Promise<void> {
  const storage = getFileStorageService();
  if (await storage.exists(imagePath(id))) {
    await storage.delete(imagePath(id));
  }
}

export const imageStorage = {
  saveImage,
  updateImage,
  loadImage,
  deleteImage,
};
