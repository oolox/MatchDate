import { describe, expect, it } from 'vitest';
import characterReducer, {
  appendCharacterEditorHistoryEntry,
  updateCharacterEditorHistoryEntry,
  updateCharacterEditorTrait,
  markCharacterEditorSaved,
  removeCharacterEditorHistoryEntry,
  removeCharacterEditorTrait,
  reorderCharacterEditorImages,
  replaceCharacterEditor,
  resetCharacterEditor,
  setCharacterEditorName,
  USER_TRAIT_SESSION_ID,
  upsertCharacterEditorTrait,
} from './characterSlice';
import { createDefaultCharacter } from '../../types/character';
import type { SavedImageRef } from '../../types/savedImage';

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

  it('removes history entries and traits', () => {
    const character = createDefaultCharacter('Alex');
    character.history = [
      { at: '2026-01-01T00:00:00.000Z', summary: 'First' },
      { at: '2026-02-01T00:00:00.000Z', summary: 'Second' },
    ];
    character.traits = [
      { at: '2026-01-01T00:00:00.000Z', name: 'eye color', value: 'green', tags: [] },
      { at: '2026-01-01T00:00:00.000Z', name: 'hair color', value: 'black', tags: ['Physical'] },
    ];
    let state = characterReducer(
      undefined,
      replaceCharacterEditor({ characterId: 'c1', character, isDirty: false }),
    );
    state = characterReducer(state, removeCharacterEditorHistoryEntry(0));
    expect(state.character.history).toEqual([
      { at: '2026-02-01T00:00:00.000Z', summary: 'Second' },
    ]);
    expect(state.isDirty).toBe(true);
    state = characterReducer(state, removeCharacterEditorTrait('Eye Color'));
    expect(state.character.traits).toEqual([
      {
        at: '2026-01-01T00:00:00.000Z',
        name: 'hair color',
        value: 'black',
        tags: ['Physical'],
      },
    ]);
  });

  it('appends history with sessionId user', () => {
    let state = characterReducer(
      undefined,
      replaceCharacterEditor({
        characterId: 'c1',
        character: createDefaultCharacter('Alex'),
        isDirty: false,
      }),
    );
    state = characterReducer(
      state,
      appendCharacterEditorHistoryEntry({
        at: '2026-09-13T18:00:00.000Z',
        summary: 'Met at a cafe',
      }),
    );
    expect(state.character.history).toEqual([
      {
        at: '2026-09-13T18:00:00.000Z',
        summary: 'Met at a cafe',
        sessionId: USER_TRAIT_SESSION_ID,
      },
    ]);
    expect(state.isDirty).toBe(true);
  });

  it('updates history entry by index', () => {
    const character = createDefaultCharacter('Alex');
    character.history = [
      { at: '2026-01-01T00:00:00.000Z', summary: 'First', sessionId: 'chat-1' },
    ];
    let state = characterReducer(
      undefined,
      replaceCharacterEditor({ characterId: 'c1', character, isDirty: false }),
    );
    state = characterReducer(
      state,
      updateCharacterEditorHistoryEntry({
        index: 0,
        at: '2026-02-01T12:00:00.000Z',
        summary: 'Updated',
      }),
    );
    expect(state.character.history).toEqual([
      {
        at: '2026-02-01T12:00:00.000Z',
        summary: 'Updated',
        sessionId: 'chat-1',
      },
    ]);
  });

  it('updates trait by original name and renames', () => {
    const character = createDefaultCharacter('Alex');
    character.traits = [
      {
        at: '2026-01-01T00:00:00.000Z',
        name: 'hair color',
        value: 'black',
        tags: ['Physical'],
        sessionId: 'chat-1',
      },
    ];
    let state = characterReducer(
      undefined,
      replaceCharacterEditor({ characterId: 'c1', character, isDirty: false }),
    );
    state = characterReducer(
      state,
      updateCharacterEditorTrait({
        originalName: 'hair color',
        at: '2026-02-01T12:00:00.000Z',
        name: 'Hair Color',
        value: 'brown',
        tags: ['Physical', 'Conscience'],
      }),
    );
    expect(state.character.traits).toEqual([
      {
        at: '2026-02-01T12:00:00.000Z',
        name: 'Hair Color',
        value: 'brown',
        tags: ['Physical', 'Conscience'],
        sessionId: 'chat-1',
      },
    ]);
    state = characterReducer(
      state,
      updateCharacterEditorTrait({
        originalName: 'Hair Color',
        at: '2026-03-01T12:00:00.000Z',
        name: 'eye color',
        value: 'blue',
        tags: ['Physical'],
      }),
    );
    expect(state.character.traits).toEqual([
      {
        at: '2026-03-01T12:00:00.000Z',
        name: 'eye color',
        value: 'blue',
        tags: ['Physical'],
        sessionId: USER_TRAIT_SESSION_ID,
      },
    ]);
  });

  it('upserts traits with sessionId user and tags', () => {
    let state = characterReducer(
      undefined,
      replaceCharacterEditor({
        characterId: 'c1',
        character: createDefaultCharacter('Alex'),
        isDirty: false,
      }),
    );
    state = characterReducer(
      state,
      upsertCharacterEditorTrait({
        at: '2026-09-13T18:00:00.000Z',
        name: 'eye color',
        value: 'green',
        tags: ['Physical'],
      }),
    );
    expect(state.character.traits).toEqual([
      {
        at: '2026-09-13T18:00:00.000Z',
        name: 'eye color',
        value: 'green',
        tags: ['Physical'],
        sessionId: USER_TRAIT_SESSION_ID,
      },
    ]);
    expect(state.isDirty).toBe(true);

    state = characterReducer(
      state,
      upsertCharacterEditorTrait({
        at: '2026-09-14T18:00:00.000Z',
        name: 'Eye Color',
        value: 'hazel',
        tags: ['Physical', 'Psychological'],
      }),
    );
    expect(state.character.traits).toEqual([
      {
        at: '2026-09-14T18:00:00.000Z',
        name: 'Eye Color',
        value: 'hazel',
        tags: ['Physical', 'Psychological'],
        sessionId: USER_TRAIT_SESSION_ID,
      },
    ]);
  });

  it('reorders character images', () => {
    const img = (id: string): SavedImageRef => ({
      id,
      fileName: `${id}.png`,
      path: `/matchdate/assets/img/${id}.png`,
      createdAt: '2026-09-13T17:00:00.000Z',
    });
    const character = createDefaultCharacter('Alex');
    character.images = [img('a'), img('b'), img('c')];
    let state = characterReducer(
      undefined,
      replaceCharacterEditor({ characterId: 'c1', character, isDirty: false }),
    );
    state = characterReducer(
      state,
      reorderCharacterEditorImages([img('b'), img('a'), img('c')]),
    );
    expect(state.character.images.map((image) => image.id)).toEqual(['b', 'a', 'c']);
    expect(state.isDirty).toBe(true);
  });
});
