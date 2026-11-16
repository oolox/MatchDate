/** Paired datePlan + dateTranscript + dateSummary on a character sheet. */

import type { DatePlanData } from '../features/chat/attach/datePlanAttach';
import { datePlanDataFromUnknown } from '../features/chat/attach/datePlanAttach';
import type { DateTranscriptData } from '../features/chat/attach/dateTranscriptAttach';
import { dateTranscriptDataFromUnknown } from '../features/chat/attach/dateTranscriptAttach';
import { dateSummaryDataFromUnknown } from '../features/chat/attach/dateSummaryAttach';
import type { DateSummaryData } from './dateSummary';

export interface DateHistoryEntry {
  datePlan?: DatePlanData;
  dateSummary?: DateSummaryData;
  dateTranscript?: DateTranscriptData;
}

export function dateHistoryMatchKey(location: string, dateTime: string): string {
  return `${location.trim().toLowerCase()}\0${dateTime.trim()}`;
}

export function dateHistoryEntryKey(entry: DateHistoryEntry): string | null {
  const location =
    entry.datePlan?.location ??
    entry.dateSummary?.location ??
    entry.dateTranscript?.location;
  const dateTime =
    entry.datePlan?.dateTime ??
    entry.dateSummary?.dateTime ??
    entry.dateTranscript?.dateTime;
  if (!location?.trim() || !dateTime?.trim()) {
    return null;
  }
  return dateHistoryMatchKey(location, dateTime);
}

function synthesizeDatePlan(entry: {
  datePlan?: DatePlanData;
  dateSummary?: DateSummaryData;
  dateTranscript?: DateTranscriptData;
}): DatePlanData | undefined {
  if (entry.datePlan) {
    return entry.datePlan;
  }
  const location =
    entry.dateTranscript?.location ?? entry.dateSummary?.location ?? '';
  const dateTime =
    entry.dateTranscript?.dateTime ?? entry.dateSummary?.dateTime ?? '';
  const characterIds =
    entry.dateTranscript?.characterIds ??
    entry.dateSummary?.character.map((c) => c.id) ??
    [];
  if (!location.trim() || !dateTime.trim() || characterIds.length === 0) {
    return undefined;
  }
  return datePlanDataFromUnknown({
    dateTime,
    location,
    characterIds,
  }) ?? undefined;
}

export function dateHistoryEntryFromUnknown(value: unknown): DateHistoryEntry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const datePlan =
    record.datePlan !== undefined
      ? datePlanDataFromUnknown(record.datePlan) ?? undefined
      : undefined;
  const dateSummary =
    record.dateSummary !== undefined
      ? dateSummaryDataFromUnknown(record.dateSummary) ?? undefined
      : undefined;
  const dateTranscript =
    record.dateTranscript !== undefined
      ? dateTranscriptDataFromUnknown(record.dateTranscript) ?? undefined
      : undefined;
  if (!datePlan && !dateSummary && !dateTranscript) {
    return null;
  }
  const withSides = {
    ...(datePlan ? { datePlan } : {}),
    ...(dateSummary ? { dateSummary } : {}),
    ...(dateTranscript ? { dateTranscript } : {}),
  };
  const backfilled = synthesizeDatePlan(withSides);
  return {
    ...withSides,
    ...(backfilled && !datePlan ? { datePlan: backfilled } : {}),
  };
}

export function normalizeDateHistory(value: unknown): DateHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const next: DateHistoryEntry[] = [];
  for (const entry of value) {
    const parsed = dateHistoryEntryFromUnknown(entry);
    if (parsed) {
      next.push(parsed);
    }
  }
  return next;
}

/**
 * Build `dateHistory` from the modern array and/or legacy parallel arrays.
 * `migrated` is true when legacy `dateSummary` / `dateTranscript` keys must be dropped on save.
 */
