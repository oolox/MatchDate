import { describe, expect, it } from 'vitest';
import { matchCharacterIdByName } from './matchCharacterByName';

const characters = [
  { id: 'peyton-id', name: 'Peyton' },
  { id: 'hector-id', name: 'Hector Alvarez' },
];

describe('matchCharacterIdByName', () => {
  it('matches an exact name ignoring case', () => {
    expect(matchCharacterIdByName('peyton', characters)).toBe('peyton-id');
  });

  it('matches a unique first name', () => {
    expect(matchCharacterIdByName('Hector', characters)).toBe('hector-id');
  });

  it('does not guess when two characters share a first name', () => {
    const crowded = [...characters, { id: 'other', name: 'Hector Miles' }];
    expect(matchCharacterIdByName('Hector', crowded)).toBeNull();
  });
});
