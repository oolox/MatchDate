import { describe, expect, it } from 'vitest';
import { characterIdFromPath, isKnownAppPath, sessionIdFromPath } from './sectionPaths';

describe('sectionPaths', () => {
  it('parses session and character ids', () => {
    expect(sessionIdFromPath('/session/abc')).toBe('abc');
    expect(sessionIdFromPath('/voice')).toBe(null);
    expect(characterIdFromPath('/character/xyz')).toBe('xyz');
    expect(characterIdFromPath('/character')).toBe(null);
    expect(characterIdFromPath('/voice')).toBe(null);
  });

  it('recognizes known app paths', () => {
    expect(isKnownAppPath('/session/1')).toBe(true);
    expect(isKnownAppPath('/character')).toBe(true);
    expect(isKnownAppPath('/voice')).toBe(true);
    expect(isKnownAppPath('/prompts')).toBe(true);
    expect(isKnownAppPath('/config')).toBe(true);
    expect(isKnownAppPath('/nope')).toBe(false);
  });
});
