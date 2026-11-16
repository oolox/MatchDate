import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultCharacter } from '../../types/character';
import { setFileStorageForTests } from '../storage';
import { inMemoryFileStorage } from '../storage/inMemoryFileStorage';
import { loadCharacter, saveCharacter } from '../storage/persistenceService';
import { processDateTranscriptTool } from './processDateTranscriptTool';
import type { DateTranscriptToolMessage } from '../../features/chat/attach/dateTranscriptAttach';

describe('processDateTranscriptTool', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('upserts dateTranscript into dateHistory on each associated character', async () => {
    const a = await saveCharacter(createDefaultCharacter('Ivan'), 'char-ivan');
    const b = await saveCharacter(createDefaultCharacter('Hazel'), 'char-hazel');

    const message: DateTranscriptToolMessage = {
      tool: 'dateTranscript',
      origin: 'agent',
      action: 'display',
      data: {
        id: 'transcript-1',
        location: 'Corner trattoria in the West Village',
        dateTime: '2028-09-12T19:00:00-04:00',
        characterIds: [a.id, b.id],
        segments: [
          { type: 'text', text: 'They sat down.' },
          {
            type: 'quote',
            quote: 'This is nice.',
            speaker: a.id,
            speakerName: 'Ivan',
          },
        ],
      },
    };

    const result = await processDateTranscriptTool(message);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.updatedCharacterIds.sort()).toEqual([a.id, b.id].sort());

    const loadedA = await loadCharacter(a.id);
    const loadedB = await loadCharacter(b.id);
    expect(loadedA.dateHistory).toHaveLength(1);
    expect(loadedB.dateHistory).toHaveLength(1);
    expect(loadedA.dateHistory[0]?.dateTranscript?.id).toBe('transcript-1');
    expect(loadedA.dateHistory[0]?.dateTranscript?.location).toBe(
      'Corner trattoria in the West Village',
    );
    expect(loadedB.dateHistory[0]?.dateTranscript?.dateTime).toBe(
      '2028-09-12T19:00:00-04:00',
    );
  });

  it('dedupes by transcript id on the same character', async () => {
    const saved = await saveCharacter(createDefaultCharacter('Ivan'), 'char-ivan-2');
    const message: DateTranscriptToolMessage = {
      tool: 'dateTranscript',
      origin: 'agent',
      action: 'display',
      data: {
        id: 'transcript-dup',
        location: 'Downtown coffee walk',
        dateTime: '2028-09-12T11:00:00-04:00',
        characterIds: [saved.id],
        segments: [{ type: 'text', text: 'They walked.' }],
      },
    };

    expect((await processDateTranscriptTool(message)).ok).toBe(true);
    expect((await processDateTranscriptTool(message)).ok).toBe(true);
    const loaded = await loadCharacter(saved.id);
    expect(loaded.dateHistory).toHaveLength(1);
  });
});
