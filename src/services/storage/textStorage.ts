import type { SavedTextKind, SavedTextMetadata, SavedTextRef } from '../../types/savedText';
import { createId, nowIso } from '../../utils/id';
import { ensureTextAsset, tryLoadAssetDocument } from './assetPersistence';
import { getFileStorageService } from './index';
import { listLibraryItems, reconcileLibraryIndex } from './libraryIndex';
import { textMetaPath, textPath } from './paths';

const EXCERPT_LENGTH = 200;

export interface TextAssetSummary {
  id: string;
  name: string;
  mimeType: SavedTextKind;
}

export interface SaveTextOptions {
  metadata?: SavedTextMetadata;
}

function mimeTypeForFileName(fileName: string): SavedTextKind {
  return /\.md$/i.test(fileName) ? 'text/markdown' : 'text/plain';
}

async function computeExcerpt(blob: Blob): Promise<{ excerpt: string; charCount: number }> {
  const text = await blob.text();
  return { excerpt: text.trim().slice(0, EXCERPT_LENGTH), charCount: text.length };
}

export async function saveText(
  blob: Blob,
  originalName: string,
  options: SaveTextOptions = {},
): Promise<SavedTextRef> {
  const storage = getFileStorageService();
  const id = createId();
  const fileName = `matchDate-text-${id}.txt`;
  const path = textPath(id);
  const mimeType = mimeTypeForFileName(originalName);

  await storage.writeBinary(path, blob);

  let excerptMeta: { excerpt: string; charCount: number } | undefined;
  try {
    excerptMeta = await computeExcerpt(blob);
  } catch (error) {
    console.info('Could not compute text excerpt', { id, error });
  }

  const ref: SavedTextRef = {
    id,
    fileName,
    path,
    createdAt: nowIso(),
    mimeType,
    metadata: {
      originalName,
      ...excerptMeta,
      ...options.metadata,
    },
  };

  await ensureTextAsset(storage, ref, { name: originalName });

  return ref;
}

export async function loadTextContent(id: string): Promise<string> {
  const storage = getFileStorageService();
  const blob = await storage.readBinary(textPath(id));
  return blob.text();
}

export async function loadTextMeta(id: string): Promise<{
  originalName: string;
  mimeType: SavedTextKind;
}> {
  const storage = getFileStorageService();
  const asset = await tryLoadAssetDocument(storage, id);
  if (asset?.subtype === 'text') {
    const meta = asset.metadata as SavedTextMetadata | undefined;
    return {
      originalName: meta?.originalName ?? asset.name,
      mimeType: asset.mimeType === 'text/markdown' ? 'text/markdown' : 'text/plain',
    };
  }

  if (await storage.exists(textMetaPath(id))) {
    const raw = await storage.read(textMetaPath(id));
    const parsed = JSON.parse(raw) as {
      originalName?: string;
      mimeType?: SavedTextKind;
    };
    return {
      originalName: parsed.originalName ?? id,
      mimeType: parsed.mimeType ?? 'text/plain',
    };
  }

  return { originalName: id, mimeType: 'text/plain' };
}

export async function deleteText(id: string): Promise<void> {
  const storage = getFileStorageService();
  await storage.delete(textPath(id));
  if (await storage.exists(textMetaPath(id))) {
    await storage.delete(textMetaPath(id));
  }
}

export async function listTextAssets(): Promise<TextAssetSummary[]> {
  const storage = getFileStorageService();
  await reconcileLibraryIndex(storage);
  const items = await listLibraryItems(storage, 'asset');
  const summaries: TextAssetSummary[] = [];

  for (const item of items) {
    if (item.subtype !== 'text' && item.subtype !== undefined) {
      continue;
    }
    const asset = await tryLoadAssetDocument(storage, item.id);
    const mimeType =
      asset?.mimeType === 'text/markdown' ? 'text/markdown' : ('text/plain' as SavedTextKind);
    summaries.push({
      id: item.id,
      name: item.name,
      mimeType,
    });
  }

  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}

export const TEXT_UPLOAD_ACCEPT = '.txt,.md,text/plain,text/markdown';
