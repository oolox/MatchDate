import { describe, expect, it } from 'vitest';
import { createDefaultCharacter } from '../../../types/character';
import {
  CHARACTER_TOOL,
  buildCharacterWriteTool,
  wrapAttachedCharacter,
} from './jsonAttach';

describe('jsonAttach', () => {
  it('builds a user write tool envelope', () => {
    const character = createDefaultCharacter('Alex');
    character.history.push({
      at: '2026-09-13T17:00:00.000Z',
      summary: 'Met at a cafe',
      source: 'chat',
    });
    const payload = buildCharacterWriteTool(character, 'char-1');
    expect(payload.tool).toBe(CHARACTER_TOOL);
    expect(payload.origin).toBe('user');
    expect(payload.action).toBe('write');
    expect(payload.id).toBe('char-1');
    expect(payload.data).toEqual({
      name: 'Alex',
      attributes: character.attributes,
      history: character.history,
    });
  });

  it('wraps write tool in a json fence', () => {
    const wrapped = wrapAttachedCharacter(createDefaultCharacter('Jordan'), 'guid-9');
    expect(wrapped.startsWith('```json\n')).toBe(true);
    expect(wrapped.endsWith('\n```')).toBe(true);
    expect(wrapped).toContain('"tool": "character"');
    expect(wrapped).toContain('"origin": "user"');
    expect(wrapped).toContain('"action": "write"');
    expect(wrapped).toContain('"id": "guid-9"');
    expect(wrapped).toContain('"name": "Jordan"');
    expect(wrapped).toContain('"history"');
  });
});
