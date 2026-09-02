import { nowIso } from '../../utils/id';
import { OPFS_SCHEMA_VERSION } from '../../types/opfsDoc';
import type { SessionDocument } from '../../types/session';
import {
  LIBRARY_PATH,
  presetFileName,
  presetPath,
  PROMPTS_PRESET_DIR,
  PROMPTS_SESSIONS_DIR,
  sessionDocumentFileName,
  sessionDocumentPath,
} from './paths';
import { parseStorageJson } from './parseStorageJson';
import type {
  FileStorageService,
  LibraryIndex,
  LibraryItemMeta,
  LibraryItemKind,
  SystemPromptPreset,
} from './types';
import { StorageError } from './types';

const SESSION_PREFIX = 'matchDate-';

function itemKey(kind: LibraryItemKind, id: string): string {
  return `${kind}:${id}`;
}

function indexByKey(items: LibraryItemMeta[]): Map<string, LibraryItemMeta> {
  return new Map(items.map((item) => [itemKey(item.kind, item.id), item]));
}

function libraryPathsForKind(kind: LibraryItemKind, id: string) {
  if (kind === 'prompt') {
    return {
      fileName: presetFileName(id),
      path: presetPath(id),
    };
  }
  return {
    fileName: sessionDocumentFileName(id),
    path: sessionDocumentPath(id),
  };
}

function parseLibraryIndex(raw: string): LibraryIndex {
  return parseStorageJson(
    raw,
    LIBRARY_PATH,
    (parsed) => {
      const value = parsed as Partial<LibraryIndex>;
      if (!Array.isArray(value.items)) {
        throw new StorageError('PARSE_ERROR', 'Invalid library index');
      }

      const items: LibraryItemMeta[] = [];
      for (const item of value.items) {
        if (
          !item ||
          typeof item.kind !== 'string' ||
          typeof item.id !== 'string' ||
          typeof item.name !== 'string' ||
          typeof item.fileName !== 'string' ||
          typeof item.path !== 'string' ||
          typeof item.updatedAt !== 'string'
        ) {
          continue;
        }

        items.push({
          kind: item.kind,
          id: item.id,
          name: item.name,
          fileName: item.fileName,
          path: item.path,
          isFavorite: Boolean(item.isFavorite),
          favoritedAt: item.favoritedAt,
          createdAt: item.createdAt || item.updatedAt,
          updatedAt: item.updatedAt,
        });
      }

      return {
        items,
        updatedAt: value.updatedAt ?? nowIso(),
      };
    },
    'library',
  );
}

async function writeLibraryIndex(
  storage: FileStorageService,
  index: LibraryIndex,
): Promise<LibraryIndex> {
  const next: LibraryIndex = {
    items: index.items,
    updatedAt: nowIso(),
  };
  await storage.write(LIBRARY_PATH, JSON.stringify(next));
  return next;
}

export async function loadLibraryIndex(storage: FileStorageService): Promise<LibraryIndex> {
  if (!(await storage.exists(LIBRARY_PATH))) {
    return { items: [], updatedAt: nowIso() };
  }

  const raw = await storage.read(LIBRARY_PATH);
  return parseLibraryIndex(raw);
}

function parseSessionIdFromFileName(fileName: string): string | null {
  if (!fileName.startsWith(SESSION_PREFIX) || !fileName.endsWith('.json')) {
    return null;
  }
  const id = fileName.slice(SESSION_PREFIX.length, -'.json'.length);
  return id.trim() ? id : null;
}

function parsePresetSlugFromFileName(fileName: string): string | null {
  if (!fileName.endsWith('.json')) {
    return null;
  }
  const slug = fileName.slice(0, -'.json'.length);
  return slug.trim() ? slug : null;
}

export function parseSessionDocument(raw: string, path: string): SessionDocument {
  return parseStorageJson(
    raw,
    path,
    (parsed) => {
      const value = parsed as Partial<SessionDocument>;
      if (
        !value ||
        typeof value.id !== 'string' ||
        typeof value.name !== 'string' ||
        !value.text ||
        !Array.isArray(value.text.messages)
      ) {
        throw new StorageError('PARSE_ERROR', `Invalid session document: ${path}`);
      }

      return {
        schemaVersion: value.schemaVersion ?? OPFS_SCHEMA_VERSION,
        type: 'generator',
        subtype: 'session',
        id: value.id,
        name: value.name,
        text: {
          messages: value.text.messages,
          systemPromptSlug: value.text.systemPromptSlug,
          modelId: value.text.modelId,
        },
        createdAt: value.createdAt ?? nowIso(),
        updatedAt: value.updatedAt ?? nowIso(),
      };
    },
    'session',
  );
}

export function parsePreset(raw: string, path: string): SystemPromptPreset {
  return parseStorageJson(
    raw,
    path,
    (parsed) => {
      const value = parsed as Partial<SystemPromptPreset>;
      if (
        !value ||
        typeof value.slug !== 'string' ||
        typeof value.name !== 'string' ||
        typeof value.systemPrompt !== 'string'
      ) {
        throw new StorageError('PARSE_ERROR', `Invalid preset: ${path}`);
      }

      return {
        schemaVersion: value.schemaVersion ?? OPFS_SCHEMA_VERSION,
        name: value.name,
        slug: value.slug,
        systemPrompt: value.systemPrompt,
        type: 'system',
        createdAt: value.createdAt ?? nowIso(),
        updatedAt: value.updatedAt ?? nowIso(),
      };
    },
    'preset',
  );
}

