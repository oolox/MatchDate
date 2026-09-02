import type { SavedTextKind, SavedTextRef } from '../../types/savedText';
import { getFileStorageService } from './index';
import { ensureTextAsset } from './assetPersistence';
import { parseTextIdFromFileName, textMetaPath, textPath, TEXT_ASSETS_DIR } from './paths';

/** One-time migration: sidecar JSON in /assets/text/ → metadata JSON + catalog row. */
export async function migrateTextAssetMetadata(): Promise<void> {
  const storage = getFileStorageService();
  let entries;
  try {
    entries = await storage.list(TEXT_ASSETS_DIR);
  } catch {
    return;
  }

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
      const raw = await storage.read(textMetaPath(id));
      const parsed = JSON.parse(raw) as {
        originalName?: string;
        mimeType?: SavedTextKind;
        createdAt?: string;
        metadata?: SavedTextRef['metadata'];
      };
      const originalName = parsed.originalName ?? parsed.metadata?.originalName ?? id;
      const ref: SavedTextRef = {
        id,
        fileName: `matchDate-text-${id}.txt`,
        path: textPath(id),
        createdAt: parsed.createdAt ?? new Date(0).toISOString(),
        mimeType: parsed.mimeType ?? 'text/plain',
        metadata: {
          originalName,
          ...parsed.metadata,
        },
      };

      await ensureTextAsset(storage, ref, { name: originalName });
      await storage.delete(textMetaPath(id));
    } catch (error) {
      console.info('Text asset migration skipped', { id, error });
    }
  }
}
