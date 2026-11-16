import {
  DATE_PLAN_TOOL,
  datePlanDataFromUnknown,
  ensureDatePlanToolId,
  type DatePlanToolMessage,
} from './datePlanAttach';

const JSON_FENCE_RE = /```json\s*([\s\S]*?)```/gi;

export function isDatePlanToolMessage(value: unknown): value is DatePlanToolMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const message = value as Partial<DatePlanToolMessage> & { id?: unknown };
  if (
    message.tool !== DATE_PLAN_TOOL ||
    message.origin !== 'agent' ||
    message.action !== 'display'
  ) {
    return false;
  }
  if (message.id !== undefined && typeof message.id !== 'string') {
    return false;
  }
  return datePlanDataFromUnknown(message.data) != null;
}

export function normalizeDatePlanToolMessage(value: unknown): DatePlanToolMessage | null {
  if (!isDatePlanToolMessage(value)) {
    return null;
  }
  const data = datePlanDataFromUnknown(value.data);
  if (!data) {
    return null;
  }
  const envelopeId = (value as { id?: unknown }).id;
  const legacyEnvelopeId = typeof envelopeId === 'string' ? envelopeId.trim() : '';
  return ensureDatePlanToolId({
    tool: DATE_PLAN_TOOL,
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

/** Extract datePlan tool envelopes from fenced ```json blocks (display-only). */
export function parseDatePlanToolMessages(content: string): DatePlanToolMessage[] {
  const tools: DatePlanToolMessage[] = [];
  for (const match of content.matchAll(JSON_FENCE_RE)) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }
    try {
      const normalized = normalizeDatePlanToolMessage(JSON.parse(raw) as unknown);
      if (normalized) {
        tools.push(normalized);
      }
    } catch {
      // Incomplete fence while streaming — ignore.
    }
  }
  return tools;
}
