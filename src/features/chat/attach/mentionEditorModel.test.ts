import { describe, expect, it } from 'vitest';
import { formatMentionToken } from './mentionToken';
import {
  caretPointFromSerializedOffset,
  mentionEditorHtmlFromValue,
  serializeMentionEditor,
  setSerializedSelection,
  serializedOffsetFromSelection,
} from './mentionEditorModel';

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.contentEditable = 'true';
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

describe('mentionEditorModel', () => {
  it('round-trips pretty chips back to tokens', () => {
    const a = formatMentionToken('character', 'c1', 'Samir');
    const b = formatMentionToken('character', 'c2', 'Gordon Thornton');
    const value = `${a} and ${b} `;
    const root = mount(mentionEditorHtmlFromValue(value));
    expect(root.textContent).toBe('@Samir and @Gordon Thornton ');
    expect(serializeMentionEditor(root)).toBe(value);
    root.remove();
  });

  it('maps caret offsets across mention chips', () => {
    const token = formatMentionToken('character', 'c1', 'Samir');
    const value = `${token} hi`;
    const root = mount(mentionEditorHtmlFromValue(value));

    setSerializedSelection(root, 0);
    expect(serializedOffsetFromSelection(root)).toBe(0);

    // Caret inside the token snaps after the chip.
    setSerializedSelection(root, 1);
    expect(serializedOffsetFromSelection(root)).toBe(token.length);

    setSerializedSelection(root, token.length + 1);
    expect(serializedOffsetFromSelection(root)).toBe(token.length + 1);

    const point = caretPointFromSerializedOffset(root, token.length + 2);
    expect(point.node.nodeType).toBe(Node.TEXT_NODE);
    root.remove();
  });

  it('renders character mentions as links with ids', () => {
    const value = formatMentionToken('character', 'abc', 'Samir');
    const html = mentionEditorHtmlFromValue(value);
    expect(html).toContain('href="/character/abc"');
    expect(html).toContain('data-mention-id="abc"');
    expect(html).toContain('@Samir');
    expect(html).not.toContain('@[[');
  });
});
