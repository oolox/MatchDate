import {
  DATE_SUMMARY_TOOL,
  dateSummaryDataFromUnknown,
  ensureDateSummaryToolId,
  type DateSummaryToolMessage,
} from './dateSummaryAttach';

const JSON_FENCE_RE = /```json\s*([\s\S]*?)```/gi;

export function isDateSummaryToolMessage(value: unknown): value is DateSummaryToolMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const message = value as Partial<DateSummaryToolMessage>;
  if (
    message.tool !== DATE_SUMMARY_TOOL ||
    message.origin !== 'agent' ||
    message.action !== 'display' ||
    (message.id !== undefined && typeof message.id !== 'string')
  ) {
    return false;
  }
  return dateSummaryDataFromUnknown(message.data) != null;
}

/** Normalize a parsed dateSummary tool (validate data + stamp stable id if missing). */
export function normalizeDateSummaryToolMessage(
  value: unknown,
): DateSummaryToolMessage | null {
  if (!isDateSummaryToolMessage(value)) {
    return null;
  }
  const data = dateSummaryDataFromUnknown(value.data);
  if (!data) {
    return null;
  }
  return ensureDateSummaryToolId({
    tool: DATE_SUMMARY_TOOL,
    origin: 'agent',
    action: 'display',
    ...(value.id?.trim() ? { id: value.id.trim() } : {}),
    data,
  });
}

/** Extract dateSummary tool envelopes from fenced ```json blocks (display-only; never apply). */
export function parseDateSummaryToolMessages(content: string): DateSummaryToolMessage[] {
  const tools: DateSummaryToolMessage[] = [];
  for (const match of content.matchAll(JSON_FENCE_RE)) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }
    try {
      const normalized = normalizeDateSummaryToolMessage(JSON.parse(raw) as unknown);
      if (normalized) {
        tools.push(normalized);
      }
    } catch {
      // Not JSON or incomplete fence while streaming — ignore.
    }
  }
  return tools;
}
