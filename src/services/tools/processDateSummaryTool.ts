import {
  appendDateSummaryEntry,
  ensureDateSummaryToolId,
  type DateSummaryData,
  type DateSummaryToolMessage,
} from '../../features/chat/attach/dateSummaryAttach';
import { saveCharacterDocument, tryLoadCharacterDocument } from '../storage/characterPersistence';
import { getFileStorageService } from '../storage';
import type { CharacterDocument } from '../../types/character';

export type ProcessDateSummaryResult =
  | {
      ok: true;
      summary: DateSummaryData;
      updatedCharacterIds: string[];
      documents: CharacterDocument[];
    }
  | {
      ok: false;
      message: string;
      updatedCharacterIds: string[];
    };

/**
 * Append `dateSummary.data` onto every associated character document and save.
 * Dedupes by summary `id` when already present on a sheet.
 */
export async function processDateSummaryTool(
  message: DateSummaryToolMessage,
): Promise<ProcessDateSummaryResult> {
  const normalized = ensureDateSummaryToolId(message);
  const summary = normalized.data;
  const targetIds = [
    ...new Set(summary.character.map((entry) => entry.id.trim()).filter(Boolean)),
  ];

  if (targetIds.length === 0) {
    return {
      ok: false,
      message: 'dateSummary has no character ids',
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
      const prevLen = existing.dateSummary?.length ?? 0;
      const nextList = appendDateSummaryEntry(existing.dateSummary, summary);
      if (nextList.length === prevLen) {
        updatedCharacterIds.push(characterId);
        documents.push(existing);
        continue;
      }
      const saved = await saveCharacterDocument(storage, {
        ...existing,
        dateSummary: nextList,
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
      message: errors[0] ?? 'Failed to save dateSummary on characters',
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
    summary,
    updatedCharacterIds,
    documents,
  };
}
