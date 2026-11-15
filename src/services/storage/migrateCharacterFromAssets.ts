import { getFileStorageService } from './index';
import { deleteAssetDocument } from './assetPersistence';
import {
  characterDocumentFromCharacter,
  parseCharacterPayload,
  saveCharacterDocument,
} from './characterPersistence';
import { ASSETS_METADATA_DIR, assetPath, parseAssetIdFromFileName } from './paths';

const LEGACY_CHARACTER_METADATA_KEY = 'character';

/** One-time migration: asset subtype `character` → top-level character documents. */
export async function migrateCharacterFromAssets(): Promise<void> {
  const storage = getFileStorageService();
  let entries;
  try {
    entries = await storage.list(ASSETS_METADATA_DIR);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.kind !== 'file' || !entry.path.endsWith('.json')) {
      continue;
    }

    const fileName = entry.path.split('/').pop() ?? '';
    const id = parseAssetIdFromFileName(fileName);
    if (!id) {
      continue;
    }

    const path = assetPath(id);
    let parsed: {
      subtype?: string;
      name?: string;
      createdAt?: string;
      metadata?: Record<string, unknown>;
    };
    try {
      parsed = JSON.parse(await storage.read(path)) as typeof parsed;
    } catch {
      continue;
    }

    if (parsed.subtype !== 'character') {
      continue;
    }

    try {
      const raw = parsed.metadata?.[LEGACY_CHARACTER_METADATA_KEY];
      const character = parseCharacterPayload(raw, parsed.name ?? id);
      await saveCharacterDocument(
        storage,
        characterDocumentFromCharacter(character, {
          id,
          createdAt: parsed.createdAt,
        }),
      );
      await deleteAssetDocument(storage, id);
    } catch (error) {
      console.info('Character asset migration skipped', { id, error });
    }
  }
}
