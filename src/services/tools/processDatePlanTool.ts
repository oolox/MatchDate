import {
  datePlanAssociatedCharacterIds,
  ensureDatePlanToolId,
  type DatePlanData,
  type DatePlanToolMessage,
} from '../../features/chat/attach/datePlanAttach';
import { upsertDateHistoryPlan } from '../../types/dateHistory';
import { saveCharacterDocument, tryLoadCharacterDocument } from '../storage/characterPersistence';
import { getFileStorageService } from '../storage';
import type { CharacterDocument } from '../../types/character';

export type ProcessDatePlanResult =
  | {
      ok: true;
      plan: DatePlanData;
      updatedCharacterIds: string[];
      documents: CharacterDocument[];
    }
  | {
      ok: false;
      message: string;
      updatedCharacterIds: string[];
    };

/**
 * Upsert `datePlan.data` into each associated character's `dateHistory` and save.
 * Dedupes by plan `id` when already present; pairs via location+dateTime.
 */
export async function processDatePlanTool(
  message: DatePlanToolMessage,
): Promise<ProcessDatePlanResult> {
  const normalized = ensureDatePlanToolId(message);
  const plan = normalized.data;
  const targetIds = datePlanAssociatedCharacterIds(plan);

  if (targetIds.length === 0) {
    return {
      ok: false,
      message: 'datePlan has no character ids',
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
      const nextList = upsertDateHistoryPlan(prev, plan);
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
      message: errors[0] ?? 'Failed to save datePlan on characters',
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
    plan,
    updatedCharacterIds,
    documents,
  };
}
