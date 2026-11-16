/** Fenced JSON datePlan tool — dateTime + location (+ who) before the scene. */

export const DATE_PLAN_TOOL = 'datePlan' as const;

export type DatePlanToolOrigin = 'agent';
export type DatePlanToolAction = 'display';

export interface DatePlanData {
  id?: string;
  /** When the date happens — ISO-8601 preferred. */
  dateTime: string;
  /** ~10–20 words where the date takes place. */
  location: string;
  /** Character document GUIDs on this date (persist targets). */
  characterIds: string[];
}

export interface DatePlanToolMessage {
  tool: typeof DATE_PLAN_TOOL;
  origin: DatePlanToolOrigin;
  action: DatePlanToolAction;
  data: DatePlanData;
}

export function stableDatePlanId(
  data: Pick<DatePlanData, 'location' | 'dateTime' | 'characterIds'>,
): string {
  const raw = [
    data.location.trim(),
    data.dateTime.trim(),
    data.characterIds.join(','),
  ].join('|');
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `datePlan-${(hash >>> 0).toString(16)}`;
}

export function ensureDatePlanToolId(message: DatePlanToolMessage): DatePlanToolMessage {
  const id = message.data.id?.trim();
  if (id) {
    return { ...message, data: { ...message.data, id } };
  }
  return {
    ...message,
    data: { ...message.data, id: stableDatePlanId(message.data) },
  };
}

function characterIdsFromRecord(record: Record<string, unknown>): string[] {
  const fromField: string[] = [];
  if (Array.isArray(record.characterIds)) {
    for (const entry of record.characterIds) {
      if (typeof entry === 'string' && entry.trim()) {
        fromField.push(entry.trim());
      }
    }
  }
  return [...new Set(fromField)];
}

export function datePlanAssociatedCharacterIds(data: DatePlanData): string[] {
  return [...new Set(data.characterIds.map((id) => id.trim()).filter(Boolean))];
}

/**
 * Full parse for a completed tool. Requires dateTime, location, and at least
 * one characterId.
 */
export function datePlanDataFromUnknown(data: unknown): DatePlanData | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const record = data as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const location =
    typeof record.location === 'string' && record.location.trim()
      ? record.location.trim()
      : typeof record.description === 'string'
        ? record.description.trim()
        : '';
  const dateTime = typeof record.dateTime === 'string' ? record.dateTime.trim() : '';
  const characterIds = characterIdsFromRecord(record);
  if (!location || !dateTime || characterIds.length === 0) {
    return null;
  }
  return {
    ...(id ? { id } : {}),
    dateTime,
    location,
    characterIds,
  };
}

/** Build a plan stub from transcript/summary meta (legacy backfill). */
export function datePlanFromMeta(meta: {
  id?: string;
  dateTime: string;
  location: string;
  characterIds: string[];
}): DatePlanData | null {
  return datePlanDataFromUnknown(meta);
}
