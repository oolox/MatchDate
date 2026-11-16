import { describe, expect, it } from 'vitest';
import { parseQuoteToolMessages, normalizeQuoteToolMessage } from './parseQuoteTools';

describe('parseQuoteToolMessages', () => {
  it('extracts quote tool fences and stamps a stable id when omitted', () => {
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
    const tools = parseQuoteToolMessages(content);
    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({
      tool: 'quote',
      origin: 'agent',
      action: 'display',
      data: {
        quote: 'The weather is nice today.',
        speaker: 'char-1',
        speakerName: 'John',
      },
    });
    expect(tools[0].id).toMatch(/^quote-[0-9a-f]+$/);
    const again = parseQuoteToolMessages(content);
    expect(again[0].id).toBe(tools[0].id);
  });

  it('accepts quote and speakerName on the envelope when data is omitted', () => {
    const content = `\`\`\`json
{
  "tool": "quote",
  "origin": "agent",
  "action": "display",
  "id": "ae23edbc-f2c9-4858-8e7b-fd24eda541ad",
  "speakerName": "Peyton",
  "quote": "Me and Hector? It's honest."
}
\`\`\`
`;
    const tools = parseQuoteToolMessages(content);
    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({
      id: 'ae23edbc-f2c9-4858-8e7b-fd24eda541ad',
      data: {
        quote: "Me and Hector? It's honest.",
        speakerName: 'Peyton',
      },
    });
  });

  it('keeps an explicit quote id', () => {
    const normalized = normalizeQuoteToolMessage({
      tool: 'quote',
      origin: 'agent',
      action: 'display',
      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      data: { quote: 'Hi', speakerName: 'Sara' },
    });
    expect(normalized?.id).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
  });

  it('ignores character tools and empty quotes', () => {
    const content = `\`\`\`json
{ "tool": "character", "origin": "agent", "action": "update", "id": "c1", "data": { "name": "A" } }
\`\`\`

\`\`\`json
{ "tool": "quote", "origin": "agent", "action": "display", "data": { "quote": "  ", "speakerName": "A" } }
\`\`\`
`;
    expect(parseQuoteToolMessages(content)).toEqual([]);
  });
});
