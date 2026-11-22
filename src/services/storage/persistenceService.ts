import type { Character } from '../../types/character';
import { OPFS_SCHEMA_VERSION } from '../../types/opfsDoc';
import type { SessionDocument } from '../../types/session';
import { createId, nowIso } from '../../utils/id';
import type { SessionsState } from '../../store/slices/sessionsSlice';
import { getFileStorageService } from './index';
import {
  deleteAssetDocument,
  ensureCharacterSetAsset,
  loadAssetDocument,
  saveAssetDocument,
  tryLoadAssetDocument,
} from './assetPersistence';
import { savedCharacterSetRefFromAsset } from './assetDocument';
import {
  copyOpfsStoreSnapshot,
  deleteOpfsTree,
  gameSaveStem,
  restoreOpfsStoreSnapshot,
  type OpfsBackupOptions,
} from './opfsBackup';
import {
  characterDocumentFromCharacter,
  characterFromDocument,
  deleteCharacterDocument,
  loadCharacterDocumentMigrating,
  saveCharacterDocument,
  tryLoadCharacterDocument,
} from './characterPersistence';
import { deleteText } from './textStorage';
import { deleteImage } from './imageStorage';
import { migrateTextAssetMetadata } from './migrateTextAssetMetadata';
import { migrateCharacterFromAssets } from './migrateCharacterFromAssets';
import { migrateLegacyOpfsPrompts } from './migrateLegacyOpfsPrompts';
import { deleteVideo } from './videoStorage';
import { deleteVoiceSample } from './voiceStorage';
import {
  listLibraryItems,
  parseSessionDocument,
  reconcileLibraryIndex,
  removeLibraryItem,
  toggleFavorite as toggleLibraryFavorite,
  upsertLibraryItem,
} from './libraryIndex';
import { characterSetRootPath, CONFIG_PATH, sessionDocumentPath } from './paths';
import type { ConfigManifest, FileStorageService, LibraryItemKind, LibraryItemMeta } from './types';
import { StorageError } from './types';
import type { AssetDocument } from '../../types/opfsDoc';
import type { CharacterDocument } from '../../types/character';

export interface LoadSessionResult {
  session: SessionDocument;
}

function getStorage(): FileStorageService {
  return getFileStorageService();
}

function parseManifest(raw: string): ConfigManifest {
  try {
    const parsed = JSON.parse(raw) as Partial<ConfigManifest>;
    return {
      schemaVersion: parsed.schemaVersion ?? OPFS_SCHEMA_VERSION,
      activeSessionId: parsed.activeSessionId ?? null,
      updatedAt: parsed.updatedAt ?? nowIso(),
    };
  } catch {
    throw new StorageError('PARSE_ERROR', 'Invalid config JSON');
  }
}

async function readConfigManifest(storage: FileStorageService): Promise<ConfigManifest> {
  await ensureInitialized(storage);
  const raw = await storage.read(CONFIG_PATH);
  return parseManifest(raw);
}

async function updateConfigManifest(
  storage: FileStorageService,
  patch: Partial<Pick<ConfigManifest, 'activeSessionId'>>,
): Promise<ConfigManifest> {
  const current = await readConfigManifest(storage);
  const manifest: ConfigManifest = {
    schemaVersion: current.schemaVersion ?? OPFS_SCHEMA_VERSION,
    activeSessionId:
      patch.activeSessionId !== undefined ? patch.activeSessionId : current.activeSessionId,
    updatedAt: nowIso(),
  };
  await storage.write(CONFIG_PATH, JSON.stringify(manifest, null, 2));
  return manifest;
}

async function seedConfig(storage: FileStorageService): Promise<void> {
  const manifest: ConfigManifest = {
    schemaVersion: OPFS_SCHEMA_VERSION,
    activeSessionId: null,
    updatedAt: nowIso(),
  };
  await storage.write(CONFIG_PATH, JSON.stringify(manifest, null, 2));
}

export async function ensureInitialized(storage: FileStorageService): Promise<void> {
  if (!(await storage.exists(CONFIG_PATH))) {
    await seedConfig(storage);
  }
}

export async function reconcileLibrary(): Promise<void> {
  const storage = getStorage();
  await ensureInitialized(storage);
  await migrateLegacyOpfsPrompts(storage);
  await migrateTextAssetMetadata();
  await migrateCharacterFromAssets();
  await reconcileLibraryIndex(storage);
}

