/** Fenced JSON dateSummary tool — display-only date report (prompt-matchDate Date section). */

export const DATE_SUMMARY_TOOL = 'dateSummary' as const;

export type DateSummaryToolOrigin = 'agent';
export type DateSummaryToolAction = 'display';

export interface DateSummaryToolData {
  /** Few sentences on how the date went and the outcome vibe. */
  shortSummary: string;
  /** Dialogue/action log (may include location; beats in order). */
  transcript: string;
  /** Concise compatibility justification (2–4 sentences). */
  justification: string;
  /** Character document GUIDs included in this date. */
  characters: string[];
  /** When the date happens (ISO-8601 preferred; human-readable allowed). */
  dateTime: string;
  /** Chat / session id this summary belongs to. */
  chatId: string;
}

export interface DateSummaryToolMessage {
  tool: typeof DATE_SUMMARY_TOOL;
  origin: DateSummaryToolOrigin;
  action: DateSummaryToolAction;
  /** Summary instance id. Optional from the model; normalized if missing. */
  id?: string;
  data: DateSummaryToolData;
}

/** Stable non-UUID id when the model omits `id` (safe across re-renders). */
export function stableDateSummaryId(
  data: Pick<DateSummaryToolData, 'shortSummary' | 'dateTime' | 'chatId' | 'characters'>,
): string {
  const raw = `${data.chatId.trim()}|${data.dateTime.trim()}|${data.characters.join(',')}|${data.shortSummary.trim()}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `dateSummary-${(hash >>> 0).toString(16)}`;
}

export function ensureDateSummaryToolId(message: DateSummaryToolMessage): DateSummaryToolMessage {
  const id = message.id?.trim();
  if (id) {
    return { ...message, id };
  }
  return { ...message, id: stableDateSummaryId(message.data) };
}

export function dateSummaryDataFromUnknown(data: unknown): DateSummaryToolData | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const record = data as Record<string, unknown>;
  const shortSummary =
    typeof record.shortSummary === 'string' ? record.shortSummary.trim() : '';
  const transcript = typeof record.transcript === 'string' ? record.transcript.trim() : '';
  const justification =
    typeof record.justification === 'string' ? record.justification.trim() : '';
  const dateTime = typeof record.dateTime === 'string' ? record.dateTime.trim() : '';
  const chatId = typeof record.chatId === 'string' ? record.chatId.trim() : '';

  if (!shortSummary || !transcript || !justification || !dateTime || !chatId) {
    return null;
  }

  if (!Array.isArray(record.characters)) {
    return null;
  }
  const characters = record.characters
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.trim())
    .filter(Boolean);
  if (characters.length === 0) {
    return null;
  }

  return {
    shortSummary,
    transcript,
    justification,
    characters,
    dateTime,
    chatId,
  };
}
