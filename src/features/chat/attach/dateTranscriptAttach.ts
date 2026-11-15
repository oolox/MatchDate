/** Fenced JSON dateTranscript tool — live date scene (header meta + segments). */

import { quoteDataFromUnknown, stableQuoteId, type QuoteToolData } from './quoteAttach';

export const DATE_TRANSCRIPT_TOOL = 'dateTranscript' as const;

export type DateTranscriptToolOrigin = 'agent';
export type DateTranscriptToolAction = 'display';

export type DateTranscriptTextSegment = {
  type: 'text';
  text: string;
};

export type DateTranscriptQuoteSegment = {
  type: 'quote';
  id?: string;
  quote: string;
  speaker?: string;
  speakerName: string;
};

export type DateTranscriptSegment = DateTranscriptTextSegment | DateTranscriptQuoteSegment;

export interface DateTranscriptData {
  id?: string;
  /** What the date is (outing description) — set before the scene. */
  description: string;
  /** When the date happens — ISO-8601 preferred. Must match dateSummary.dateTime. */
  dateTime: string;
  /** Character document GUIDs on this date (persist targets). */
  characterIds: string[];
  /** Ordered scene beats — narration and spoken lines. */
  segments: DateTranscriptSegment[];
}

export interface DateTranscriptToolMessage {
  tool: typeof DATE_TRANSCRIPT_TOOL;
  origin: DateTranscriptToolOrigin;
  action: DateTranscriptToolAction;
  data: DateTranscriptData;
}

export function stableDateTranscriptId(
  data: Pick<DateTranscriptData, 'description' | 'dateTime' | 'characterIds' | 'segments'>,
): string {
  const raw = [
    data.description.trim(),
    data.dateTime.trim(),
    data.characterIds.join(','),
    ...data.segments.map((segment) => {
      if (segment.type === 'text') {
        return `t:${segment.text}`;
      }
      return `q:${segment.speakerName}|${segment.quote}`;
    }),
  ].join('\n');
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `dateTranscript-${(hash >>> 0).toString(16)}`;
}

export function ensureDateTranscriptToolId(
  message: DateTranscriptToolMessage,
): DateTranscriptToolMessage {
  const id = message.data.id?.trim();
  if (id) {
    return { ...message, data: { ...message.data, id } };
  }
  return {
    ...message,
    data: { ...message.data, id: stableDateTranscriptId(message.data) },
  };
}

function quoteSegmentFromUnknown(value: unknown): DateTranscriptQuoteSegment | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.type !== 'quote') {
    return null;
  }
  const quoteData: QuoteToolData | null = quoteDataFromUnknown({
    quote: record.quote,
    speaker: record.speaker,
    speakerName: record.speakerName,
  });
  if (!quoteData) {
    return null;
  }
  const id =
    typeof record.id === 'string' && record.id.trim()
      ? record.id.trim()
      : stableQuoteId(quoteData);
  return {
    type: 'quote',
    id,
    quote: quoteData.quote,
    speakerName: quoteData.speakerName,
    ...(quoteData.speaker ? { speaker: quoteData.speaker } : {}),
  };
}

function textSegmentFromUnknown(value: unknown): DateTranscriptTextSegment | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.type !== 'text') {
    return null;
  }
  const text = typeof record.text === 'string' ? record.text.trim() : '';
  if (!text) {
    return null;
  }
  return { type: 'text', text };
}

export function dateTranscriptSegmentFromUnknown(
  value: unknown,
): DateTranscriptSegment | null {
  return textSegmentFromUnknown(value) ?? quoteSegmentFromUnknown(value);
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

/** Character ids from explicit list + quote speakers. */
export function dateTranscriptAssociatedCharacterIds(
  data: DateTranscriptData,
): string[] {
  const ids = [...data.characterIds];
  for (const segment of data.segments) {
    if (segment.type === 'quote' && segment.speaker?.trim()) {
      ids.push(segment.speaker.trim());
    }
  }
  return [...new Set(ids)];
}

export function appendDateTranscriptEntry(
  existing: DateTranscriptData[] | undefined,
  entry: DateTranscriptData,
): DateTranscriptData[] {
  const list = Array.isArray(existing) ? existing : [];
  const id = entry.id?.trim();
  if (id && list.some((item) => item.id?.trim() === id)) {
    return list;
  }
  return [...list, entry];
}

/**
 * Full parse for a completed tool. Requires description, dateTime, and at least
 * one segment. characterIds may be empty here (speakers can still associate).
 */
export function dateTranscriptDataFromUnknown(data: unknown): DateTranscriptData | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const record = data as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const description =
    typeof record.description === 'string' ? record.description.trim() : '';
  const dateTime = typeof record.dateTime === 'string' ? record.dateTime.trim() : '';
  if (!description || !dateTime || !Array.isArray(record.segments)) {
    return null;
  }
  const segments: DateTranscriptSegment[] = [];
  for (const entry of record.segments) {
    const parsed = dateTranscriptSegmentFromUnknown(entry);
    if (parsed) {
      segments.push(parsed);
    }
  }
  if (segments.length === 0) {
    return null;
  }
  return {
    ...(id ? { id } : {}),
    description,
    dateTime,
    characterIds: characterIdsFromRecord(record),
    segments,
  };
}
