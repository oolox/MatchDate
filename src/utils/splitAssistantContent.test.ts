import { describe, expect, it } from 'vitest';
import {
  formatCharacterToolPatchSummary,
  formatToolResponseLabel,
} from '../components/chat/ToolResponse/toolResponseLabel';
import { splitAssistantContent } from './splitAssistantContent';

describe('splitAssistantContent', () => {
  it('returns a single markdown block when there are no fences', () => {
    expect(splitAssistantContent('Hello there')).toEqual([
      { type: 'markdown', content: 'Hello there' },
    ]);
  });

  it('keeps non-tool json fences inside markdown', () => {
    const content = 'Note:\n\n```json\n{"hello":"world"}\n```\n';
    const blocks = splitAssistantContent(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: 'markdown', content });
  });

  it('extracts completed character tool fences including data.name and counts', () => {
    const content = `A story.

\`\`\`json
{
  "tool": "character",
  "origin": "agent",
  "action": "update",
  "id": "c4e8a12b-3d7f-4b1a-9e6c-2f8d05a713c9",
  "data": {
    "name": "Man-4",
    "history": [{ "at": "2026-01-01T00:00:00.000Z", "summary": "Met" }],
    "traits": [
      { "at": "2026-01-01T00:00:00.000Z", "name": "eyes", "value": "green", "tags": ["Physical"] },
      { "at": "2026-01-01T00:00:00.000Z", "name": "hair", "value": "dark", "tags": ["Physical"] }
    ]
  }
}
\`\`\`
`;
    const blocks = splitAssistantContent(content);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: 'markdown', content: 'A story.\n\n' });
    expect(blocks[1]).toMatchObject({
      type: 'tool',
      tool: 'character',
      action: 'update',
      id: 'c4e8a12b-3d7f-4b1a-9e6c-2f8d05a713c9',
      name: 'Man-4',
      traitCount: 2,
      historyCount: 1,
      complete: true,
    });
  });

  it('shows a streaming incomplete tool fence as an incomplete tool block', () => {
    const content = `Story

\`\`\`json
{
  "tool": "character",
  "origin": "agent",
  "action": "create",
  "id": "char-9",
  "data": { "name": "Alex"
`;
    const blocks = splitAssistantContent(content, { isStreaming: true });
    expect(blocks).toHaveLength(2);
    expect(blocks[1]).toMatchObject({
      type: 'tool',
      tool: 'character',
      action: 'create',
      id: 'char-9',
      name: 'Alex',
      complete: false,
    });
  });

  it('does not treat incomplete non-tool json as a tool while streaming', () => {
    const content = '```json\n{"hello":';
    const blocks = splitAssistantContent(content, { isStreaming: true });
    expect(blocks).toEqual([{ type: 'markdown', content }]);
  });

  it('extracts completed quote tool fences', () => {
    const content = `They talk.

\`\`\`json
{
  "tool": "quote",
  "origin": "agent",
  "action": "display",
  "data": {
    "quote": "The weather is nice today.",
    "speaker": "char-1",
    "speakerName": "John"
  }
}
\`\`\`
`;
    const blocks = splitAssistantContent(content);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: 'markdown', content: 'They talk.\n\n' });
    expect(blocks[1]).toMatchObject({
      type: 'quote',
      quote: 'The weather is nice today.',
      speaker: 'char-1',
      speakerName: 'John',
      complete: true,
    });
    expect((blocks[1] as { id: string }).id).toMatch(/^quote-/);
  });

  it('shows a streaming incomplete quote fence as an incomplete quote block', () => {
    const content = `Story

\`\`\`json
{
  "tool": "quote",
  "origin": "agent",
  "action": "display",
  "data": { "quote": "Hello there", "speakerName": "Sara"
`;
    const blocks = splitAssistantContent(content, { isStreaming: true });
    expect(blocks).toHaveLength(2);
    expect(blocks[1]).toMatchObject({
      type: 'quote',
      quote: 'Hello there',
      speakerName: 'Sara',
      complete: false,
    });
  });

  it('skips quote fences with empty quote text', () => {
    const content = `\`\`\`json
{
  "tool": "quote",
  "origin": "agent",
  "action": "display",
  "data": { "quote": "   ", "speakerName": "John" }
}
\`\`\`
`;
    const blocks = splitAssistantContent(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe('markdown');
  });

  it('extracts completed dateSummary tool fences', () => {
    const content = `After the date.

\`\`\`json
{
  "tool": "dateSummary",
  "origin": "agent",
  "action": "display",
  "data": {
    "shortSummary": "Warm but tentative.",
    "location": "Corner cafe on Market Street overlooking the square.",
    "justification": "Adjacent priorities softened friction.",
    "character": [
      {
        "id": "char-1",
        "dateReview": "Felt hopeful after the coffee talk.",
        "dateScore": 7,
        "dateFit": 8
      },
      {
        "id": "char-2",
        "dateReview": "Liked the pace but stayed cautious.",
        "dateScore": 6,
        "dateFit": 5
      }
    ],
    "dateTime": "2026-11-01T19:00:00.000Z",
    "chatId": "sess-9"
  }
}
\`\`\`
`;
    const blocks = splitAssistantContent(content);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: 'markdown', content: 'After the date.\n\n' });
    expect(blocks[1]).toMatchObject({
      type: 'dateSummary',
      shortSummary: 'Warm but tentative.',
      location: 'Corner cafe on Market Street overlooking the square.',
      justification: 'Adjacent priorities softened friction.',
      character: [
        {
          id: 'char-1',
          dateReview: 'Felt hopeful after the coffee talk.',
          dateScore: 7,
          dateFit: 8,
        },
        {
          id: 'char-2',
          dateReview: 'Liked the pace but stayed cautious.',
          dateScore: 6,
          dateFit: 5,
        },
      ],
      dateTime: '2026-11-01T19:00:00.000Z',
      chatId: 'sess-9',
      complete: true,
    });
    expect((blocks[1] as { id: string }).id).toMatch(/^dateSummary-/);
  });

  it('shows a streaming incomplete dateSummary fence as an incomplete block', () => {
    const content = `Story

\`\`\`json
{
  "tool": "dateSummary",
  "origin": "agent",
  "action": "display",
  "data": { "shortSummary": "Awkward start", "character": [{ "id": "char-1", "dateReview": "Nervous", "dateScore": 4, "dateFit": 3 }], "dateTime": "2026-11-01T19:00:00.000Z"
`;
    const blocks = splitAssistantContent(content, { isStreaming: true });
    expect(blocks).toHaveLength(2);
    expect(blocks[1]).toMatchObject({
      type: 'dateSummary',
      shortSummary: 'Awkward start',
      character: [
        {
          id: 'char-1',
          dateReview: 'Nervous',
          dateScore: 4,
          dateFit: 3,
        },
      ],
      dateTime: '2026-11-01T19:00:00.000Z',
      complete: false,
    });
  });

  it('skips dateSummary fences missing required fields', () => {
    const content = `\`\`\`json
{
  "tool": "dateSummary",
  "origin": "agent",
  "action": "display",
  "data": {
    "shortSummary": "Warm.",
    "location": "A quiet bar downtown.",
    "justification": "Fit.",
    "character": [{ "id": "char-1", "dateReview": "Nice.", "dateScore": 7, "dateFit": 8 }],
    "dateTime": "2026-11-01T19:00:00.000Z"
  }
}
\`\`\`
`;
    const blocks = splitAssistantContent(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe('markdown');
  });

  it('accepts legacy dateSummary characters GUID array', () => {
    const content = `\`\`\`json
{
  "tool": "dateSummary",
  "origin": "agent",
  "action": "display",
  "data": {
    "shortSummary": "A quiet evening.",
    "justification": "Aligned values.",
    "characters": [
      "b97ca029-9b7b-495c-8b8a-ac924e6ed0f6",
      "0a4fa111-89b6-459f-a3d4-af278e293034"
    ],
    "dateTime": "2028-09-12T19:00:00-04:00",
    "chatId": "chat-dates"
  }
}
\`\`\`
`;
    const blocks = splitAssistantContent(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: 'dateSummary',
      shortSummary: 'A quiet evening.',
      location: '',
      chatId: 'chat-dates',
      character: [
        {
          id: 'b97ca029-9b7b-495c-8b8a-ac924e6ed0f6',
          dateReview: '',
          dateScore: 0,
          dateFit: 0,
        },
        {
          id: '0a4fa111-89b6-459f-a3d4-af278e293034',
          dateReview: '',
          dateScore: 0,
          dateFit: 0,
        },
      ],
      complete: true,
    });
  });
});

