import type { SavedTextKind, SavedTextMetadata, SavedTextRef } from '../../types/savedText';
import { createId, nowIso } from '../../utils/id';
import { getFileStorageService } from './index';
import { parseTextIdFromFileName, textMetaPath, textPath, TEXT_ASSETS_DIR } from './paths';

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

  await storage.write(
    textMetaPath(id),
    JSON.stringify(
      {
        id: ref.id,
        originalName,
        mimeType,
        createdAt: ref.createdAt,
        metadata: ref.metadata,
      },
      null,
      2,
    ),
  );

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

export async function deleteText(id: string): Promise<void> {
  const storage = getFileStorageService();
  await storage.delete(textPath(id));
  if (await storage.exists(textMetaPath(id))) {
    await storage.delete(textMetaPath(id));
  }
}

export async function listTextAssets(): Promise<TextAssetSummary[]> {
  const storage = getFileStorageService();
  let entries;
  try {
    entries = await storage.list(TEXT_ASSETS_DIR);
  } catch {
    return [];
  }
  const items: TextAssetSummary[] = [];

  for (const entry of entries) {
    if (entry.kind !== 'file' || !entry.path.endsWith('.json')) {
      continue;
    }
    const fileName = entry.path.split('/').pop() ?? '';
    const id = parseTextIdFromFileName(fileName);
    if (!id) {
      continue;
    }
    try {
      const meta = await loadTextMeta(id);
      items.push({
        id,
        name: meta.originalName,
        mimeType: meta.mimeType,
      });
    } catch {
      // skip invalid metadata
    }
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export const TEXT_UPLOAD_ACCEPT = '.txt,.md,text/plain,text/markdown';
