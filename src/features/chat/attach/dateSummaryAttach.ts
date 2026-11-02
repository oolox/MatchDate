/** Fenced JSON dateSummary tool — display-only date report (prompt-matchDate Date section). */

export const DATE_SUMMARY_TOOL = 'dateSummary' as const;

export type DateSummaryToolOrigin = 'agent';
export type DateSummaryToolAction = 'display';

export interface DateSummaryCharacterEntry {
  /** Character document GUID. */
  id: string;
  /** ~50–100 words: how the date went from this character’s POV (feelings, opinions, honest feedback). */
  dateReview: string;
  /** How the date went (1 awful / terrible … 10 dream date). 0 = missing (legacy). */
  dateScore: number;
  /** How well this date type matches their ideal (1 nightmare … 10 perfect). 0 = missing (legacy). */
  dateFit: number;
}

export interface DateSummaryToolData {
  /** Few sentences on how the date went and the outcome vibe. */
  shortSummary: string;
  /** Concise compatibility justification (2–4 sentences). */
  justification: string;
  /** ~10–20 words describing where the date took place. */
  location: string;
  /** Per-character review + scores for everyone on the date. */
  character: DateSummaryCharacterEntry[];
  /** When the date happens (ISO-8601 preferred; human-readable / ranges allowed). */
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

function clampScore(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 10) {
    return 0;
  }
  return rounded;
}

/** Parse one character entry; only `id` is required (reviews/scores optional for legacy / streaming). */
export function dateSummaryCharacterFromUnknown(
  value: unknown,
): DateSummaryCharacterEntry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  if (!id) {
    return null;
  }
  const dateReview =
    typeof record.dateReview === 'string' ? record.dateReview.trim() : '';
  return {
    id,
    dateReview,
    dateScore: clampScore(record.dateScore),
    dateFit: clampScore(record.dateFit),
  };
}

function characterEntriesFromData(record: Record<string, unknown>): DateSummaryCharacterEntry[] {
  if (Array.isArray(record.character)) {
    const entries: DateSummaryCharacterEntry[] = [];
    for (const entry of record.character) {
      const parsed = dateSummaryCharacterFromUnknown(entry);
      if (parsed) {
        entries.push(parsed);
      }
    }
    if (entries.length > 0) {
      return entries;
    }
  }

  // Legacy shape: data.characters = string[] GUIDs (pre dateReview/score).
  if (Array.isArray(record.characters)) {
    return record.characters
      .filter((id): id is string => typeof id === 'string')
      .map((id) => id.trim())
      .filter(Boolean)
      .map((id) => ({
        id,
        dateReview: '',
        dateScore: 0,
        dateFit: 0,
      }));
  }

  return [];
}

/** Stable non-UUID id when the model omits `id` (safe across re-renders). */
export function stableDateSummaryId(
  data: Pick<DateSummaryToolData, 'shortSummary' | 'dateTime' | 'chatId' | 'character'>,
): string {
  const ids = data.character.map((entry) => entry.id).join(',');
  const raw = `${data.chatId.trim()}|${data.dateTime.trim()}|${ids}|${data.shortSummary.trim()}`;
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
  const justification =
    typeof record.justification === 'string' ? record.justification.trim() : '';
  const location = typeof record.location === 'string' ? record.location.trim() : '';
  const dateTime = typeof record.dateTime === 'string' ? record.dateTime.trim() : '';
  const chatId = typeof record.chatId === 'string' ? record.chatId.trim() : '';

  // `location` preferred; legacy tools may omit it (still render).
  if (!shortSummary || !justification || !dateTime || !chatId) {
    return null;
  }

  const character = characterEntriesFromData(record);
  if (character.length === 0) {
    return null;
  }

  return {
    shortSummary,
    justification,
    location,
    character,
    dateTime,
    chatId,
  };
}