describe('formatToolResponseLabel', () => {
  it('uses UPDATING/UPDATED with character name', () => {
    expect(
      formatToolResponseLabel({
        action: 'update',
        name: 'Man-4',
        id: 'c4e8a12b-3d7f-4b1a-9e6c-2f8d05a713c9',
        complete: false,
      }),
    ).toBe('UPDATING : Man-4');
    expect(
      formatToolResponseLabel({
        action: 'update',
        name: 'Man-4',
        id: 'c4e8a12b-3d7f-4b1a-9e6c-2f8d05a713c9',
        complete: true,
      }),
    ).toBe('UPDATED : Man-4');
  });

  it('uses CREATING/CREATED with character name', () => {
    expect(
      formatToolResponseLabel({
        action: 'create',
        name: 'Alex',
        complete: false,
      }),
    ).toBe('CREATING : Alex');
    expect(
      formatToolResponseLabel({
        action: 'create',
        name: 'Alex',
        complete: true,
      }),
    ).toBe('CREATED : Alex');
  });

  it('falls back to last 8 id digits when name is missing', () => {
    expect(
      formatToolResponseLabel({
        action: 'update',
        id: 'c4e8a12b-3d7f-4b1a-9e6c-2f8d05a713c9',
        complete: true,
      }),
    ).toBe('UPDATED : 05a713c9');
  });
});

describe('formatCharacterToolPatchSummary', () => {
  it('omits zero counts and wraps in parentheses', () => {
    expect(formatCharacterToolPatchSummary(2, 1)).toBe('(2 traits,1 history)');
    expect(formatCharacterToolPatchSummary(0, 1)).toBe('(1 history)');
    expect(formatCharacterToolPatchSummary(1, 0)).toBe('(1 trait)');
    expect(formatCharacterToolPatchSummary(0, 0)).toBe('');
  });
});