export async function listAssets(): Promise<LibraryItemMeta[]> {
  const storage = getStorage();
  await ensureInitialized(storage);
  await reconcileLibraryIndex(storage);
  return listLibraryItems(storage, 'asset');
}

export async function loadAsset(id: string): Promise<AssetDocument> {
  const storage = getStorage();
  await ensureInitialized(storage);
  return loadAssetDocument(storage, id);
}

export async function saveAsset(document: AssetDocument): Promise<AssetDocument> {
  const storage = getStorage();
  await ensureInitialized(storage);
  return saveAssetDocument(storage, document);
}

export async function deleteAsset(id: string): Promise<void> {
  const storage = getStorage();
  await ensureInitialized(storage);
  const asset = await tryLoadAssetDocument(storage, id);
  if (!asset) {
    return;
  }
  if (asset.subtype === 'text') {
    await deleteText(id);
  } else if (asset.subtype === 'image') {
    await deleteImage(id);
  } else if (asset.subtype === 'video') {
    await deleteVideo(id);
  } else if (asset.subtype === 'voice') {
    await deleteVoiceSample(id);
  } else if (asset.subtype === 'characterSet') {
    const { metadata } = savedCharacterSetRefFromAsset(asset);
    await deleteOpfsTree(storage, metadata.rootPath);
  }
  await deleteAssetDocument(storage, id);
}

/** Snapshot the live store into OPFS and record it as a characterSet asset. */
export async function saveCharacterSetCopy(
  fileName: string,
  options?: OpfsBackupOptions,
): Promise<{ id: string; name: string; fileCount: number; rootPath: string }> {
  const name = gameSaveStem(fileName);
  if (name.length <= 3) {
    throw new StorageError('INVALID_PATH', 'File name must be longer than 3 characters');
  }
  const storage = getStorage();
  await ensureInitialized(storage);
  const id = createId();
  const rootPath = characterSetRootPath(id);
  const { fileCount } = await copyOpfsStoreSnapshot(storage, rootPath, options);
  await ensureCharacterSetAsset(storage, {
    id,
    fileName: name,
    path: rootPath,
    createdAt: nowIso(),
    metadata: { fileName: name, rootPath },
  });
  return { id, name, fileCount, rootPath };
}

/** Restore a character-set snapshot onto the live store, the same way an import writes a zip. */
export async function loadCharacterSetCopy(
  id: string,
): Promise<{ name: string; written: number }> {
  const storage = getStorage();
  await ensureInitialized(storage);
  const asset = await loadAssetDocument(storage, id);
  if (asset.subtype !== 'characterSet') {
    throw new StorageError('PARSE_ERROR', 'Not a character set');
  }
  const saved = savedCharacterSetRefFromAsset(asset);
  const { written } = await restoreOpfsStoreSnapshot(storage, saved.metadata.rootPath);
  await reconcileLibraryIndex(storage);
  return { name: saved.metadata.fileName, written };
}

export async function listCharacters(): Promise<LibraryItemMeta[]> {
  const storage = getStorage();
  await ensureInitialized(storage);
  await reconcileLibraryIndex(storage);
  return listLibraryItems(storage, 'character');
}

export async function saveCharacter(
  character: Character,
  id?: string,
): Promise<CharacterDocument> {
  const storage = getStorage();
  await ensureInitialized(storage);
  const resolvedId = id?.trim() || createId();
  let createdAt: string | undefined;
  if (id?.trim()) {
    const existing = await tryLoadCharacterDocument(storage, resolvedId);
    createdAt = existing?.createdAt;
  }
  return saveCharacterDocument(
    storage,
    characterDocumentFromCharacter(character, { id: resolvedId, createdAt }),
  );
}

export async function loadCharacter(id: string): Promise<Character> {
  const { character } = await loadCharacterWithMigration(id);
  return character;
}

/** Load character; migrates legacy date arrays → `dateHistory` and saves when needed. */
export async function loadCharacterWithMigration(id: string): Promise<{
  character: Character;
  migratedDateHistory: boolean;
}> {
  const storage = getStorage();
  await ensureInitialized(storage);
  const { document, migratedDateHistory } = await loadCharacterDocumentMigrating(storage, id);
  return {
    character: characterFromDocument(document),
    migratedDateHistory,
  };
}

export async function deleteCharacter(id: string): Promise<void> {
  const storage = getStorage();
  await ensureInitialized(storage);
  await deleteCharacterDocument(storage, id);
}

