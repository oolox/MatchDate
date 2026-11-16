import {
  dateTranscriptAssociatedCharacterIds,
  ensureDateTranscriptToolId,
  type DateTranscriptData,
  type DateTranscriptToolMessage,
} from '../../features/chat/attach/dateTranscriptAttach';
import { upsertDateHistoryTranscript } from '../../types/dateHistory';
import { saveCharacterDocument, tryLoadCharacterDocument } from '../storage/characterPersistence';
import { getFileStorageService } from '../storage';
import type { CharacterDocument } from '../../types/character';

export type ProcessDateTranscriptResult =
  | {
      ok: true;
      transcript: DateTranscriptData;
      updatedCharacterIds: string[];
      documents: CharacterDocument[];
    }
  | {
      ok: false;
      message: string;
      updatedCharacterIds: string[];
    };

/**
 * Upsert `dateTranscript.data` into each associated character's `dateHistory` and save.
 * Dedupes by transcript `id` when already present; pairs with summary via location+dateTime.
 */
export async function processDateTranscriptTool(
  message: DateTranscriptToolMessage,
): Promise<ProcessDateTranscriptResult> {
  const normalized = ensureDateTranscriptToolId(message);
  const transcript = normalized.data;
  const targetIds = dateTranscriptAssociatedCharacterIds(transcript);

  if (targetIds.length === 0) {
    return {
      ok: false,
      message: 'dateTranscript has no character ids',
      updatedCharacterIds: [],
    };
  }

  const storage = getFileStorageService();
  const documents: CharacterDocument[] = [];
  const updatedCharacterIds: string[] = [];
  const errors: string[] = [];

  for (const characterId of targetIds) {
    try {
      const existing = await tryLoadCharacterDocument(storage, characterId);
      if (!existing) {
        errors.push(`Character not found: ${characterId}`);
        continue;
      }
      const prev = existing.dateHistory ?? [];
      const nextList = upsertDateHistoryTranscript(prev, transcript);
      if (nextList === prev) {
        updatedCharacterIds.push(characterId);
        documents.push(existing);
        continue;
      }
      const saved = await saveCharacterDocument(storage, {
        ...existing,
        dateHistory: nextList,
      });
      updatedCharacterIds.push(characterId);
      documents.push(saved);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      errors.push(`${characterId}: ${detail}`);
    }
  }

  if (updatedCharacterIds.length === 0) {
    return {
      ok: false,
      message: errors[0] ?? 'Failed to save dateTranscript on characters',
      updatedCharacterIds: [],
    };
  }

  if (errors.length > 0) {
    return {
      ok: false,
      message: errors.join('; '),
      updatedCharacterIds,
    };
  }

  return {
    ok: true,
    transcript,
    updatedCharacterIds,
    documents,
  };
}
