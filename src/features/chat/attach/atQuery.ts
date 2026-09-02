export interface AtQuery {
  start: number;
  query: string;
}

export function findAtQuery(value: string, caret: number): AtQuery | null {
  const clamped = Math.max(0, Math.min(caret, value.length));
  const before = value.slice(0, clamped);
  const at = before.lastIndexOf('@');
  if (at < 0) {
    return null;
  }
  const prev = at > 0 ? before[at - 1] : '';
  if (prev && /[\w.]/.test(prev)) {
    return null;
  }
  const query = before.slice(at + 1);
  if (/[\s]/.test(query)) {
    return null;
  }
  return { start: at, query };
}

export function stripAtQuery(value: string, start: number, caret: number): string {
  return `${value.slice(0, start)}${value.slice(caret)}`;
}
