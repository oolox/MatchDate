import type { Character, CharacterDocument } from '../../types/character';
import {
  BASIC_VALUES,
  createDefaultCharacter,
  isBasicValue,
} from '../../types/character';
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
    attributes: normalized.attributes,
    createdAt: options.createdAt ?? now,
    updatedAt: now,
  };
}

export function characterFromDocument(document: CharacterDocument): Character {
  return normalizeCharacter({
    name: document.name,
    attributes: document.attributes,
  });
}

export function normalizeCharacter(character: Character): Character {
  const byName = new Map(character.attributes.map((attribute) => [attribute.name, attribute]));
  return {
    name: character.name,
    attributes: BASIC_VALUES.map((name) => {
      const existing = byName.get(name);
      return {
        name,
        description: existing?.description ?? '',
        value: clampScore(existing?.value ?? 0),
      };
    }),
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

  return normalizeCharacter({ name, attributes });
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

  const saved: CharacterDocument = {
    ...document,
    schemaVersion: OPFS_SCHEMA_VERSION,
    type: 'character',
    id,
    name: document.name.trim() || 'Untitled character',
    attributes: normalizeCharacter({
      name: document.name,
      attributes: document.attributes,
    }).attributes,
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
