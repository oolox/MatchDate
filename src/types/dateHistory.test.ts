import { describe, expect, it } from 'vitest';
import {
  coerceDateHistory,
  upsertDateHistoryPlan,
  upsertDateHistorySummary,
  upsertDateHistoryTranscript,
} from './dateHistory';

describe('dateHistory', () => {
  it('pairs legacy summary + transcript by location and dateTime and backfills datePlan', () => {
    const { dateHistory, migrated } = coerceDateHistory({
      dateSummary: [
        {
          id: 's1',
          shortSummary: 'Warm.',
          location: 'Cafe',
          justification: 'Fit.',
          character: [{ id: 'c1', dateReview: 'Ok', dateScore: 7, dateFit: 7 }],
          dateTime: '2028-01-01T18:00:00Z',
          chatId: 'chat-1',
        },
      ],
      dateTranscript: [
        {
          id: 't1',
          location: 'Cafe',
          dateTime: '2028-01-01T18:00:00Z',
          characterIds: ['c1'],
          segments: [{ type: 'text', text: 'Hi.' }],
        },
      ],
    });

    expect(migrated).toBe(true);
    expect(dateHistory).toHaveLength(1);
    expect(dateHistory[0]?.dateSummary?.id).toBe('s1');
    expect(dateHistory[0]?.dateTranscript?.id).toBe('t1');
    expect(dateHistory[0]?.datePlan?.location).toBe('Cafe');
    expect(dateHistory[0]?.datePlan?.dateTime).toBe('2028-01-01T18:00:00Z');
  });

  it('keeps unmatched legacy sides as separate entries', () => {
    const { dateHistory } = coerceDateHistory({
      dateSummary: [
        {
          id: 's1',
          shortSummary: 'A.',
          location: 'Park',
          justification: 'Fit.',
          character: [{ id: 'c1', dateReview: 'Ok', dateScore: 7, dateFit: 7 }],
          dateTime: '2028-01-01T18:00:00Z',
          chatId: 'chat-1',
        },
      ],
      dateTranscript: [
        {
          id: 't1',
          location: 'Cafe',
          dateTime: '2028-01-02T18:00:00Z',
          characterIds: ['c1'],
          segments: [{ type: 'text', text: 'Hi.' }],
        },
      ],
    });

    expect(dateHistory).toHaveLength(2);
    expect(dateHistory[0]?.dateSummary?.id).toBe('s1');
    expect(dateHistory[0]?.datePlan?.location).toBe('Park');
    expect(dateHistory[0]?.dateTranscript).toBeUndefined();
    expect(dateHistory[1]?.dateTranscript?.id).toBe('t1');
    expect(dateHistory[1]?.datePlan?.location).toBe('Cafe');
    expect(dateHistory[1]?.dateSummary).toBeUndefined();
  });

  it('upserts plan then transcript then summary onto one entry', () => {
    const withPlan = upsertDateHistoryPlan([], {
      id: 'p1',
      location: 'Cafe',
      dateTime: '2028-01-01T18:00:00Z',
      characterIds: ['c1'],
    });
    const withTranscript = upsertDateHistoryTranscript(withPlan, {
      id: 't1',
      location: 'Cafe',
      dateTime: '2028-01-01T18:00:00Z',
      characterIds: ['c1'],
      segments: [{ type: 'text', text: 'Hi.' }],
    });
    const paired = upsertDateHistorySummary(withTranscript, {
      id: 's1',
      description: '',
      shortSummary: 'Warm.',
      location: 'Cafe',
      justification: 'Fit.',
      character: [{ id: 'c1', dateReview: 'Ok', dateScore: 7, dateFit: 7 }],
      dateTime: '2028-01-01T18:00:00Z',
      chatId: 'chat-1',
    });

    expect(paired).toHaveLength(1);
    expect(paired[0]?.datePlan?.id).toBe('p1');
    expect(paired[0]?.dateTranscript?.id).toBe('t1');
    expect(paired[0]?.dateSummary?.id).toBe('s1');
  });
});
