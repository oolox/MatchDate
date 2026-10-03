import { describe, expect, it } from 'vitest';
import { findAtQuery, stripAtQuery } from './atQuery';

describe('findAtQuery', () => {
  it('finds a trailing @ query', () => {
    expect(findAtQuery('see @no', 7)).toEqual({ start: 4, query: 'no' });
  });

  it('opens on a lone @', () => {
    expect(findAtQuery('@', 1)).toEqual({ start: 0, query: '' });
  });

  it('ignores email-like at signs', () => {
    expect(findAtQuery('a@b', 3)).toBeNull();
  });

  it('closes once a space is typed', () => {
    expect(findAtQuery('@no ', 4)).toBeNull();
  });

  it('strips the active token', () => {
    expect(stripAtQuery('see @no thanks', 4, 7)).toBe('see  thanks');
  });

  it('skips completed inline mention tokens', () => {
    const token = '@[[character:c1|Man-4]]';
    expect(findAtQuery(`${token} more`, token.length + 5)).toBeNull();
    expect(findAtQuery(token, 5)).toBeNull();
    expect(findAtQuery(`${token} @no`, token.length + 4)).toEqual({
      start: token.length + 1,
      query: 'no',
    });
  });
});
