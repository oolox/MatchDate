import { DEFAULT_SYSTEM_PROMPT } from '../../features/chat/constants';
import { OPFS_SCHEMA_VERSION } from '../../types/opfsDoc';
import type { SessionDocument } from '../../types/session';
import { nowIso } from '../../utils/id';
import { slugifyName } from '../../utils/slug';
import type { PromptsState } from '../../store/slices/promptsSlice';
import type { SessionsState } from '../../store/slices/sessionsSlice';
import { getFileStorageService } from './index';
import {
  deleteAssetDocument,
  loadAssetDocument,
  saveAssetDocument,
  tryLoadAssetDocument,
} from './assetPersistence';
import { deleteText } from './textStorage';
import { deleteImage } from './imageStorage';
import { migrateTextAssetMetadata } from './migrateTextAssetMetadata';
import { deleteVideo } from './videoStorage';
import {
  listLibraryItems,
  parsePreset,
  parseSessionDocument,
  reconcileLibraryIndex,
  removeLibraryItem,
  toggleFavorite as toggleLibraryFavorite,
  upsertLibraryItem,
} from './libraryIndex';
import { CONFIG_PATH, presetPath, sessionDocumentPath } from './paths';
import type { ConfigManifest, FileStorageService, LibraryItemKind, LibraryItemMeta, SystemPromptPreset } from './types';
import { StorageError } from './types';
import type { AssetDocument } from '../../types/opfsDoc';

export interface LoadSessionResult {
  session: SessionDocument;
}

const DEFAULT_PRESET_SLUG = 'default';
const DEFAULT_PRESET_NAME = 'Default';

function getStorage(): FileStorageService {
  return getFileStorageService();
}

