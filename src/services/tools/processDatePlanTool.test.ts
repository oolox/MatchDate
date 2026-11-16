import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultCharacter } from '../../types/character';
import { setFileStorageForTests } from '../storage';
import { inMemoryFileStorage } from '../storage/inMemoryFileStorage';
import { loadCharacter, saveCharacter } from '../storage/persistenceService';
import { processDatePlanTool } from './processDatePlanTool';
import { processDateTranscriptTool } from './processDateTranscriptTool';
import { processDateSummaryTool } from './processDateSummaryTool';
import type { DatePlanToolMessage } from '../../features/chat/attach/datePlanAttach';

describe('processDatePlanTool', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('upserts datePlan into dateHistory on each associated character', async () => {
    const a = await saveCharacter(createDefaultCharacter('Ivan'), 'char-ivan');
    const b = await saveCharacter(createDefaultCharacter('Hazel'), 'char-hazel');

    const message: DatePlanToolMessage = {
      tool: 'datePlan',
      origin: 'agent',
      action: 'display',
      data: {
        id: 'plan-1',
        dateTime: '2028-09-12T19:00:00-04:00',
        location: 'Corner trattoria in the West Village',
        characterIds: [a.id, b.id],
      },
    };

    const result = await processDatePlanTool(message);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.updatedCharacterIds.sort()).toEqual([a.id, b.id].sort());

    const loadedA = await loadCharacter(a.id);
    const loadedB = await loadCharacter(b.id);
    expect(loadedA.dateHistory).toHaveLength(1);
    expect(loadedB.dateHistory).toHaveLength(1);
    expect(loadedA.dateHistory[0]?.datePlan?.id).toBe('plan-1');
    expect(loadedA.dateHistory[0]?.datePlan?.location).toBe(
      'Corner trattoria in the West Village',
    );
  });

  it('pairs later transcript and summary onto the same dateHistory entry', async () => {
    const saved = await saveCharacter(createDefaultCharacter('Ivan'), 'char-ivan-pair');
    const plan: DatePlanToolMessage = {
      tool: 'datePlan',
      origin: 'agent',
      action: 'display',
      data: {
        id: 'plan-pair',
        dateTime: '2028-09-12T19:00:00-04:00',
        location: 'Cafe.',
        characterIds: [saved.id],
      },
    };

    expect((await processDatePlanTool(plan)).ok).toBe(true);
    expect(
      (
        await processDateTranscriptTool({
          tool: 'dateTranscript',
          origin: 'agent',
          action: 'display',
          data: {
            id: 'transcript-pair',
            location: 'Cafe.',
            dateTime: '2028-09-12T19:00:00-04:00',
            characterIds: [saved.id],
            segments: [{ type: 'text', text: 'They sat.' }],
          },
        })
      ).ok,
    ).toBe(true);
    expect(
      (
        await processDateSummaryTool({
          tool: 'dateSummary',
          origin: 'agent',
          action: 'display',
          data: {
            id: 'summary-pair',
            shortSummary: 'Warm.',
            location: 'Cafe.',
            justification: 'Fit.',
            character: [
              { id: saved.id, dateReview: 'Nice.', dateScore: 8, dateFit: 8 },
            ],
            dateTime: '2028-09-12T19:00:00-04:00',
            chatId: 'chat-1',
          },
        })
      ).ok,
    ).toBe(true);

    const loaded = await loadCharacter(saved.id);
    expect(loaded.dateHistory).toHaveLength(1);
    expect(loaded.dateHistory[0]?.datePlan?.id).toBe('plan-pair');
    expect(loaded.dateHistory[0]?.dateTranscript?.id).toBe('transcript-pair');
    expect(loaded.dateHistory[0]?.dateSummary?.id).toBe('summary-pair');
  });
});
