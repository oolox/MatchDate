import { isCharacterToolMessage } from '../features/chat/attach/parseCharacterTools';
import { normalizeQuoteToolMessage } from '../features/chat/attach/parseQuoteTools';

export type AssistantMarkdownBlock = { type: 'markdown'; content: string };

export type AssistantToolBlock = {
  type: 'tool';
  tool: string;
  action?: string;
  id?: string;
  /** Character display name from data.name when present. */
  name?: string;
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

export type AssistantMessageBlock =
  | AssistantMarkdownBlock
  | AssistantToolBlock
  | AssistantQuoteBlock;

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

function looksLikeCharacterTool(raw: string): boolean {
  return /"tool"\s*:\s*"character"/.test(raw);
}

function looksLikeQuoteTool(raw: string): boolean {
  return /"tool"\s*:\s*"quote"/.test(raw);
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
        pushMarkdown(blocks, content.slice(cursor, fence.openIndex));
        blocks.push({
          type: 'tool',
          tool: parsed.tool,
          action: parsed.action,
          id: parsed.id,
          name: nameFromParsedData(parsed.data),
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
  }

  pushMarkdown(blocks, content.slice(cursor));
  return blocks.length > 0 ? blocks : [{ type: 'markdown', content }];
}
