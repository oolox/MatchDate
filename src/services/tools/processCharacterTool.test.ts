import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CharacterToolMessage } from '../../features/chat/attach/jsonAttach';
import { createDefaultCharacter } from '../../types/character';
import { setFileStorageForTests } from '../storage';
import { inMemoryFileStorage } from '../storage/inMemoryFileStorage';
import { loadCharacter, saveCharacter } from '../storage/persistenceService';
import {
  applyCharacterUpdatePatch,
  characterFromCreateData,
  formatCharacterToolToast,
  processCharacterTool,
  processTools,
} from './index';

describe('characterFromCreateData', () => {
  it('requires a non-empty name', () => {
    expect(characterFromCreateData({})).toBeNull();
    expect(characterFromCreateData({ name: '  ' })).toBeNull();
  });

  it('builds a character with defaults and optional fields', () => {
    const character = characterFromCreateData({
      name: 'Mary\'s husband',
      traits: [{ at: '2026-01-01T00:00:00.000Z', name: 'eye color', value: 'hazel' }],
    });
    expect(character?.name).toBe("Mary's husband");
    expect(character?.attributes).toHaveLength(10);
    expect(character?.traits).toEqual([
      { at: '2026-01-01T00:00:00.000Z', name: 'eye color', value: 'hazel' },
    ]);
    expect(character?.history).toEqual([]);
  });
});

describe('applyCharacterUpdatePatch', () => {
  it('appends history and keeps existing entries', () => {
    const existing = createDefaultCharacter('Alex');
    existing.history = [
      { at: '2026-01-01T00:00:00.000Z', summary: 'Introduced', source: 'chat' },
    ];

    const merged = applyCharacterUpdatePatch(existing, {
      name: 'Alex',
      history: [
        { at: '2026-09-13T18:00:00.000Z', summary: 'Went on a first date', source: 'chat' },
      ],
    });

    expect(merged?.appendedHistoryCount).toBe(1);
    expect(merged?.updatedFields).toEqual(['history']);
    expect(merged?.character.history).toHaveLength(2);
    expect(merged?.character.history[1]?.summary).toBe('Went on a first date');
  });

  it('upserts traits by name', () => {
    const existing = createDefaultCharacter('Alex');
    existing.traits = [
      { at: '2026-01-01T00:00:00.000Z', name: 'eye color', value: 'brown' },
    ];
    const merged = applyCharacterUpdatePatch(existing, {
      name: 'Alex',
      traits: [
        { at: '2026-09-13T18:00:00.000Z', name: 'eye color', value: 'green' },
        { at: '2026-09-13T18:00:00.000Z', name: 'hair color', value: 'black' },
      ],
    });
    expect(merged?.updatedFields).toEqual(['traits']);
    expect(merged?.character.traits).toEqual([
      { at: '2026-09-13T18:00:00.000Z', name: 'eye color', value: 'green' },
      { at: '2026-09-13T18:00:00.000Z', name: 'hair color', value: 'black' },
    ]);
  });

  it('returns null for empty patches', () => {
    expect(applyCharacterUpdatePatch(createDefaultCharacter('Alex'), {})).toBeNull();
  });
});

describe('formatCharacterToolToast', () => {
  it('names history and attributes in the toast', () => {
    expect(
      formatCharacterToolToast({
        ok: true,
        tool: 'character',
        action: 'update',
        id: '1',
        name: 'Man-4',
        document: {
          type: 'character',
          id: '1',
          name: 'Man-4',
          attributes: [],
          history: [],
          traits: [],
          createdAt: '',
          updatedAt: '',
        },
        appendedHistoryCount: 1,
        updatedFields: ['history'],
      }),
    ).toBe('Updated Man-4 History');

    expect(
      formatCharacterToolToast({
        ok: true,
        tool: 'character',
        action: 'update',
        id: '1',
        name: 'Man-4',
        document: {
          type: 'character',
          id: '1',
          name: 'Man-4',
          attributes: [],
          history: [],
          traits: [],
          createdAt: '',
          updatedAt: '',
        },
        appendedHistoryCount: 1,
        updatedFields: ['history', 'traits'],
      }),
    ).toBe('Updated Man-4 History | Trait');

    expect(
      formatCharacterToolToast({
        ok: true,
        tool: 'character',
        action: 'update',
        id: '1',
        name: 'Man-4',
        document: {
          type: 'character',
          id: '1',
          name: 'Man-4',
          attributes: [],
          history: [],
          traits: [],
          createdAt: '',
          updatedAt: '',
        },
        appendedHistoryCount: 1,
        updatedFields: ['history', 'attributes'],
      }),
    ).toBe('Updated Man-4 History | Attributes');
  });
});

