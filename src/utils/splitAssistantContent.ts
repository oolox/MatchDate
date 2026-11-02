import type { DateSummaryCharacterEntry } from '../features/chat/attach/dateSummaryAttach';
import { isCharacterToolMessage } from '../features/chat/attach/parseCharacterTools';
import { normalizeDateSummaryToolMessage } from '../features/chat/attach/parseDateSummaryTools';
import { normalizeQuoteToolMessage } from '../features/chat/attach/parseQuoteTools';

export type AssistantMarkdownBlock = { type: 'markdown'; content: string };

export type AssistantToolBlock = {
  type: 'tool';
  tool: string;
  action?: string;
  id?: string;
  /** Character display name from data.name when present. */
  name?: string;
  /** Traits entries in this tool's data (character update/create). */
  traitCount?: number;
  /** History entries in this tool's data. */
  historyCount?: number;
  complete: boolean;
  /** Raw / pretty JSON body for expand toggle. */
  json: string;
};

export type AssistantQuoteBlock = {
  type: 'quote';
  id: string;
  quote: string;
  speaker?: string;
  speakerName: string;
  complete: boolean;
};

export type AssistantDateSummaryBlock = {
  type: 'dateSummary';
  id: string;
  shortSummary: string;
  location: string;
  justification: string;
  character: DateSummaryCharacterEntry[];
  dateTime: string;
  chatId: string;
  complete: boolean;
};

export type AssistantMessageBlock =
  | AssistantMarkdownBlock
  | AssistantToolBlock
  | AssistantQuoteBlock
  | AssistantDateSummaryBlock;

export interface SplitAssistantContentOptions {
  isStreaming?: boolean;
}

interface JsonFence {
  openIndex: number;
  bodyStart: number;
  closeIndex: number | null;
  body: string;
}

function findJsonFences(content: string): JsonFence[] {
  const fences: JsonFence[] = [];
  const openRe = /```json\b/gi;
  let openMatch: RegExpExecArray | null;
  while ((openMatch = openRe.exec(content)) !== null) {
    const openIndex = openMatch.index;
    const bodyStart = openIndex + openMatch[0].length;
    const closeIndex = content.indexOf('```', bodyStart);
    if (closeIndex === -1) {
      fences.push({
        openIndex,
        bodyStart,
        closeIndex: null,
        body: content.slice(bodyStart),
      });
      break;
    }
    fences.push({
      openIndex,
      bodyStart,
      closeIndex,
      body: content.slice(bodyStart, closeIndex),
    });
    openRe.lastIndex = closeIndex + 3;
  }
  return fences;
}

function extractToolFields(raw: string): {
  tool?: string;
  action?: string;
  id?: string;
  name?: string;
} {
  const tool = /"tool"\s*:\s*"([^"]+)"/.exec(raw)?.[1];
  const action = /"action"\s*:\s*"([^"]+)"/.exec(raw)?.[1];
  const id = /"id"\s*:\s*"([^"]+)"/.exec(raw)?.[1];
  return { tool, action, id, name: extractDataName(raw) };
}

/** First `name` inside `data` object (character name; avoid ValueScore names when possible). */
export function extractDataName(raw: string): string | undefined {
  const dataMatch = /"data"\s*:\s*\{/.exec(raw);
  if (!dataMatch || dataMatch.index === undefined) {
    return undefined;
  }
  const fromData = raw.slice(dataMatch.index + dataMatch[0].length);
  const nameMatch = /"name"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(fromData);
  const value = nameMatch?.[1]?.trim();
  return value || undefined;
}

function extractQuoteFields(raw: string): {
  id?: string;
  quote?: string;
  speaker?: string;
  speakerName?: string;
} {
  const id = /"id"\s*:\s*"([^"]+)"/.exec(raw)?.[1]?.trim();
  const dataMatch = /"data"\s*:\s*\{/.exec(raw);
  const fromData =
    dataMatch && dataMatch.index !== undefined
      ? raw.slice(dataMatch.index + dataMatch[0].length)
      : raw;
  const quote = /"quote"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(fromData)?.[1];
  const speaker = /"speaker"\s*:\s*"([^"]+)"/.exec(fromData)?.[1]?.trim();
  const speakerName = /"speakerName"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(fromData)?.[1];
  return {
    ...(id ? { id } : {}),
    ...(quote !== undefined ? { quote: unescapeJsonString(quote) } : {}),
    ...(speaker ? { speaker } : {}),
    ...(speakerName !== undefined
      ? { speakerName: unescapeJsonString(speakerName).trim() }
      : {}),
  };
}

