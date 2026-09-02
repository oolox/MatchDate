import { describe, expect, it } from 'vitest';
import characterReducer, {
  markCharacterEditorSaved,
  replaceCharacterEditor,
  resetCharacterEditor,
  setCharacterEditorName,
} from './characterSlice';
import { createDefaultCharacter } from '../../types/character';

describe('characterSlice', () => {
  it('preserves edits in redux until reset', () => {
    let state = characterReducer(undefined, { type: 'init' });
    state = characterReducer(state, setCharacterEditorName('Alex'));
    expect(state.character.name).toBe('Alex');
    expect(state.isDirty).toBe(true);

    const afterReset = characterReducer(state, resetCharacterEditor());
    expect(afterReset.character.name).toBe('');
    expect(afterReset.isDirty).toBe(false);
    expect(afterReset.characterId).toBeNull();
  });

  it('replaces editor state when loading a saved character', () => {
    const loaded = createDefaultCharacter('Jordan');
    const state = characterReducer(
      undefined,
      replaceCharacterEditor({
        characterId: 'char-1',
        character: loaded,
        isDirty: false,
      }),
    );
    expect(state.characterId).toBe('char-1');
    expect(state.character.name).toBe('Jordan');
    expect(state.isDirty).toBe(false);
  });

  it('clears dirty after save', () => {
    const saved = createDefaultCharacter('Saved');
    const state = characterReducer(
      characterReducer(undefined, setCharacterEditorName('Draft')),
      markCharacterEditorSaved({ characterId: 'char-2', character: saved }),
    );
    expect(state.characterId).toBe('char-2');
    expect(state.character.name).toBe('Saved');
    expect(state.isDirty).toBe(false);
  });
});
