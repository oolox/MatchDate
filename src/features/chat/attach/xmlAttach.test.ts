import { describe, expect, it } from 'vitest';
import {
  ATTACHED_FILES_INSTRUCTION,
  apiContentForMessage,
  composeAttachedUserContent,
  wrapAttachedFile,
} from './xmlAttach';

describe('xmlAttach', () => {
  it('wraps a file in attached_file XML with CDATA', () => {
    expect(wrapAttachedFile('notes.md', 'text/markdown', 'hello')).toBe(
      '<attached_file name="notes.md" mime="text/markdown"><![CDATA[hello]]></attached_file>',
    );
  });

  it('escapes XML attr quotes in the filename', () => {
    expect(wrapAttachedFile('say "hi".txt', 'text/plain', 'x')).toContain(
      'name="say &quot;hi&quot;.txt"',
    );
  });

  it('composes prose + instruction + blocks', () => {
    const next = composeAttachedUserContent('Summarize this', [
      { name: 'a.txt', mime: 'text/plain', body: 'body' },
    ]);
    expect(next.startsWith('Summarize this')).toBe(true);
    expect(next).toContain(ATTACHED_FILES_INSTRUCTION);
    expect(next).toContain('<attached_file name="a.txt"');
  });

  it('prefers baked apiContent on history messages', () => {
    expect(apiContentForMessage({ content: 'Hi', apiContent: 'Hi\nXML' })).toBe('Hi\nXML');
    expect(apiContentForMessage({ content: 'Hi' })).toBe('Hi');
  });
});