function extractDateSummaryCharacterEntries(raw: string): DateSummaryCharacterEntry[] {
  const objectArrayMatch = /"character"\s*:\s*\[/.exec(raw);
  if (objectArrayMatch && objectArrayMatch.index !== undefined) {
    const from = raw.slice(objectArrayMatch.index + objectArrayMatch[0].length);
    const entries: DateSummaryCharacterEntry[] = [];
    // Best-effort object slices while streaming (incomplete JSON ok).
    for (const objectMatch of from.matchAll(/\{[^{}]*\}/g)) {
      const chunk = objectMatch[0];
      const id = /"id"\s*:\s*"([^"]+)"/.exec(chunk)?.[1]?.trim();
      const dateReviewRaw = /"dateReview"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(chunk)?.[1];
      const dateScoreRaw = /"dateScore"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(chunk)?.[1];
      const dateFitRaw = /"dateFit"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(chunk)?.[1];
      if (!id) {
        continue;
      }
      const dateScore = dateScoreRaw != null ? Number(dateScoreRaw) : NaN;
      const dateFit = dateFitRaw != null ? Number(dateFitRaw) : NaN;
      entries.push({
        id,
        dateReview:
          dateReviewRaw !== undefined ? unescapeJsonString(dateReviewRaw).trim() : '',
        dateScore: Number.isFinite(dateScore) ? Math.round(dateScore) : 0,
        dateFit: Number.isFinite(dateFit) ? Math.round(dateFit) : 0,
      });
    }
    if (entries.length > 0) {
      return entries;
    }
  }

  // Legacy: "characters": ["guid", "guid"]
  const legacyMatch = /"characters"\s*:\s*\[([^\]]*)\]/.exec(raw);
  if (legacyMatch?.[1]) {
    const entries: DateSummaryCharacterEntry[] = [];
    for (const idMatch of legacyMatch[1].matchAll(/"([^"]+)"/g)) {
      const id = idMatch[1]?.trim();
      if (id) {
        entries.push({ id, dateReview: '', dateScore: 0, dateFit: 0 });
      }
    }
    return entries;
  }

  return [];
}

function extractDateSummaryFields(raw: string): {
  id?: string;
  shortSummary?: string;
  location?: string;
  justification?: string;
  dateTime?: string;
  chatId?: string;
  character: DateSummaryCharacterEntry[];
} {
  const id = /"id"\s*:\s*"([^"]+)"/.exec(raw)?.[1]?.trim();
  const dataMatch = /"data"\s*:\s*\{/.exec(raw);
  const fromData =
    dataMatch && dataMatch.index !== undefined
      ? raw.slice(dataMatch.index + dataMatch[0].length)
      : raw;
  const shortSummary = /"shortSummary"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(fromData)?.[1];
  const location = /"location"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(fromData)?.[1];
  const justification = /"justification"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(fromData)?.[1];
  const dateTime = /"dateTime"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(fromData)?.[1];
  const chatId = /"chatId"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(fromData)?.[1];
  return {
    character: extractDateSummaryCharacterEntries(fromData),
    ...(id ? { id } : {}),
    ...(shortSummary !== undefined
      ? { shortSummary: unescapeJsonString(shortSummary).trim() }
      : {}),
    ...(location !== undefined ? { location: unescapeJsonString(location).trim() } : {}),
    ...(justification !== undefined
      ? { justification: unescapeJsonString(justification).trim() }
      : {}),
    ...(dateTime !== undefined ? { dateTime: unescapeJsonString(dateTime).trim() } : {}),
    ...(chatId !== undefined ? { chatId: unescapeJsonString(chatId).trim() } : {}),
  };
}

function unescapeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

function nameFromParsedData(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  const name = (data as { name?: unknown }).name;
  return typeof name === 'string' && name.trim() ? name.trim() : undefined;
}

function countsFromCharacterData(data: unknown): {
  traitCount: number;
  historyCount: number;
} {
  if (!data || typeof data !== 'object') {
    return { traitCount: 0, historyCount: 0 };
  }
  const record = data as { traits?: unknown; history?: unknown };
  return {
    traitCount: Array.isArray(record.traits) ? record.traits.length : 0,
    historyCount: Array.isArray(record.history) ? record.history.length : 0,
  };
}

/** Best-effort array length from incomplete streaming JSON. */
function countArrayItemsInRaw(raw: string, key: 'traits' | 'history'): number {
  const re = new RegExp(`"${key}"\\s*:\\s*\\[`, 'i');
  const match = re.exec(raw);
  if (!match || match.index === undefined) {
    return 0;
  }
  const from = raw.slice(match.index + match[0].length);
  let depth = 1;
  let items = 0;
  let inString = false;
  let escape = false;
  let sawValue = false;
  for (let i = 0; i < from.length; i += 1) {
    const ch = from[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      sawValue = true;
      continue;
    }
    if (ch === '{' || ch === '[') {
      depth += 1;
      sawValue = true;
      continue;
    }
    if (ch === '}' || ch === ']') {
      depth -= 1;
      if (depth === 0) {
        if (sawValue) {
          items += 1;
        }
        break;
      }
      continue;
    }
    if (ch === ',' && depth === 1) {
      if (sawValue) {
        items += 1;
      }
      sawValue = false;
    }
  }
  return items;
}

