import type { ChatAttachmentKind } from '../../../types/chat';
import { formatMentionToken, parseMentionSegments } from './mentionToken';

export const MENTION_KIND_ATTR = 'data-mention-kind';
export const MENTION_ID_ATTR = 'data-mention-id';
export const MENTION_LABEL_ATTR = 'data-mention-label';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function isMentionElement(node: Node | null): node is HTMLElement {
  return (
    node instanceof HTMLElement &&
    node.hasAttribute(MENTION_KIND_ATTR) &&
    node.hasAttribute(MENTION_ID_ATTR) &&
    node.hasAttribute(MENTION_LABEL_ATTR)
  );
}

export function mentionDisplayLabel(label: string): string {
  return `@${label}`;
}

/** Build editor HTML from the tokenized draft string. */
export function mentionEditorHtmlFromValue(value: string): string {
  if (!value) {
    return '';
  }
  return parseMentionSegments(value)
    .map((segment) => {
      if (segment.type === 'text') {
        return escapeHtml(segment.text).replace(/\n/g, '<br>');
      }
      const kind = escapeHtml(segment.kind);
      const id = escapeHtml(segment.id);
      const label = escapeHtml(segment.label);
      const display = escapeHtml(mentionDisplayLabel(segment.label));
      const attrs = `${MENTION_KIND_ATTR}="${kind}" ${MENTION_ID_ATTR}="${id}" ${MENTION_LABEL_ATTR}="${label}" contenteditable="false"`;
      if (segment.kind === 'character') {
        return `<a href="/character/${id}" class="md-mention md-mention-link" ${attrs}>${display}</a>`;
      }
      return `<span class="md-mention" ${attrs}>${display}</span>`;
    })
    .join('');
}

function tokenFromMentionElement(el: HTMLElement): string {
  const kind = el.getAttribute(MENTION_KIND_ATTR) as ChatAttachmentKind | null;
  const id = el.getAttribute(MENTION_ID_ATTR) ?? '';
  const label = el.getAttribute(MENTION_LABEL_ATTR) ?? '';
  if (kind !== 'character' && kind !== 'text') {
    return el.textContent ?? '';
  }
  return formatMentionToken(kind, id, label);
}

/** Serialize editor DOM back to the tokenized draft string. */
export function serializeMentionEditor(root: HTMLElement): string {
  let out = '';

  const walk = (node: Node) => {
    if (isMentionElement(node)) {
      out += tokenFromMentionElement(node);
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? '';
      return;
    }
    if (node instanceof HTMLElement) {
      if (node.tagName === 'BR') {
        out += '\n';
        return;
      }
      if (node.tagName === 'DIV' || node.tagName === 'P') {
        // Block boundaries (except leading) become newlines.
        if (out.length > 0 && !out.endsWith('\n')) {
          out += '\n';
        }
      }
      for (const child of Array.from(node.childNodes)) {
        walk(child);
      }
    }
  };

  for (const child of Array.from(root.childNodes)) {
    walk(child);
  }

  // Contenteditable often ends with a trailing <br>; trim a single trailing newline artifact
  // only when the visual editor is otherwise empty of real content — keep user newlines.
  return out.replace(/\u00a0/g, ' ');
}

type CaretPoint = { node: Node; offset: number };

function mentionTokenLength(el: HTMLElement): number {
  return tokenFromMentionElement(el).length;
}

/**
 * Map a serialized caret offset onto a DOM caret point inside `root`.
 * Offsets that land inside a mention snap to after that mention (atomic).
 */
export function caretPointFromSerializedOffset(
  root: HTMLElement,
  serializedOffset: number,
): CaretPoint {
  let remaining = Math.max(0, serializedOffset);

  const visit = (node: Node): CaretPoint | null => {
    if (isMentionElement(node)) {
      const len = mentionTokenLength(node);
      const parent = node.parentNode ?? root;
      const index = Array.from(parent.childNodes).indexOf(node as ChildNode);
      if (remaining === 0) {
        return { node: parent, offset: index };
      }
      if (remaining <= len) {
        // Mentions are atomic — caret inside the token snaps after the chip.
        return { node: parent, offset: index + 1 };
      }
      remaining -= len;
      return null;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (remaining <= text.length) {
        return { node, offset: remaining };
      }
      remaining -= text.length;
      return null;
    }
    if (node instanceof HTMLElement && node.tagName === 'BR') {
      if (remaining <= 1) {
        const parent = node.parentNode ?? root;
        const index = Array.from(parent.childNodes).indexOf(node) + 1;
        return { node: parent, offset: index };
      }
      remaining -= 1;
      return null;
    }
    if (node instanceof HTMLElement) {
      for (const child of Array.from(node.childNodes)) {
        const hit = visit(child);
        if (hit) {
          return hit;
        }
      }
    }
    return null;
  };

  for (const child of Array.from(root.childNodes)) {
    const hit = visit(child);
    if (hit) {
      return hit;
    }
  }
  return { node: root, offset: root.childNodes.length };
}

/** Serialized caret offset for the current selection inside `root`. */
export function serializedOffsetFromSelection(root: HTMLElement): number {
  const selection = root.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return serializeMentionEditor(root).length;
  }
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) {
    return serializeMentionEditor(root).length;
  }

  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);

  const walkerRoot = document.createElement('div');
  walkerRoot.appendChild(pre.cloneContents());
  return serializeMentionEditor(walkerRoot).length;
}

export function setSerializedSelection(root: HTMLElement, offset: number): void {
  const point = caretPointFromSerializedOffset(root, offset);
  const selection = root.ownerDocument.getSelection();
  if (!selection) {
    return;
  }
  const range = root.ownerDocument.createRange();
  try {
    range.setStart(point.node, point.offset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch {
    // Ignore invalid offsets from racey DOM updates.
  }
}
