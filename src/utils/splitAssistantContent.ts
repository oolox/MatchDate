import { isCharacterToolMessage } from '../features/chat/attach/parseCharacterTools';

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

export type AssistantMessageBlock = AssistantMarkdownBlock | AssistantToolBlock;

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
  }

  pushMarkdown(blocks, content.slice(cursor));
  return blocks.length > 0 ? blocks : [{ type: 'markdown', content }];
}
