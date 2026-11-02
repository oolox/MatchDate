import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultCharacter } from '../../types/character';
import { setFileStorageForTests } from '../storage';
import { inMemoryFileStorage } from '../storage/inMemoryFileStorage';
import { loadCharacter, saveCharacter } from '../storage/persistenceService';
import { processDateSummaryTool } from './processDateSummaryTool';
import type { DateSummaryToolMessage } from '../../features/chat/attach/dateSummaryAttach';

describe('processDateSummaryTool', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('appends dateSummary.data onto each associated character and saves', async () => {
    const a = await saveCharacter(createDefaultCharacter('Ivan'), 'char-ivan');
    const b = await saveCharacter(createDefaultCharacter('Hazel'), 'char-hazel');

    const message: DateSummaryToolMessage = {
      tool: 'dateSummary',
      origin: 'agent',
      action: 'display',
      data: {
        id: 'summary-1',
        shortSummary: 'Quiet evening.',
        location: 'Community garden then taqueria.',
        justification: 'Aligned values.',
        character: [
          {
            id: a.id,
            dateReview: 'Felt grounded.',
            dateScore: 8,
            dateFit: 9,
          },
          {
            id: b.id,
            dateReview: 'Felt seen.',
            dateScore: 9,
            dateFit: 8,
          },
        ],
        dateTime: '2028-09-12T19:00:00-04:00',
        chatId: 'chat-dates',
      },
    };

    const result = await processDateSummaryTool(message);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.updatedCharacterIds.sort()).toEqual([a.id, b.id].sort());

    const loadedA = await loadCharacter(a.id);
    const loadedB = await loadCharacter(b.id);
    expect(loadedA.dateSummary).toHaveLength(1);
    expect(loadedB.dateSummary).toHaveLength(1);
    expect(loadedA.dateSummary[0]?.id).toBe('summary-1');
    expect(loadedA.dateSummary[0]?.shortSummary).toBe('Quiet evening.');
    expect(loadedB.dateSummary[0]?.character).toHaveLength(2);
  });

  it('dedupes by summary id on the same character', async () => {
    const saved = await saveCharacter(createDefaultCharacter('Ivan'), 'char-ivan-2');
    const message: DateSummaryToolMessage = {
      tool: 'dateSummary',
      origin: 'agent',
      action: 'display',
      data: {
        id: 'summary-dup',
        shortSummary: 'Once.',
        location: 'Cafe.',
        justification: 'Fit.',
        character: [
          { id: saved.id, dateReview: 'Ok.', dateScore: 7, dateFit: 7 },
        ],
        dateTime: '2028-09-12T19:00:00-04:00',
        chatId: 'chat-1',
      },
    };

    expect((await processDateSummaryTool(message)).ok).toBe(true);
    expect((await processDateSummaryTool(message)).ok).toBe(true);
    const loaded = await loadCharacter(saved.id);
    expect(loaded.dateSummary).toHaveLength(1);
  });
});
