import type { CharacterToolMessage } from '../../features/chat/attach/jsonAttach';
import { CHARACTER_TOOL } from '../../features/chat/attach/jsonAttach';
import type { Character, CharacterDocument, ValueScore } from '../../types/character';
import { BASIC_VALUES, isBasicValue } from '../../types/character';
import {
  characterDocumentFromCharacter,
  characterFromDocument,
  normalizeHistory,
  saveCharacterDocument,
  tryLoadCharacterDocument,
} from '../storage/characterPersistence';
import { getFileStorageService } from '../storage';

export type CharacterUpdateField = 'history' | 'attributes' | 'name';

export type ProcessCharacterToolSuccess = {
  ok: true;
  tool: typeof CHARACTER_TOOL;
  action: 'update';
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

function joinFieldLabels(fields: string[]): string {
  if (fields.length === 1) {
    return fields[0]!;
  }
  if (fields.length === 2) {
    return `${fields[0]} and ${fields[1]}`;
  }
  return `${fields.slice(0, -1).join(', ')}, and ${fields[fields.length - 1]}`;
}

/** Toast copy after a successful character.update apply. */
export function formatCharacterToolToast(result: ProcessCharacterToolSuccess): string {
  const parts = result.updatedFields.filter(
    (field): field is 'history' | 'attributes' =>
      field === 'history' || field === 'attributes',
  );
  if (parts.length === 0) {
    return `Updated ${result.name}`;
  }
  return `Updated ${result.name}'s ${joinFieldLabels(parts)}`;
}

/** Merge an agent character.update `data` patch onto an existing character (history append). */
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
    },
    appendedHistoryCount: historyAdditions.length,
    updatedFields,
  };
}

/**
 * Process a character tool message. Currently supports `action: "update"`:
 * look up library character by id and merge `data.history` (append) + optional name/attributes.
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

  if (message.action !== 'update') {
    return {
      ok: false,
      tool: CHARACTER_TOOL,
      action: message.action,
      id: message.id,
      reason: 'unsupported_action',
      message: `Unsupported character action: ${message.action}`,
    };
  }

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
      message: 'character.update data had no history, attributes, or name changes',
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
