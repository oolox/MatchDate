import type { CharacterToolMessage } from '../../features/chat/attach/jsonAttach';
import { CHARACTER_TOOL } from '../../features/chat/attach/jsonAttach';
import type { Character, CharacterDocument, ValueScore } from '../../types/character';
import { BASIC_VALUES, createDefaultCharacter, isBasicValue } from '../../types/character';
import { createId } from '../../utils/id';
import {
  characterDocumentFromCharacter,
  characterFromDocument,
  mergeTraitPatches,
  normalizeHistory,
  saveCharacterDocument,
  tryLoadCharacterDocument,
} from '../storage/characterPersistence';
import { getFileStorageService } from '../storage';

export type CharacterUpdateField = 'history' | 'attributes' | 'traits' | 'name';

export type ProcessCharacterToolSuccess = {
  ok: true;
  tool: typeof CHARACTER_TOOL;
  action: 'update' | 'create';
  id: string;
  name: string;
  document: CharacterDocument;
  appendedHistoryCount: number;
  updatedFields: CharacterUpdateField[];
};

export type ProcessCharacterToolFailure = {
  ok: false;
  tool: typeof CHARACTER_TOOL;
  action?: CharacterToolMessage['action'];
  id?: string;
  reason:
    | 'unsupported_action'
    | 'missing_id'
    | 'not_found'
    | 'invalid_data'
    | 'empty_patch';
  message: string;
};

export type ProcessCharacterToolResult =
  | ProcessCharacterToolSuccess
  | ProcessCharacterToolFailure;

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function mergeAttributePatches(
  existing: ValueScore[],
  patch: unknown,
): ValueScore[] {
  if (!Array.isArray(patch)) {
    return existing;
  }

  const byName = new Map(existing.map((attribute) => [attribute.name, attribute]));
  for (const item of patch) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const candidate = item as Partial<ValueScore>;
    if (!isBasicValue(candidate.name) || typeof candidate.value !== 'number') {
      continue;
    }
    const previous = byName.get(candidate.name);
    byName.set(candidate.name, {
      name: candidate.name,
      description:
        typeof candidate.description === 'string'
          ? candidate.description
          : (previous?.description ?? ''),
      value: clampScore(candidate.value),
    });
  }

  return BASIC_VALUES.map(
    (name) => byName.get(name) ?? { name, description: '', value: 0 },
  );
}

function fieldLabel(field: 'history' | 'attributes' | 'traits'): string {
  switch (field) {
    case 'history':
      return 'History';
    case 'traits':
      return 'Trait';
    case 'attributes':
      return 'Attributes';
  }
}

/** Toast copy after a successful character update/create apply. */
export function formatCharacterToolToast(result: ProcessCharacterToolSuccess): string {
  if (result.action === 'create') {
    return `Created ${result.name}`;
  }
  const parts = result.updatedFields
    .filter(
      (field): field is 'history' | 'attributes' | 'traits' =>
        field === 'history' || field === 'attributes' || field === 'traits',
    )
    .map(fieldLabel);
  if (parts.length === 0) {
    return `Updated ${result.name}`;
  }
  return `Updated ${result.name} ${parts.join(' | ')}`;
}

/**
 * Build a Character from an agent `character.create` data payload.
 * Requires a non-empty name; fills default ValueScores and merges any patch fields.
 */
export function characterFromCreateData(data: unknown): Character | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const patch = data as {
    name?: unknown;
    history?: unknown;
    attributes?: unknown;
    traits?: unknown;
  };

  const name = typeof patch.name === 'string' ? patch.name.trim() : '';
  if (!name) {
    return null;
  }

  const base = createDefaultCharacter(name);
  const traitsMerged = mergeTraitPatches([], patch.traits);

  return {
    name,
    attributes: mergeAttributePatches(base.attributes, patch.attributes),
    history: normalizeHistory(patch.history),
    traits: traitsMerged.traits,
  };
}

