import type { AssetDocument } from '../../types/opfsDoc';
import { OPFS_SCHEMA_VERSION, type OpfsAssetSubtype } from '../../types/opfsDoc';
import type { SavedImageMetadata, SavedImageRef } from '../../types/savedImage';
import type { SavedVideoRef } from '../../types/savedVideo';
import type { SavedTextMetadata, SavedTextRef } from '../../types/savedText';
import type { SavedVoiceRef, VoiceAssetMetadata } from '../../types/savedVoice';
import { imagePath, textPath, videoPath, voicePath } from './paths';

export function isAssetSubtype(value: unknown): value is OpfsAssetSubtype {
  return (
    value === 'image' ||
    value === 'video' ||
    value === 'frame' ||
    value === 'text' ||
    value === 'voice'
  );
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

export function assetDocumentFromVoiceRef(
  ref: SavedVoiceRef,
  options?: { name?: string },
): AssetDocument {
  const voiceName =
    options?.name?.trim() ||
    ref.metadata.voiceName.trim() ||
    ref.fileName ||
    ref.id;
  return {
    schemaVersion: OPFS_SCHEMA_VERSION,
    type: 'asset',
    subtype: 'voice',
    id: ref.id,
    name: voiceName,
    blobPath: ref.path || voicePath(ref.id),
    fileName: ref.fileName,
    ...(ref.mimeType ? { mimeType: ref.mimeType } : {}),
    metadata: {
      ...ref.metadata,
      voiceName,
    } as Record<string, unknown>,
    createdAt: ref.createdAt,
    updatedAt: ref.createdAt,
    refs: {},
  };
}

export function savedVoiceRefFromAsset(asset: AssetDocument): SavedVoiceRef {
  const meta =
    asset.subtype === 'voice'
      ? (asset.metadata as VoiceAssetMetadata | undefined)
      : undefined;
  return {
    id: asset.id,
    fileName: asset.fileName,
    path: asset.blobPath,
    createdAt: asset.createdAt,
    ...(asset.mimeType ? { mimeType: asset.mimeType } : {}),
    metadata: {
      voiceName: meta?.voiceName?.trim() || asset.name || asset.id,
      ...(meta?.sampleDurationMs != null ? { sampleDurationMs: meta.sampleDurationMs } : {}),
      ...(meta?.originalName ? { originalName: meta.originalName } : {}),
      ...(meta?.preset ? { preset: meta.preset } : {}),
      ...(meta?.providerIds ? { providerIds: meta.providerIds } : {}),
      ...(meta?.waveformPeaks ? { waveformPeaks: meta.waveformPeaks } : {}),
    },
  };
}

/** IMAGE (and FRAME posters) are image-shaped for thumbs / character attach. */
export function isImageLikeAssetSubtype(value: unknown): value is 'image' | 'frame' {
  return value === 'image' || value === 'frame';
}

export function savedImageRefFromAsset(asset: AssetDocument): SavedImageRef {
  const metadata =
    isImageLikeAssetSubtype(asset.subtype) && asset.metadata
      ? (asset.metadata as SavedImageMetadata)
      : undefined;
  return {
    id: asset.id,
    fileName: asset.fileName,
    path: asset.blobPath,
    createdAt: asset.createdAt,
    ...(metadata ? { metadata } : {}),
  };
}
