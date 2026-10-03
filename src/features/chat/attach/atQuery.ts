import { completeMentionLengthAt } from './mentionToken';

export interface AtQuery {
  start: number;
  query: string;
}

export function findAtQuery(value: string, caret: number): AtQuery | null {
  const clamped = Math.max(0, Math.min(caret, value.length));
  let searchEnd = clamped;

  while (searchEnd > 0) {
    const before = value.slice(0, searchEnd);
    const at = before.lastIndexOf('@');
    if (at < 0) {
      return null;
    }

    // Skip completed inline mention tokens (`@[[kind:id|label]]`).
    const completeLen = completeMentionLengthAt(value, at);
    if (completeLen > 0) {
      if (at + completeLen <= clamped) {
        searchEnd = at;
        continue;
      }
      // Caret is inside a finished token — not an active @ query.
      return null;
    }

    const prev = at > 0 ? before[at - 1] : '';
    if (prev && /[\w.]/.test(prev)) {
      searchEnd = at;
      continue;
    }
    const query = before.slice(at + 1);
    if (/[\s]/.test(query)) {
      return null;
    }
    return { start: at, query };
  }

  return null;
}

export function stripAtQuery(value: string, start: number, caret: number): string {
  return `${value.slice(0, start)}${value.slice(caret)}`;
}