function parseManifest(raw: string): ConfigManifest {
  try {
    const parsed = JSON.parse(raw) as Partial<ConfigManifest>;
    return {
      schemaVersion: parsed.schemaVersion ?? OPFS_SCHEMA_VERSION,
      activeSessionId: parsed.activeSessionId ?? null,
      activeSystemPresetSlug: parsed.activeSystemPresetSlug ?? DEFAULT_PRESET_SLUG,
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
  patch: Partial<Pick<ConfigManifest, 'activeSessionId' | 'activeSystemPresetSlug'>>,
): Promise<ConfigManifest> {
  const current = await readConfigManifest(storage);
  const manifest: ConfigManifest = {
    schemaVersion: current.schemaVersion ?? OPFS_SCHEMA_VERSION,
    activeSessionId:
      patch.activeSessionId !== undefined ? patch.activeSessionId : current.activeSessionId,
    activeSystemPresetSlug:
      patch.activeSystemPresetSlug !== undefined
        ? patch.activeSystemPresetSlug
        : current.activeSystemPresetSlug,
    updatedAt: nowIso(),
  };
  await storage.write(CONFIG_PATH, JSON.stringify(manifest, null, 2));
  return manifest;
}

async function seedDefaultPreset(storage: FileStorageService): Promise<void> {
  const now = nowIso();
  const preset: SystemPromptPreset = {
    name: DEFAULT_PRESET_NAME,
    slug: DEFAULT_PRESET_SLUG,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    type: 'system',
    createdAt: now,
    updatedAt: now,
  };

  await storage.write(
    presetPath(DEFAULT_PRESET_SLUG),
    JSON.stringify(
      {
        ...preset,
        schemaVersion: OPFS_SCHEMA_VERSION,
      },
      null,
      2,
    ),
  );

  const manifest: ConfigManifest = {
    schemaVersion: OPFS_SCHEMA_VERSION,
    activeSessionId: null,
    activeSystemPresetSlug: DEFAULT_PRESET_SLUG,
    updatedAt: now,
  };
  await storage.write(CONFIG_PATH, JSON.stringify(manifest, null, 2));
  await upsertLibraryItem(storage, {
    kind: 'prompt',
    id: preset.slug,
    name: preset.name,
    createdAt: preset.createdAt,
    updatedAt: preset.updatedAt,
  });
}

export async function ensureInitialized(storage: FileStorageService): Promise<void> {
  const hasConfig = await storage.exists(CONFIG_PATH);
  if (!hasConfig) {
    await seedDefaultPreset(storage);
    return;
  }

  if (!(await storage.exists(presetPath(DEFAULT_PRESET_SLUG)))) {
    await seedDefaultPreset(storage);
  }
}

export async function reconcileLibrary(): Promise<void> {
  const storage = getStorage();
  await ensureInitialized(storage);
  await migrateTextAssetMetadata();
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
  }
  await deleteAssetDocument(storage, id);
}

export async function listPresets() {
  const storage = getStorage();
  await ensureInitialized(storage);
  return listLibraryItems(storage, 'prompt');
}

export async function loadPreset(slug: string): Promise<SystemPromptPreset> {
  const storage = getStorage();
  await ensureInitialized(storage);
  const path = presetPath(slug);
  if (!(await storage.exists(path))) {
    throw new StorageError('NOT_FOUND', `Preset not found: ${slug}`);
  }
  return parsePreset(await storage.read(path), path);
}

export async function savePreset(options: {
  name: string;
  systemPrompt: string;
  slug?: string;
}): Promise<SystemPromptPreset> {
  const storage = getStorage();
  await ensureInitialized(storage);

  const slug = options.slug ?? slugifyName(options.name);
  const now = nowIso();
  const path = presetPath(slug);

  let createdAt = now;
  if (await storage.exists(path)) {
    try {
      const existing = parsePreset(await storage.read(path), path);
      createdAt = existing.createdAt;
    } catch (error) {
      console.info('Could not read existing preset metadata; using new timestamps', {
        path,
        slug,
        error,
      });
    }
  }

  const preset: SystemPromptPreset = {
    schemaVersion: OPFS_SCHEMA_VERSION,
    name: options.name.trim(),
    slug,
    systemPrompt: options.systemPrompt,
    type: 'system',
    createdAt,
    updatedAt: now,
  };

  await storage.write(path, JSON.stringify(preset, null, 2));
  await upsertLibraryItem(storage, {
    kind: 'prompt',
    id: preset.slug,
    name: preset.name,
    createdAt: preset.createdAt,
    updatedAt: preset.updatedAt,
  });
  return preset;
}

export async function setActivePrompt(slug: string): Promise<SystemPromptPreset> {
  const storage = getStorage();
  await ensureInitialized(storage);

  if (!(await storage.exists(presetPath(slug)))) {
    throw new StorageError('NOT_FOUND', `Preset not found: ${slug}`);
  }

  const preset = await loadPreset(slug);
  await updateConfigManifest(storage, { activeSystemPresetSlug: slug });
  return preset;
}

export async function deletePreset(slug: string): Promise<{
  activeSystemPresetSlug: string;
  activeSystemPrompt: string;
}> {
  const storage = getStorage();
  await ensureInitialized(storage);

  if (slug === DEFAULT_PRESET_SLUG) {
    throw new StorageError('PARSE_ERROR', 'Cannot delete the default preset');
  }

  const manifest = await readConfigManifest(storage);
  const wasActive = manifest.activeSystemPresetSlug === slug;

  await storage.delete(presetPath(slug));
  await removeLibraryItem(storage, 'prompt', slug);

  if (!wasActive) {
    const active = await loadPreset(manifest.activeSystemPresetSlug);
    return {
      activeSystemPresetSlug: active.slug,
      activeSystemPrompt: active.systemPrompt,
    };
  }

  const fallback = await loadPreset(DEFAULT_PRESET_SLUG);
  await updateConfigManifest(storage, { activeSystemPresetSlug: fallback.slug });
  return {
    activeSystemPresetSlug: fallback.slug,
    activeSystemPrompt: fallback.systemPrompt,
  };
}

export async function loadPromptsState(): Promise<PromptsState> {
  const storage = getStorage();
  await ensureInitialized(storage);
  const manifest = await readConfigManifest(storage);
  const presetCatalog = await listPresets();

  let activeSystem = await loadPreset(manifest.activeSystemPresetSlug);

  return {
    systemPrompt: activeSystem.systemPrompt,
    activeSystemPrompt: activeSystem.systemPrompt,
    activeSystemPresetSlug: activeSystem.slug,
    selectedPresetSlug: activeSystem.slug,
    presetCatalog,
    storageReady: true,
  };
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
