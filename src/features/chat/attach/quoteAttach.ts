/** Fenced JSON quote tool — display-only spoken dialogue (see docs/MD-quotes.md). */

export const QUOTE_TOOL = 'quote' as const;

export type QuoteToolOrigin = 'agent';
export type QuoteToolAction = 'display';

export interface QuoteToolData {
  /** Spoken line only — no speaker prefix. */
  quote: string;
  /** Character document GUID when known. */
  speaker?: string;
  /** First / display name for chrome and fallback. */
  speakerName: string;
}

export interface QuoteToolMessage {
  tool: typeof QUOTE_TOOL;
  origin: QuoteToolOrigin;
  action: QuoteToolAction;
  /** Quote instance id. Optional from the model; normalized if missing. */
  id?: string;
  data: QuoteToolData;
}

/** Stable non-UUID id when the model omits `id` (safe across re-renders). */
export function stableQuoteId(data: Pick<QuoteToolData, 'quote' | 'speaker' | 'speakerName'>): string {
  const raw = `${data.speaker?.trim() ?? ''}|${data.speakerName.trim()}|${data.quote.trim()}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `quote-${(hash >>> 0).toString(16)}`;
}

export function ensureQuoteToolId(message: QuoteToolMessage): QuoteToolMessage {
  const id = message.id?.trim();
  if (id) {
    return { ...message, id };
  }
  return { ...message, id: stableQuoteId(message.data) };
}

export function quoteDataFromUnknown(data: unknown): QuoteToolData | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const record = data as Record<string, unknown>;
  const quote = typeof record.quote === 'string' ? record.quote.trim() : '';
  const speakerName =
    typeof record.speakerName === 'string' ? record.speakerName.trim() : '';
  if (!quote || !speakerName) {
    return null;
  }
  const speaker =
    typeof record.speaker === 'string' && record.speaker.trim()
      ? record.speaker.trim()
      : undefined;
  return {
    quote,
    speakerName,
    ...(speaker ? { speaker } : {}),
  };
}
