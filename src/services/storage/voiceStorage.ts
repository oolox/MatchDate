import type { AssetDocument } from '../../types/opfsDoc';
import {
  DEFAULT_GEMINI_VOICE_PRESET,
  DEFAULT_VOICE_NAME,
  normalizeVoiceAssetMetadata,
  type VoiceAssetMetadata,
  type VoicePreset,
} from '../../types/savedVoice';
import { createId, nowIso } from '../../utils/id';
import {
  assetDocumentFromVoiceRef,
  savedVoiceRefFromAsset,
} from './assetDocument';
import {
  saveAssetDocument,
  tryLoadAssetDocument,
} from './assetPersistence';
import { getFileStorageService } from './index';
import { voiceFileName, voicePath } from './paths';

export interface VoiceAssetSummary {
  id: string;
  name: string;
  voiceName: string;
  hasSample: boolean;
}

export interface SaveVoiceOptions {
  /** Update an existing voice asset (GUID). */
  id?: string;
  voiceName?: string;
  preset?: VoicePreset;
  /** Optional sample blob (clone path later); preset-only voices omit this. */
  sample?: Blob;
  originalName?: string;
  sampleDurationMs?: number;
  metadata?: Partial<VoiceAssetMetadata>;
}

export async function saveVoice(options: SaveVoiceOptions = {}): Promise<AssetDocument> {
  const storage = getFileStorageService();
  const id = options.id?.trim() || createId();
  const existing = await tryLoadAssetDocument(storage, id);
  if (existing && existing.subtype !== 'voice') {
    throw new Error(`Asset ${id} is not a voice asset`);
  }

  const existingMeta =
    existing?.subtype === 'voice'
      ? (existing.metadata as VoiceAssetMetadata | undefined)
      : undefined;

  const voiceName =
    options.voiceName?.trim() ||
    options.metadata?.voiceName?.trim() ||
    existingMeta?.voiceName?.trim() ||
    existing?.name?.trim() ||
    DEFAULT_VOICE_NAME;

  const mergedMeta = normalizeVoiceAssetMetadata(
    {
      ...existingMeta,
      ...options.metadata,
      voiceName,
      ...(options.originalName != null
        ? { originalName: options.originalName }
        : {}),
      ...(options.sampleDurationMs != null
        ? { sampleDurationMs: options.sampleDurationMs }
        : {}),
      preset:
        options.preset ??
        options.metadata?.preset ??
        existingMeta?.preset ??
        (existing ? undefined : DEFAULT_GEMINI_VOICE_PRESET),
    },
    voiceName,
  );

  const path = voicePath(id);
  const fileName = existing?.fileName || voiceFileName(id);
  let mimeType = existing?.mimeType;

  if (options.sample) {
    await storage.writeBinary(path, options.sample);
    mimeType = options.sample.type || mimeType || 'audio/mpeg';
  }

  const createdAt = existing?.createdAt || nowIso();
  const ref = {
    id,
    fileName,
    path: existing?.blobPath || path,
    createdAt,
    ...(mimeType ? { mimeType } : {}),
    metadata: mergedMeta,
  };

  return saveAssetDocument(storage, assetDocumentFromVoiceRef(ref, { name: mergedMeta.voiceName }));
}

export async function renameVoice(id: string, voiceName: string): Promise<AssetDocument> {
  const trimmed = voiceName.trim() || DEFAULT_VOICE_NAME;
  return saveVoice({ id, voiceName: trimmed });
}

export async function loadVoice(id: string): Promise<AssetDocument> {
  const storage = getFileStorageService();
  const asset = await tryLoadAssetDocument(storage, id);
  if (!asset || asset.subtype !== 'voice') {
    throw new Error(`Voice asset not found: ${id}`);
  }
  return asset;
}

export async function tryLoadVoice(id: string): Promise<AssetDocument | null> {
  const storage = getFileStorageService();
  const asset = await tryLoadAssetDocument(storage, id);
  if (!asset || asset.subtype !== 'voice') {
    return null;
  }
  return asset;
}

export async function loadVoiceMetadata(id: string): Promise<VoiceAssetMetadata> {
  const asset = await loadVoice(id);
  return savedVoiceRefFromAsset(asset).metadata;
}

export async function deleteVoiceSample(id: string): Promise<void> {
  const storage = getFileStorageService();
  const path = voicePath(id);
  if (await storage.exists(path)) {
    await storage.delete(path);
  }
}

export async function listVoiceAssets(): Promise<VoiceAssetSummary[]> {
  const { listAssets } = await import('./persistenceService');
  const items = await listAssets();
  const storage = getFileStorageService();
  const summaries: VoiceAssetSummary[] = [];

  for (const item of items) {
    if (item.subtype !== 'voice') {
      continue;
    }
    const hasSample = await storage.exists(voicePath(item.id));
    summaries.push({
      id: item.id,
      name: item.name,
      voiceName: item.name,
      hasSample,
    });
  }

  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}