/** Merge an agent character.update `data` patch onto an existing character. */
export function applyCharacterUpdatePatch(
  existing: Character,
  data: unknown,
): {
  character: Character;
  appendedHistoryCount: number;
  updatedFields: CharacterUpdateField[];
} | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const patch = data as {
    name?: unknown;
    history?: unknown;
    attributes?: unknown;
    traits?: unknown;
  };

  const historyAdditions = normalizeHistory(patch.history);
  const nextAttributes = mergeAttributePatches(existing.attributes, patch.attributes);
  const attributesChanged = nextAttributes.some((attribute, index) => {
    const prev = existing.attributes[index];
    return (
      !prev ||
      prev.value !== attribute.value ||
      prev.description !== attribute.description
    );
  });
  const traitsMerged = mergeTraitPatches(existing.traits ?? [], patch.traits);

  const nextName =
    typeof patch.name === 'string' && patch.name.trim()
      ? patch.name.trim()
      : existing.name;
  const nameChanged = nextName !== existing.name;

  const updatedFields: CharacterUpdateField[] = [];
  if (historyAdditions.length > 0) {
    updatedFields.push('history');
  }
  if (attributesChanged) {
    updatedFields.push('attributes');
  }
  if (traitsMerged.changed) {
    updatedFields.push('traits');
  }
  if (nameChanged) {
    updatedFields.push('name');
  }

  if (updatedFields.length === 0) {
    return null;
  }

  return {
    character: {
      name: nextName,
      attributes: nextAttributes,
      history: [...existing.history, ...historyAdditions],
      traits: traitsMerged.traits,
    },
    appendedHistoryCount: historyAdditions.length,
    updatedFields,
  };
}

async function processCharacterCreate(
  message: CharacterToolMessage,
): Promise<ProcessCharacterToolResult> {
  const character = characterFromCreateData(message.data);
  if (!character) {
    return {
      ok: false,
      tool: CHARACTER_TOOL,
      action: 'create',
      id: message.id,
      reason: 'invalid_data',
      message: 'character.create requires data with a non-empty name',
    };
  }

  const suggestedId = message.id?.trim();
  const storage = getFileStorageService();
  let id = suggestedId || createId();
  if (suggestedId) {
    const existing = await tryLoadCharacterDocument(storage, suggestedId);
    if (existing) {
      id = createId();
    }
  }

  const document = await saveCharacterDocument(
    storage,
    characterDocumentFromCharacter(character, { id }),
  );

  return {
    ok: true,
    tool: CHARACTER_TOOL,
    action: 'create',
    id: document.id,
    name: document.name,
    document,
    appendedHistoryCount: character.history.length,
    updatedFields: ['name', 'attributes', 'history', 'traits'],
  };
}

async function processCharacterUpdate(
  message: CharacterToolMessage,
): Promise<ProcessCharacterToolResult> {
  const id = message.id?.trim();
  if (!id) {
    return {
      ok: false,
      tool: CHARACTER_TOOL,
      action: 'update',
      reason: 'missing_id',
      message: 'character.update requires id',
    };
  }

  const storage = getFileStorageService();
  const existingDoc = await tryLoadCharacterDocument(storage, id);
  if (!existingDoc) {
    return {
      ok: false,
      tool: CHARACTER_TOOL,
      action: 'update',
      id,
      reason: 'not_found',
      message: `Character not found: ${id}`,
    };
  }

  if (message.data === undefined) {
    return {
      ok: false,
      tool: CHARACTER_TOOL,
      action: 'update',
      id,
      reason: 'invalid_data',
      message: 'character.update requires data',
    };
  }

  const existing = characterFromDocument(existingDoc);
  const merged = applyCharacterUpdatePatch(existing, message.data);
  if (!merged) {
    return {
      ok: false,
      tool: CHARACTER_TOOL,
      action: 'update',
      id,
      reason: 'empty_patch',
      message: 'character.update data had no history, traits, attributes, or name changes',
    };
  }

  const document = await saveCharacterDocument(
    storage,
    characterDocumentFromCharacter(merged.character, {
      id,
      createdAt: existingDoc.createdAt,
    }),
  );

  return {
    ok: true,
    tool: CHARACTER_TOOL,
    action: 'update',
    id,
    name: document.name,
    document,
    appendedHistoryCount: merged.appendedHistoryCount,
    updatedFields: merged.updatedFields,
  };
}

/**
 * Process a character tool message.
 * - `update`: merge patch into library character by id
 * - `create`: save a new library character (call after user accept)
 */
export async function processCharacterTool(
  message: CharacterToolMessage,
): Promise<ProcessCharacterToolResult> {
  if (message.tool !== CHARACTER_TOOL) {
    return {
      ok: false,
      tool: CHARACTER_TOOL,
      action: message.action,
      id: message.id,
      reason: 'unsupported_action',
      message: `Unsupported tool: ${String(message.tool)}`,
    };
  }

  if (message.action === 'create') {
    return processCharacterCreate(message);
  }

  if (message.action === 'update') {
    return processCharacterUpdate(message);
  }

  return {
    ok: false,
    tool: CHARACTER_TOOL,
    action: message.action,
    id: message.id,
    reason: 'unsupported_action',
    message: `Unsupported character action: ${message.action}`,
  };
}
