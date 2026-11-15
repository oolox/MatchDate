import {
  appendDateTranscriptEntry,
  dateTranscriptAssociatedCharacterIds,
  ensureDateTranscriptToolId,
  type DateTranscriptData,
  type DateTranscriptToolMessage,
} from '../../features/chat/attach/dateTranscriptAttach';
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
 * Append `dateTranscript.data` onto every associated character document and save.
 * Dedupes by transcript `id` when already present on a sheet.
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
      const prevLen = existing.dateTranscript?.length ?? 0;
      const nextList = appendDateTranscriptEntry(existing.dateTranscript, transcript);
      if (nextList.length === prevLen) {
        updatedCharacterIds.push(characterId);
        documents.push(existing);
        continue;
      }
      const saved = await saveCharacterDocument(storage, {
        ...existing,
        dateTranscript: nextList,
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
