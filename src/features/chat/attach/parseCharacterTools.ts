import type { CharacterToolMessage } from './jsonAttach';
import { CHARACTER_TOOL } from './jsonAttach';

const JSON_FENCE_RE = /```json\s*([\s\S]*?)```/gi;

const TOOL_ACTIONS = new Set(['write', 'update', 'create', 'read']);
const TOOL_ORIGINS = new Set(['user', 'agent']);

export function isCharacterToolMessage(value: unknown): value is CharacterToolMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const message = value as Partial<CharacterToolMessage>;
  return (
    message.tool === CHARACTER_TOOL &&
    typeof message.origin === 'string' &&
    TOOL_ORIGINS.has(message.origin) &&
    typeof message.action === 'string' &&
    TOOL_ACTIONS.has(message.action) &&
    (message.id === undefined || typeof message.id === 'string')
  );
}

/** Extract character tool envelopes from fenced ```json blocks (Phase 1: parse only; no apply). */
export function parseCharacterToolMessages(content: string): CharacterToolMessage[] {
  const tools: CharacterToolMessage[] = [];
  for (const match of content.matchAll(JSON_FENCE_RE)) {
    const raw = match[1]?.trim();
    if (!raw) {
      continue;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isCharacterToolMessage(parsed)) {
        tools.push(parsed);
      }
    } catch {
      // Not JSON or incomplete fence while streaming — ignore.
    }
  }
  return tools;
}