describe('processCharacterTool', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('updates library character history from character.update', async () => {
    const saved = await saveCharacter(createDefaultCharacter('Man-4'), 'char-man-4-toast');

    const tool: CharacterToolMessage = {
      tool: 'character',
      origin: 'agent',
      action: 'update',
      id: saved.id,
      data: {
        name: 'Man-4',
        history: [
          {
            at: '2026-09-13T18:30:00.000Z',
            summary: 'Told story of last date at a quiet bar',
            source: 'chat',
          },
        ],
      },
    };

    const result = await processCharacterTool(tool);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.appendedHistoryCount).toBe(1);
    expect(result.updatedFields).toEqual(['history']);
    expect(result.name).toBe('Man-4');
    expect(formatCharacterToolToast(result)).toBe('Updated Man-4 History');
    expect(result.document.history).toHaveLength(1);

    const loaded = await loadCharacter(saved.id);
    expect(loaded.history).toEqual([
      {
        at: '2026-09-13T18:30:00.000Z',
        summary: 'Told story of last date at a quiet bar',
        source: 'chat',
      },
    ]);
  });

  it('returns not_found when id is missing from library', async () => {
    const result = await processCharacterTool({
      tool: 'character',
      origin: 'agent',
      action: 'update',
      id: 'missing-id',
      data: {
        name: 'Ghost',
        history: [{ at: '2026-09-13T00:00:00.000Z', summary: 'Nope' }],
      },
    });
    expect(result).toMatchObject({ ok: false, reason: 'not_found' });
  });

  it('creates a library character from character.create', async () => {
    const result = await processCharacterTool({
      tool: 'character',
      origin: 'agent',
      action: 'create',
      data: {
        name: 'Lumberjack',
        history: [
          {
            at: '2026-09-13T18:00:00.000Z',
            summary: 'Introduced as a rugged lumberjack',
            source: 'chat',
          },
        ],
        traits: [{ at: '2026-09-13T18:00:00.000Z', name: 'build', value: 'broad-shouldered' }],
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.action).toBe('create');
    expect(result.name).toBe('Lumberjack');
    expect(formatCharacterToolToast(result)).toBe('Created Lumberjack');
    const loaded = await loadCharacter(result.id);
    expect(loaded.name).toBe('Lumberjack');
    expect(loaded.history).toHaveLength(1);
    expect(loaded.traits).toEqual([
      { at: '2026-09-13T18:00:00.000Z', name: 'build', value: 'broad-shouldered' },
    ]);
  });

  it('rejects create without a name', async () => {
    const result = await processCharacterTool({
      tool: 'character',
      origin: 'agent',
      action: 'create',
      data: { history: [] },
    });
    expect(result).toMatchObject({ ok: false, reason: 'invalid_data' });
  });

  it('rejects unsupported actions', async () => {
    const result = await processCharacterTool({
      tool: 'character',
      origin: 'agent',
      action: 'read',
    });
    expect(result).toMatchObject({ ok: false, reason: 'unsupported_action' });
  });
});

describe('processTools', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('processes a batch of character updates', async () => {
    await saveCharacter(createDefaultCharacter('A'), 'a-toast-batch');
    const result = await processTools([
      {
        tool: 'character',
        origin: 'agent',
        action: 'update',
        id: 'a-toast-batch',
        data: {
          name: 'A',
          history: [{ at: '2026-09-13T00:00:00.000Z', summary: 'Beat one' }],
        },
      },
    ]);
    expect(result.applied).toBe(1);
    expect(result.failed).toBe(0);
    expect((await loadCharacter('a-toast-batch')).history).toHaveLength(1);
  });
});
