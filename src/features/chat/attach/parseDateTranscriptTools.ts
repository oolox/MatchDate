import {
  DATE_TRANSCRIPT_TOOL,
  dateTranscriptDataFromUnknown,
  ensureDateTranscriptToolId,
  type DateTranscriptToolMessage,
} from './dateTranscriptAttach';

const JSON_FENCE_RE = /```json\s*([\s\S]*?)```/gi;

export function isDateTranscriptToolMessage(
  value: unknown,
): value is DateTranscriptToolMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const message = value as Partial<DateTranscriptToolMessage> & { id?: unknown };
  if (
    message.tool !== DATE_TRANSCRIPT_TOOL ||
    message.origin !== 'agent' ||
    message.action !== 'display'
  ) {
    return false;
  }
  if (message.id !== undefined && typeof message.id !== 'string') {
    return false;
  }
  return dateTranscriptDataFromUnknown(message.data) != null;
}

export function normalizeDateTranscriptToolMessage(
  value: unknown,
): DateTranscriptToolMessage | null {
  if (!isDateTranscriptToolMessage(value)) {
    return null;
  }
  const data = dateTranscriptDataFromUnknown(value.data);
  if (!data) {
    return null;
  }
  const legacyEnvelopeId =
    typeof (value as { id?: unknown }).id === 'string'
      ? ((value as { id: string }).id).trim()
      : '';
  return ensureDateTranscriptToolId({
    tool: DATE_TRANSCRIPT_TOOL,
    origin: 'agent',
    action: 'display',
    data: {
      ...data,
      ...(data.id?.trim()
        ? {}
        : legacyEnvelopeId
          ? { id: legacyEnvelopeId }
          : {}),
    },
  });
}

/** Extract dateTranscript tool envelopes from fenced ```json blocks (display-only). */
export function parseDateTranscriptToolMessages(
  content: string,
): DateTranscriptToolMessage[] {
  const tools: DateTranscriptToolMessage[] = [];
  for (const match of content.matchAll(JSON_FENCE_RE)) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }
    try {
      const normalized = normalizeDateTranscriptToolMessage(JSON.parse(raw) as unknown);
      if (normalized) {
        tools.push(normalized);
      }
    } catch {
      // Incomplete fence while streaming — ignore.
    }
  }
  return tools;
}
