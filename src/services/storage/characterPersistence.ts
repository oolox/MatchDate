import type {
  Character,
  CharacterDocument,
  CharacterHistoryEntry,
  CharacterTrait,
} from '../../types/character';
import {
  BASIC_VALUES,
  createDefaultCharacter,
  isBasicValue,
  isCharacterHistoryEntry,
  isCharacterTrait,
  normalizeCharacterIdentity,
  normalizeCharacterTraitTags,
} from '../../types/character';
import { normalizeSavedImageRefs } from '../../types/savedImage';
import { OPFS_SCHEMA_VERSION } from '../../types/opfsDoc';
import { nowIso } from '../../utils/id';
import { removeLibraryItem, upsertLibraryItem } from './libraryIndex';
import { parseCharacterDocument } from './libraryRegistry';
import { characterDocumentPath } from './paths';
import type { FileStorageService } from './types';
import { StorageError } from './types';

export function characterDocumentFromCharacter(
  character: Character,
  options: { id: string; createdAt?: string },
): CharacterDocument {
  const id = options.id.trim();
  const normalized = normalizeCharacter(character);
  const now = nowIso();

  return {
    schemaVersion: OPFS_SCHEMA_VERSION,
    type: 'character',
    id,
    name: normalized.name.trim() || 'Untitled character',
    identity: normalized.identity,
    attributes: normalized.attributes,
    history: normalized.history,
    traits: normalized.traits,
    images: normalized.images,
    createdAt: options.createdAt ?? now,
    updatedAt: now,
  };
}

export function characterFromDocument(document: CharacterDocument): Character {
  return normalizeCharacter({
    name: document.name,
    identity: document.identity,
    attributes: document.attributes,
    history: document.history ?? [],
    traits: document.traits ?? [],
    images: document.images ?? [],
  });
}

/** Stamp `sessionId` onto newly created history/trait rows (no-op when empty). */
export function stampSessionId<T extends { sessionId?: string }>(
  items: T[],
  sessionId?: string | null,
): T[] {
  const id = sessionId?.trim();
  if (!id || items.length === 0) {
    return items;
  }
  return items.map((item) => ({ ...item, sessionId: id }));
}

export function normalizeHistory(history: unknown): CharacterHistoryEntry[] {
  if (!Array.isArray(history)) {
    return [];
  }
  return history.filter(isCharacterHistoryEntry).map((entry) => {
    const sessionId = entry.sessionId?.trim();
    return {
      at: entry.at,
      summary: entry.summary,
      ...(sessionId ? { sessionId } : {}),
    };
  });
}

export function normalizeTraits(traits: unknown): CharacterTrait[] {
  if (!Array.isArray(traits)) {
    return [];
  }
  return traits.filter(isCharacterTrait).map((trait) => {
    const sessionId = trait.sessionId?.trim();
    return {
      at: trait.at,
      name: trait.name.trim(),
      value: trait.value.trim(),
      tags: normalizeCharacterTraitTags(trait.tags),
      ...(sessionId ? { sessionId } : {}),
    };
  });
}

/** Upsert traits by name (case-insensitive); patch entries win. */
export function mergeTraitPatches(
  existing: CharacterTrait[],
  patch: unknown,
  options?: { sessionId?: string | null },
): { traits: CharacterTrait[]; changed: boolean } {
  if (!Array.isArray(patch)) {
    return { traits: existing, changed: false };
  }

  const normalizedPatch = stampSessionId(normalizeTraits(patch), options?.sessionId);
  if (normalizedPatch.length === 0) {
    return { traits: existing, changed: false };
  }

  const byKey = new Map(
    existing.map((trait) => [trait.name.trim().toLowerCase(), trait] as const),
  );
  let changed = false;

  for (const trait of normalizedPatch) {
    const key = trait.name.toLowerCase();
    const previous = byKey.get(key);
    if (
      !previous ||
      previous.value !== trait.value ||
      previous.at !== trait.at ||
      previous.name !== trait.name ||
      previous.sessionId !== trait.sessionId ||
      (previous.tags ?? []).join('\0') !== trait.tags.join('\0')
    ) {
      changed = true;
    }
    byKey.set(key, trait);
  }

  return { traits: [...byKey.values()], changed };
}

