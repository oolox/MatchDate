import type { AssetDocument } from '../../types/opfsDoc';
import { OPFS_SCHEMA_VERSION, type OpfsAssetSubtype } from '../../types/opfsDoc';
import type { SavedImageRef } from '../../types/savedImage';
import type { SavedVideoRef } from '../../types/savedVideo';
import type { SavedTextMetadata, SavedTextRef } from '../../types/savedText';
import { imagePath, textPath, videoPath } from './paths';

export function isAssetSubtype(value: unknown): value is OpfsAssetSubtype {
  return value === 'image' || value === 'video' || value === 'frame' || value === 'text';
}

export function assetDocumentFromImageRef(
  ref: SavedImageRef,
  options?: { name?: string },
): AssetDocument {
  const name =
    options?.name?.trim() ||
    ref.metadata?.visual?.trim() ||
    ref.metadata?.originalName?.trim() ||
    ref.fileName ||
    'Untitled image';
  return {
    schemaVersion: OPFS_SCHEMA_VERSION,
    type: 'asset',
    subtype: 'image',
    id: ref.id,
    name,
    blobPath: ref.path || imagePath(ref.id),
    fileName: ref.fileName,
    mimeType: 'image/png',
    metadata: ref.metadata as Record<string, unknown> | undefined,
    createdAt: ref.createdAt,
    updatedAt: ref.createdAt,
    refs: {},
  };
}

export function assetDocumentFromVideoRef(
  ref: SavedVideoRef,
  options?: { name?: string },
): AssetDocument {
  const name =
    options?.name?.trim() ||
    ref.metadata?.prompt?.trim() ||
    ref.metadata?.originalName?.trim() ||
    ref.fileName ||
    ref.id;
  return {
    schemaVersion: OPFS_SCHEMA_VERSION,
    type: 'asset',
    subtype: 'video',
    id: ref.id,
    name,
    blobPath: ref.path || videoPath(ref.id),
    fileName: ref.fileName,
    mimeType: 'video/mp4',
    ...(ref.posterPath ? { posterPath: ref.posterPath } : {}),
    metadata: ref.metadata as Record<string, unknown> | undefined,
    createdAt: ref.createdAt,
    updatedAt: ref.createdAt,
    refs: {},
  };
}

export function assetDocumentFromTextRef(
  ref: SavedTextRef,
  options?: { name?: string },
): AssetDocument {
  return {
    schemaVersion: OPFS_SCHEMA_VERSION,
    type: 'asset',
    subtype: 'text',
    id: ref.id,
    name: options?.name ?? (ref.metadata?.originalName?.trim() || ref.fileName || ref.id),
    blobPath: ref.path || textPath(ref.id),
    fileName: ref.fileName,
    mimeType: ref.mimeType,
    metadata: ref.metadata as Record<string, unknown> | undefined,
    createdAt: ref.createdAt,
    updatedAt: ref.createdAt,
    refs: {},
  };
}

export function savedTextRefFromAsset(asset: AssetDocument): SavedTextRef {
  const meta = asset.subtype === 'text' ? (asset.metadata as SavedTextMetadata | undefined) : undefined;
  return {
    id: asset.id,
    fileName: asset.fileName,
    path: asset.blobPath,
    createdAt: asset.createdAt,
    mimeType: asset.mimeType === 'text/markdown' ? 'text/markdown' : 'text/plain',
    ...(meta ? { metadata: meta } : {}),
  };
}