export function coerceDateHistory(raw: {
  dateHistory?: unknown;
  dateSummary?: unknown;
  dateTranscript?: unknown;
}): { dateHistory: DateHistoryEntry[]; migrated: boolean } {
  const hasLegacySummary = Object.prototype.hasOwnProperty.call(raw, 'dateSummary');
  const hasLegacyTranscript = Object.prototype.hasOwnProperty.call(raw, 'dateTranscript');
  const migrated = hasLegacySummary || hasLegacyTranscript;

  const existing = normalizeDateHistory(raw.dateHistory);
  if (existing.length > 0) {
    // Soft-backfill datePlan onto entries missing it (from transcript/summary meta).
    let changed = false;
    const withPlans = existing.map((entry) => {
      if (entry.datePlan) {
        return entry;
      }
      const plan = synthesizeDatePlan(entry);
      if (!plan) {
        return entry;
      }
      changed = true;
      return { ...entry, datePlan: plan };
    });
    return { dateHistory: withPlans, migrated: migrated || changed };
  }

  if (!migrated) {
    return { dateHistory: [], migrated: false };
  }

  const summaries: DateSummaryData[] = [];
  if (Array.isArray(raw.dateSummary)) {
    for (const entry of raw.dateSummary) {
      const parsed = dateSummaryDataFromUnknown(entry);
      if (parsed) {
        summaries.push(parsed);
      }
    }
  }

  const transcripts: DateTranscriptData[] = [];
  if (Array.isArray(raw.dateTranscript)) {
    for (const entry of raw.dateTranscript) {
      const parsed = dateTranscriptDataFromUnknown(entry);
      if (parsed) {
        transcripts.push(parsed);
      }
    }
  }

  if (summaries.length === 0 && transcripts.length === 0) {
    return { dateHistory: [], migrated: true };
  }

  const paired: DateHistoryEntry[] = [];
  const usedTranscripts = new Set<number>();

  for (const summary of summaries) {
    const key = dateHistoryMatchKey(summary.location, summary.dateTime);
    const transcriptIndex = transcripts.findIndex(
      (transcript, index) =>
        !usedTranscripts.has(index) &&
        dateHistoryMatchKey(transcript.location, transcript.dateTime) === key,
    );
    if (transcriptIndex >= 0) {
      usedTranscripts.add(transcriptIndex);
      const dateTranscript = transcripts[transcriptIndex];
      paired.push({
        dateSummary: summary,
        dateTranscript,
        ...(synthesizeDatePlan({ dateSummary: summary, dateTranscript })
          ? {
              datePlan: synthesizeDatePlan({
                dateSummary: summary,
                dateTranscript,
              }),
            }
          : {}),
      });
    } else {
      paired.push({
        dateSummary: summary,
        ...(synthesizeDatePlan({ dateSummary: summary })
          ? { datePlan: synthesizeDatePlan({ dateSummary: summary }) }
          : {}),
      });
    }
  }

  for (let index = 0; index < transcripts.length; index += 1) {
    if (usedTranscripts.has(index)) {
      continue;
    }
    const dateTranscript = transcripts[index];
    paired.push({
      dateTranscript,
      ...(synthesizeDatePlan({ dateTranscript })
        ? { datePlan: synthesizeDatePlan({ dateTranscript }) }
        : {}),
    });
  }

  return { dateHistory: paired, migrated: true };
}

/**
 * Upsert a plan into dateHistory (match location+dateTime; dedupe by plan id).
 * Returns the same array reference when unchanged.
 */
export function upsertDateHistoryPlan(
  existing: DateHistoryEntry[] | undefined,
  plan: DatePlanData,
): DateHistoryEntry[] {
  const list = Array.isArray(existing) ? existing : [];
  const planId = plan.id?.trim();
  if (planId && list.some((entry) => entry.datePlan?.id?.trim() === planId)) {
    return list;
  }

  const key = dateHistoryMatchKey(plan.location, plan.dateTime);
  const matchIndex = list.findIndex((entry) => dateHistoryEntryKey(entry) === key);
  if (matchIndex >= 0) {
    const prev = list[matchIndex];
    if (prev.datePlan) {
      return list;
    }
    const next = [...list];
    next[matchIndex] = { ...prev, datePlan: plan };
    return next;
  }

  return [...list, { datePlan: plan }];
}

/**
 * Upsert a transcript into dateHistory (match location+dateTime; dedupe by transcript id).
 * Returns the same array reference when unchanged.
 */
export function upsertDateHistoryTranscript(
  existing: DateHistoryEntry[] | undefined,
  transcript: DateTranscriptData,
): DateHistoryEntry[] {
  const list = Array.isArray(existing) ? existing : [];
  const transcriptId = transcript.id?.trim();
  if (transcriptId && list.some((entry) => entry.dateTranscript?.id?.trim() === transcriptId)) {
    return list;
  }

  const key = dateHistoryMatchKey(transcript.location, transcript.dateTime);
  const matchIndex = list.findIndex((entry) => dateHistoryEntryKey(entry) === key);
  if (matchIndex >= 0) {
    const prev = list[matchIndex];
    if (prev.dateTranscript) {
      return list;
    }
    const next = [...list];
    next[matchIndex] = { ...prev, dateTranscript: transcript };
    return next;
  }

  return [...list, { dateTranscript: transcript }];
}

/**
 * Upsert a summary into dateHistory (match location+dateTime; dedupe by summary id).
 * Returns the same array reference when unchanged.
 */
export function upsertDateHistorySummary(
  existing: DateHistoryEntry[] | undefined,
  summary: DateSummaryData,
): DateHistoryEntry[] {
  const list = Array.isArray(existing) ? existing : [];
  const summaryId = summary.id?.trim();
  if (summaryId && list.some((entry) => entry.dateSummary?.id?.trim() === summaryId)) {
    return list;
  }

  const key = dateHistoryMatchKey(summary.location, summary.dateTime);
  const matchIndex = list.findIndex((entry) => dateHistoryEntryKey(entry) === key);
  if (matchIndex >= 0) {
    const prev = list[matchIndex];
    if (prev.dateSummary) {
      return list;
    }
    const next = [...list];
    next[matchIndex] = { ...prev, dateSummary: summary };
    return next;
  }

  return [...list, { dateSummary: summary }];
}