function looksLikeCharacterTool(raw: string): boolean {
  return /"tool"\s*:\s*"character"/.test(raw);
}

function looksLikeQuoteTool(raw: string): boolean {
  return /"tool"\s*:\s*"quote"/.test(raw);
}

function looksLikeDateSummaryTool(raw: string): boolean {
  return /"tool"\s*:\s*"dateSummary"/.test(raw);
}

function pushMarkdown(blocks: AssistantMessageBlock[], content: string) {
  if (!content.trim()) {
    return;
  }
  blocks.push({ type: 'markdown', content });
}

export function splitAssistantContent(
  content: string,
  options: SplitAssistantContentOptions = {},
): AssistantMessageBlock[] {
  if (!content.trim()) {
    return [];
  }

  const isStreaming = options.isStreaming === true;
  const fences = findJsonFences(content);
  if (fences.length === 0) {
    return [{ type: 'markdown', content }];
  }

  const blocks: AssistantMessageBlock[] = [];
  let cursor = 0;

  for (const fence of fences) {
    const closed = fence.closeIndex !== null;
    const raw = fence.body.trim();

    if (closed) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = undefined;
      }

      if (isCharacterToolMessage(parsed)) {
        const counts = countsFromCharacterData(parsed.data);
        pushMarkdown(blocks, content.slice(cursor, fence.openIndex));
        blocks.push({
          type: 'tool',
          tool: parsed.tool,
          action: parsed.action,
          id: parsed.id,
          name: nameFromParsedData(parsed.data),
          traitCount: counts.traitCount,
          historyCount: counts.historyCount,
          complete: true,
          json: JSON.stringify(parsed, null, 2),
        });
        cursor = fence.closeIndex! + 3;
        continue;
      }

      const quote = normalizeQuoteToolMessage(parsed);
      if (quote) {
        pushMarkdown(blocks, content.slice(cursor, fence.openIndex));
        blocks.push({
          type: 'quote',
          id: quote.id!,
          quote: quote.data.quote,
          speakerName: quote.data.speakerName,
          complete: true,
          ...(quote.data.speaker ? { speaker: quote.data.speaker } : {}),
        });
        cursor = fence.closeIndex! + 3;
        continue;
      }

      const dateSummary = normalizeDateSummaryToolMessage(parsed);
      if (dateSummary) {
        pushMarkdown(blocks, content.slice(cursor, fence.openIndex));
        blocks.push({
          type: 'dateSummary',
          id: dateSummary.id!,
          shortSummary: dateSummary.data.shortSummary,
          location: dateSummary.data.location,
          justification: dateSummary.data.justification,
          character: dateSummary.data.character,
          dateTime: dateSummary.data.dateTime,
          chatId: dateSummary.data.chatId,
          complete: true,
        });
        cursor = fence.closeIndex! + 3;
        continue;
      }

      // Non-tool closed fence stays in markdown.
      continue;
    }

    // Unclosed fence (typically end of stream)
    if (isStreaming && looksLikeCharacterTool(raw)) {
      const fields = extractToolFields(raw);
      pushMarkdown(blocks, content.slice(cursor, fence.openIndex));
      blocks.push({
        type: 'tool',
        tool: fields.tool ?? 'character',
        action: fields.action,
        id: fields.id,
        name: fields.name,
        traitCount: countArrayItemsInRaw(raw, 'traits'),
        historyCount: countArrayItemsInRaw(raw, 'history'),
        complete: false,
        json: fence.body.replace(/^\s*\n/, ''),
      });
      cursor = content.length;
      break;
    }

    if (isStreaming && looksLikeQuoteTool(raw)) {
      const fields = extractQuoteFields(raw);
      const speakerName = fields.speakerName?.trim() || '…';
      const quoteText = fields.quote?.trim() ?? '';
      pushMarkdown(blocks, content.slice(cursor, fence.openIndex));
      blocks.push({
        type: 'quote',
        id: fields.id?.trim() || `streaming-quote-${fence.openIndex}`,
        quote: quoteText,
        speakerName,
        complete: false,
        ...(fields.speaker ? { speaker: fields.speaker } : {}),
      });
      cursor = content.length;
      break;
    }

    if (isStreaming && looksLikeDateSummaryTool(raw)) {
      const fields = extractDateSummaryFields(raw);
      pushMarkdown(blocks, content.slice(cursor, fence.openIndex));
      blocks.push({
        type: 'dateSummary',
        id: fields.id?.trim() || `streaming-dateSummary-${fence.openIndex}`,
        shortSummary: fields.shortSummary?.trim() ?? '',
        location: fields.location?.trim() ?? '',
        justification: fields.justification?.trim() ?? '',
        character: fields.character,
        dateTime: fields.dateTime?.trim() ?? '',
        chatId: fields.chatId?.trim() ?? '',
        complete: false,
      });
      cursor = content.length;
      break;
    }
  }

  pushMarkdown(blocks, content.slice(cursor));
  return blocks.length > 0 ? blocks : [{ type: 'markdown', content }];
}
