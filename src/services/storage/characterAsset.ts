import type { Character } from '../../types/character';
import { BASIC_VALUES, createDefaultCharacter, isBasicValue } from '../../types/character';
import type { AssetDocument } from '../../types/opfsDoc';
import { OPFS_SCHEMA_VERSION } from '../../types/opfsDoc';
import { nowIso } from '../../utils/id';
import { assetFileName, assetPath } from './paths';

const CHARACTER_METADATA_KEY = 'character';

export function assetDocumentFromCharacter(
  character: Character,
  options: { id: string; createdAt?: string },
): AssetDocument {
  const id = options.id.trim();
  const name = character.name.trim() || 'Untitled character';
  const now = nowIso();

  return {
    schemaVersion: OPFS_SCHEMA_VERSION,
    type: 'asset',
    subtype: 'character',
    id,
    name,
    blobPath: assetPath(id),
    fileName: assetFileName(id),
    mimeType: 'application/json',
    metadata: { [CHARACTER_METADATA_KEY]: normalizeCharacter(character) },
    createdAt: options.createdAt ?? now,
    updatedAt: now,
    refs: {},
  };
}

export function characterFromAssetDocument(document: AssetDocument): Character {
  if (document.subtype !== 'character') {
    throw new Error(`Expected character asset, got subtype: ${document.subtype}`);
  }
  const raw = document.metadata?.[CHARACTER_METADATA_KEY];
  return parseCharacterPayload(raw, document.name);
}

function normalizeCharacter(character: Character): Character {
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

function parseCharacterPayload(raw: unknown, fallbackName: string): Character {
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
