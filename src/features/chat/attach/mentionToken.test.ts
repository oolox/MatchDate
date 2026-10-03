import { describe, expect, it } from 'vitest';
import {
  appendMentionToken,
  completeMentionLengthAt,
  formatMentionToken,
  humanizeMentions,
  parseMentionSegments,
  removeMentionToken,
  replaceAtQueryWithMention,
} from './mentionToken';

describe('mentionToken', () => {
  it('formats and parses tokens in order', () => {
    const a = formatMentionToken('character', 'c1', 'Man-4');
    const b = formatMentionToken('character', 'c2', 'Mary');
    const content = `Tell me about ${a} then ${b}`;
    expect(parseMentionSegments(content)).toEqual([
      { type: 'text', text: 'Tell me about ' },
      { type: 'mention', kind: 'character', id: 'c1', label: 'Man-4' },
      { type: 'text', text: ' then ' },
      { type: 'mention', kind: 'character', id: 'c2', label: 'Mary' },
    ]);
  });

  it('humanizes tokens for the API payload', () => {
    const token = formatMentionToken('character', 'c1', 'Man-4');
    expect(humanizeMentions(`story of ${token}`)).toBe('story of @Man-4');
  });

  it('replaces an active @ query with a token', () => {
    const { next, caret } = replaceAtQueryWithMention(
      'see @ma',
      4,
      7,
      'character',
      'c1',
      'Man-4',
    );
    expect(next).toBe('see @[[character:c1|Man-4]] ');
    expect(caret).toBe(next.length);
  });

  it('removes a token by id', () => {
    const content = `A ${formatMentionToken('character', 'c1', 'Man-4')} B`;
    const next = removeMentionToken(content, 'character', 'c1');
    expect(next).toMatch(/^A\s+B$/);
    expect(next).not.toContain('c1');
  });

  it('appends a token with spacing', () => {
    expect(appendMentionToken('Hi', 'text', 't1', 'notes.md')).toBe(
      'Hi @[[text:t1|notes.md]] ',
    );
  });

  it('detects complete mention length at @', () => {
    const token = formatMentionToken('character', 'c1', 'Alex');
    expect(completeMentionLengthAt(token, 0)).toBe(token.length);
    expect(completeMentionLengthAt('hello', 0)).toBe(0);
  });
});
