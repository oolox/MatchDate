import type { SavedVideoRef } from '../../types/savedVideo';
import { createId, nowIso } from '../../utils/id';
import { ensureVideoAsset } from './assetPersistence';
import { getFileStorageService } from './index';
import { videoFileName, videoPath } from './paths';

export interface SaveVideoOptions {
  name?: string;
}

export async function saveVideo(
  blob: Blob,
  options: SaveVideoOptions = {},
): Promise<SavedVideoRef> {
  const storage = getFileStorageService();
  const id = createId();
  const fileName = videoFileName(id);
  const path = videoPath(id);

  await storage.writeBinary(path, blob);

  const ref: SavedVideoRef = {
    id,
    fileName,
    path,
    createdAt: nowIso(),
    metadata: options.name ? { originalName: options.name } : undefined,
  };

  await ensureVideoAsset(storage, ref, { name: options.name });
  return ref;
}

export async function loadVideo(id: string): Promise<Blob> {
  const storage = getFileStorageService();
  return storage.readBinary(videoPath(id));
}

export async function deleteVideo(id: string): Promise<void> {
  const storage = getFileStorageService();
  if (await storage.exists(videoPath(id))) {
    await storage.delete(videoPath(id));
  }
}
