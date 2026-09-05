import { describe, expect, it } from 'vitest';
import { createDefaultCharacter } from '../../../types/character';
import {
  CHARACTER_ATTACH_TOOL,
  buildCharacterAttachPayload,
  wrapAttachedCharacter,
} from './jsonAttach';

describe('jsonAttach', () => {
  it('extends character with type, tool, and guid', () => {
    const character = createDefaultCharacter('Alex');
    const payload = buildCharacterAttachPayload(character, 'char-1');
    expect(payload.name).toBe('Alex');
    expect(payload.type).toBe('character');
    expect(payload.tool).toBe(CHARACTER_ATTACH_TOOL);
    expect(payload.guid).toBe('char-1');
    expect(payload.attributes).toHaveLength(10);
  });

  it('wraps payload in a json fence', () => {
    const wrapped = wrapAttachedCharacter(createDefaultCharacter('Jordan'), 'guid-9');
    expect(wrapped.startsWith('```json\n')).toBe(true);
    expect(wrapped.endsWith('\n```')).toBe(true);
    expect(wrapped).toContain('"type": "character"');
    expect(wrapped).toContain('"tool": "MatchDate"');
    expect(wrapped).toContain('"guid": "guid-9"');
    expect(wrapped).toContain('"name": "Jordan"');
  });
});