export function normalizeCharacter(character: Character): Character {
  const byName = new Map(character.attributes.map((attribute) => [attribute.name, attribute]));
  return {
    name: character.name,
    identity: normalizeCharacterIdentity(character.identity),
    attributes: BASIC_VALUES.map((name) => {
      const existing = byName.get(name);
      return {
        name,
        description: existing?.description ?? '',
        value: clampScore(existing?.value ?? 0),
      };
    }),
    history: normalizeHistory(character.history),
    traits: normalizeTraits(character.traits),
    images: normalizeSavedImageRefs(character.images),
  };
}

export function parseCharacterPayload(raw: unknown, fallbackName: string): Character {
  if (!raw || typeof raw !== 'object') {
    return createDefaultCharacter(fallbackName);
  }

  const value = raw as Partial<Character>;
  const name = typeof value.name === 'string' ? value.name : fallbackName;
  if (!Array.isArray(value.attributes)) {
    return createDefaultCharacter(name);
  }

  const attributes = value.attributes
    .filter(
      (attribute): attribute is Character['attributes'][number] =>
        !!attribute &&
        typeof attribute === 'object' &&
        isBasicValue((attribute as Character['attributes'][number]).name) &&
        typeof (attribute as Character['attributes'][number]).description === 'string' &&
        typeof (attribute as Character['attributes'][number]).value === 'number',
    )
    .map((attribute) => ({
      name: attribute.name,
      description: attribute.description,
      value: clampScore(attribute.value),
    }));

  return normalizeCharacter({
    name,
    identity: normalizeCharacterIdentity(value.identity),
    attributes,
    history: normalizeHistory(value.history),
    traits: normalizeTraits(value.traits),
    images: normalizeSavedImageRefs(value.images),
  });
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

export async function saveCharacterDocument(
  storage: FileStorageService,
  document: CharacterDocument,
): Promise<CharacterDocument> {
  const id = document.id.trim();
  if (!id) {
    throw new StorageError('PARSE_ERROR', 'character id is required');
  }

  const now = nowIso();
  const path = characterDocumentPath(id);
  let createdAt = document.createdAt || now;
  if (await storage.exists(path)) {
    try {
      const existing = parseCharacterDocument(await storage.read(path), path);
      createdAt = existing.createdAt;
    } catch (error) {
      console.info('Could not read existing character createdAt; keeping document value', {
        id,
        error,
      });
    }
  }

  const normalized = normalizeCharacter({
    name: document.name,
    identity: document.identity,
    attributes: document.attributes,
    history: document.history ?? [],
    traits: document.traits ?? [],
    images: document.images ?? [],
  });

  const saved: CharacterDocument = {
    ...document,
    schemaVersion: OPFS_SCHEMA_VERSION,
    type: 'character',
    id,
    name: normalized.name.trim() || 'Untitled character',
    identity: normalized.identity,
    attributes: normalized.attributes,
    history: normalized.history,
    traits: normalized.traits,
    images: normalized.images,
    createdAt,
    updatedAt: now,
  };

  await storage.write(path, JSON.stringify(saved, null, 2));
  await upsertLibraryItem(storage, {
    kind: 'character',
    id: saved.id,
    name: saved.name,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
    type: 'character',
    subtype: 'character',
    identity: saved.identity,
  });
  return saved;
}

export async function loadCharacterDocument(
  storage: FileStorageService,
  id: string,
): Promise<CharacterDocument> {
  const path = characterDocumentPath(id);
  return parseCharacterDocument(await storage.read(path), path);
}

export async function tryLoadCharacterDocument(
  storage: FileStorageService,
  id: string,
): Promise<CharacterDocument | null> {
  const path = characterDocumentPath(id);
  if (!(await storage.exists(path))) {
    return null;
  }
  try {
    return parseCharacterDocument(await storage.read(path), path);
  } catch {
    return null;
  }
}

export async function deleteCharacterDocument(
  storage: FileStorageService,
  id: string,
): Promise<void> {
  const path = characterDocumentPath(id);
  if (await storage.exists(path)) {
    await storage.delete(path);
  }
  await removeLibraryItem(storage, 'character', id);
}