async function readSessionCatalogFields(
  storage: FileStorageService,
  id: string,
): Promise<Pick<LibraryItemMeta, 'name' | 'createdAt' | 'updatedAt'>> {
  const path = sessionDocumentPath(id);
  const session = parseSessionDocument(await storage.read(path), path);
  return {
    name: session.name,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

async function readPresetCatalogFields(
  storage: FileStorageService,
  slug: string,
): Promise<Pick<LibraryItemMeta, 'name' | 'createdAt' | 'updatedAt'>> {
  const path = presetPath(slug);
  const preset = parsePreset(await storage.read(path), path);
  return {
    name: preset.name,
    createdAt: preset.createdAt,
    updatedAt: preset.updatedAt,
  };
}

export async function reconcileLibraryIndex(storage: FileStorageService): Promise<LibraryIndex> {
  const current = await loadLibraryIndex(storage);
  const byKey = indexByKey(current.items);
  const nextItems: LibraryItemMeta[] = [];

  const sessionEntries = await storage.list(PROMPTS_SESSIONS_DIR);
  for (const entry of sessionEntries) {
    if (entry.kind !== 'file') {
      continue;
    }
    const fileName = entry.path.split('/').pop() ?? '';
    const id = parseSessionIdFromFileName(fileName);
    if (!id) {
      continue;
    }

    const key = itemKey('session', id);
    const existing = byKey.get(key);
    try {
      const fields = await readSessionCatalogFields(storage, id);
      nextItems.push({
        kind: 'session',
        id,
        name: fields.name,
        fileName: sessionDocumentFileName(id),
        path: sessionDocumentPath(id),
        isFavorite: existing?.isFavorite ?? false,
        favoritedAt: existing?.isFavorite ? existing.favoritedAt : undefined,
        createdAt: fields.createdAt,
        updatedAt: fields.updatedAt,
      });
    } catch {
      if (existing) {
        nextItems.push(existing);
      }
    }
  }

  const presetEntries = await storage.list(PROMPTS_PRESET_DIR);
  for (const entry of presetEntries) {
    if (entry.kind !== 'file') {
      continue;
    }
    const fileName = entry.path.split('/').pop() ?? '';
    const slug = parsePresetSlugFromFileName(fileName);
    if (!slug) {
      continue;
    }

    const key = itemKey('prompt', slug);
    const existing = byKey.get(key);
    try {
      const fields = await readPresetCatalogFields(storage, slug);
      nextItems.push({
        kind: 'prompt',
        id: slug,
        name: fields.name,
        fileName: presetFileName(slug),
        path: presetPath(slug),
        isFavorite: existing?.isFavorite ?? false,
        favoritedAt: existing?.isFavorite ? existing.favoritedAt : undefined,
        createdAt: fields.createdAt,
        updatedAt: fields.updatedAt,
      });
    } catch {
      if (existing) {
        nextItems.push(existing);
      }
    }
  }

  return writeLibraryIndex(storage, {
    items: nextItems,
    updatedAt: nowIso(),
  });
}

export async function upsertLibraryItem(
  storage: FileStorageService,
  input: {
    kind: LibraryItemKind;
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
  },
): Promise<LibraryItemMeta> {
  const index = await loadLibraryIndex(storage);
  const byKey = indexByKey(index.items);
  const key = itemKey(input.kind, input.id);
  const existing = byKey.get(key);
  const { fileName, path } = libraryPathsForKind(input.kind, input.id);

  const nextItem: LibraryItemMeta = {
    kind: input.kind,
    id: input.id,
    name: input.name,
    fileName,
    path,
    isFavorite: existing?.isFavorite ?? false,
    favoritedAt: existing?.isFavorite ? existing.favoritedAt : undefined,
    createdAt: existing?.createdAt ?? input.createdAt,
    updatedAt: input.updatedAt,
  };

  byKey.set(key, nextItem);
  await writeLibraryIndex(storage, {
    items: [...byKey.values()],
    updatedAt: nowIso(),
  });
  return nextItem;
}

export async function removeLibraryItem(
  storage: FileStorageService,
  kind: LibraryItemKind,
  id: string,
): Promise<void> {
  const index = await loadLibraryIndex(storage);
  const byKey = indexByKey(index.items);
  byKey.delete(itemKey(kind, id));
  await writeLibraryIndex(storage, {
    items: [...byKey.values()],
    updatedAt: nowIso(),
  });
}

export async function listLibraryItems(
  storage: FileStorageService,
  kind?: LibraryItemKind,
): Promise<LibraryItemMeta[]> {
  const index = await loadLibraryIndex(storage);
  if (!kind) {
    return index.items;
  }
  return index.items.filter((item) => item.kind === kind);
}

export async function toggleFavorite(
  storage: FileStorageService,
  kind: LibraryItemKind,
  id: string,
): Promise<LibraryItemMeta> {
  const index = await loadLibraryIndex(storage);
  const byKey = indexByKey(index.items);
  const key = itemKey(kind, id);
  const item = byKey.get(key);
  if (!item) {
    throw new StorageError('NOT_FOUND', `Library item not found: ${kind}/${id}`);
  }

  const now = nowIso();
  const nextItem: LibraryItemMeta = item.isFavorite
    ? { ...item, isFavorite: false, favoritedAt: undefined }
    : { ...item, isFavorite: true, favoritedAt: now };

  byKey.set(key, nextItem);
  await writeLibraryIndex(storage, {
    items: [...byKey.values()],
    updatedAt: now,
  });
  return nextItem;
}
