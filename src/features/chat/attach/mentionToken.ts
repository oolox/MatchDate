import type { ChatAttachmentKind } from '../../../types/chat';

/** Inline mention token stored in message `content`, e.g. `@[[character:uuid|Man-4]]`. */
export const MENTION_TOKEN_RE =
  /@\[\[(character|text):([^\]|]+)\|([^\]]+)\]\]/g;

export type MentionToken = {
  kind: ChatAttachmentKind;
  id: string;
  label: string;
  raw: string;
  start: number;
  end: number;
};

export type MentionSegment =
  | { type: 'text'; text: string }
  | { type: 'mention'; kind: ChatAttachmentKind; id: string; label: string };

function sanitizeLabel(label: string): string {
  const cleaned = label.replace(/[\[\]|]/g, '').trim();
  return cleaned || 'item';
}

export function formatMentionToken(
  kind: ChatAttachmentKind,
  id: string,
  label: string,
): string {
  return `@[[${kind}:${id.trim()}|${sanitizeLabel(label)}]]`;
}

const COMPLETE_MENTION_AT =
  /^@\[\[(?:character|text):[^\]|]+\|[^\]]+\]\]/;

/** True when `value.slice(at)` starts with a complete mention token. */
export function completeMentionLengthAt(value: string, at: number): number {
  if (at < 0 || at >= value.length || value[at] !== '@') {
    return 0;
  }
  const match = COMPLETE_MENTION_AT.exec(value.slice(at));
  return match ? match[0].length : 0;
}

export function hasMentionToken(
  content: string,
  kind: ChatAttachmentKind,
  id: string,
): boolean {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`@\\[\\[${kind}:${escaped}\\|`).test(content);
}

export function parseMentionSegments(content: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  MENTION_TOKEN_RE.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MENTION_TOKEN_RE.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: content.slice(lastIndex, match.index) });
    }
    segments.push({
      type: 'mention',
      kind: match[1] as ChatAttachmentKind,
      id: match[2],
      label: match[3],
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', text: content.slice(lastIndex) });
  }
  if (segments.length === 0 && content) {
    segments.push({ type: 'text', text: content });
  }
  return segments;
}

/** Replace tokens with `@Label` for the LLM-facing user text. */
export function humanizeMentions(content: string): string {
  return content.replace(MENTION_TOKEN_RE, (_raw, _kind, _id, label: string) => `@${label}`);
}

export function removeMentionToken(
  content: string,
  kind: ChatAttachmentKind,
  id: string,
): string {
  const tokenRe = new RegExp(
    `@\\[\\[${kind}:${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\|[^\\]]+\\]\\]`,
    'g',
  );
  return content
    .replace(tokenRe, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ \n/g, '\n')
    .trimStart();
}

export function appendMentionToken(
  content: string,
  kind: ChatAttachmentKind,
  id: string,
  label: string,
): string {
  const token = formatMentionToken(kind, id, label);
  if (!content.trim()) {
    return `${token} `;
  }
  const needsSpace = !/\s$/.test(content);
  return `${content}${needsSpace ? ' ' : ''}${token} `;
}

export function replaceAtQueryWithMention(
  value: string,
  start: number,
  caret: number,
  kind: ChatAttachmentKind,
  id: string,
  label: string,
): { next: string; caret: number } {
  const token = `${formatMentionToken(kind, id, label)} `;
  const next = `${value.slice(0, start)}${token}${value.slice(caret)}`;
  return { next, caret: start + token.length };
}