/** Deep-copy a character into a new id with name `"{name} - COPY"`. */
export async function duplicateCharacter(id: string): Promise<CharacterDocument> {
  const character = await loadCharacter(id);
  const baseName = character.name.trim() || 'Untitled character';
  return saveCharacter({
    ...character,
    name: `${baseName} - COPY`,
  });
}

export async function getActiveSessionId(): Promise<string | null> {
  const storage = getStorage();
  const manifest = await readConfigManifest(storage);
  return manifest.activeSessionId;
}

export async function setActiveSession(id: string | null): Promise<void> {
  const storage = getStorage();
  await ensureInitialized(storage);

  if (id !== null) {
    const path = sessionDocumentPath(id);
    if (!(await storage.exists(path))) {
      throw new StorageError('NOT_FOUND', `Session not found: ${id}`);
    }
  }

  await updateConfigManifest(storage, { activeSessionId: id });
}

export async function saveSessionDocument(
  document: SessionDocument,
): Promise<SessionDocument> {
  const storage = getStorage();
  await ensureInitialized(storage);

  const id = document.id.trim();
  if (!id) {
    throw new StorageError('PARSE_ERROR', 'session id is required');
  }

  const now = nowIso();
  const path = sessionDocumentPath(id);
  let createdAt = document.createdAt ?? now;
  if (await storage.exists(path)) {
    try {
      const existing = parseSessionDocument(await storage.read(path), path);
      createdAt = existing.createdAt;
    } catch (error) {
      console.info('Could not read existing session metadata; using new timestamps', {
        path,
        id,
        error,
      });
    }
  }

  const saved: SessionDocument = {
    ...document,
    schemaVersion: OPFS_SCHEMA_VERSION,
    type: 'generator',
    subtype: 'session',
    id,
    name: document.name.trim() || 'Untitled',
    createdAt,
    updatedAt: now,
  };

  await storage.write(path, JSON.stringify(saved, null, 2));
  await upsertLibraryItem(storage, {
    kind: 'session',
    id: saved.id,
    name: saved.name,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
  });
  await setActiveSession(saved.id);
  return saved;
}

export async function loadSessionDocument(id: string): Promise<LoadSessionResult> {
  const storage = getStorage();
  await ensureInitialized(storage);

  const path = sessionDocumentPath(id);
  if (!(await storage.exists(path))) {
    throw new StorageError('NOT_FOUND', `Session not found: ${id}`);
  }

  const raw = await storage.read(path);
  const session = parseSessionDocument(raw, path);
  return { session };
}

export async function loadSessionsState(): Promise<SessionsState> {
  const storage = getStorage();
  await ensureInitialized(storage);
  const sessionCatalog = await listLibraryItems(storage, 'session');
  const savedUpdatedAt = Object.fromEntries(
    sessionCatalog.map((session) => [session.id, session.updatedAt]),
  );

  const manifest = await readConfigManifest(storage);

  return {
    sessionCatalog,
    savedUpdatedAt,
    selectedSessionId: manifest.activeSessionId,
    storageReady: true,
  };
}

export async function requestPersistentStorage(): Promise<void> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    typeof navigator.storage.persist === 'function'
  ) {
    try {
      await navigator.storage.persist();
    } catch {
      // best-effort
    }
  }
}

export async function listLibrary(): Promise<LibraryItemMeta[]> {
  const storage = getStorage();
  await ensureInitialized(storage);
  await reconcileLibraryIndex(storage);
  return listLibraryItems(storage);
}

export async function toggleFavorite(
  kind: LibraryItemKind,
  id: string,
): Promise<LibraryItemMeta> {
  const storage = getStorage();
  await ensureInitialized(storage);
  await reconcileLibraryIndex(storage);
  return toggleLibraryFavorite(storage, kind, id);
}

export async function deleteSession(sessionId: string): Promise<{ activeSessionId: string | null }> {
  const storage = getStorage();
  await ensureInitialized(storage);

  const path = sessionDocumentPath(sessionId);
  if (await storage.exists(path)) {
    await storage.delete(path);
  }
  await removeLibraryItem(storage, 'session', sessionId);

  const manifest = await readConfigManifest(storage);
  if (manifest.activeSessionId !== sessionId) {
    return { activeSessionId: manifest.activeSessionId };
  }

  const remaining = await listLibraryItems(storage, 'session');
  const nextActiveId = remaining[0]?.id ?? null;
  await updateConfigManifest(storage, { activeSessionId: nextActiveId });
  return { activeSessionId: nextActiveId };
}
