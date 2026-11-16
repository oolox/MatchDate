import {
  ensureQuoteToolId,
  quoteDataFromUnknown,
  QUOTE_TOOL,
  type QuoteToolData,
  type QuoteToolMessage,
} from './quoteAttach';

const JSON_FENCE_RE = /```json\s*([\s\S]*?)```/gi;

/** `data` is canonical. Also accept `quote` / `speakerName` on the envelope. */
function readQuoteData(value: object): QuoteToolData | null {
  const record = value as { data?: unknown };
  return quoteDataFromUnknown(record.data) ?? quoteDataFromUnknown(value);
}

export function isQuoteToolMessage(value: unknown): value is QuoteToolMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const message = value as Partial<QuoteToolMessage>;
  if (
    message.tool !== QUOTE_TOOL ||
    message.origin !== 'agent' ||
    message.action !== 'display' ||
    (message.id !== undefined && typeof message.id !== 'string')
  ) {
    return false;
  }
  return readQuoteData(value) != null;
}

/** Normalize a parsed quote tool (validate data + stamp stable id if missing). */
export function normalizeQuoteToolMessage(value: unknown): QuoteToolMessage | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const message = value as Partial<QuoteToolMessage>;
  if (!isQuoteToolMessage(value)) {
    return null;
  }
  const data = readQuoteData(value);
  if (!data) {
    return null;
  }
  return ensureQuoteToolId({
    tool: QUOTE_TOOL,
    origin: 'agent',
    action: 'display',
    ...(message.id?.trim() ? { id: message.id.trim() } : {}),
    data,
  });
}

/** Extract quote tool envelopes from fenced ```json blocks (display-only; never apply). */
export function parseQuoteToolMessages(content: string): QuoteToolMessage[] {
  const tools: QuoteToolMessage[] = [];
  for (const match of content.matchAll(JSON_FENCE_RE)) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }
    try {
      const normalized = normalizeQuoteToolMessage(JSON.parse(raw) as unknown);
      if (normalized) {
        tools.push(normalized);
      }
    } catch {
      // Not JSON or incomplete fence while streaming — ignore.
    }
  }
  return tools;
}
