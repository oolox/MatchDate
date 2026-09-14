import { describe, expect, it } from 'vitest';
import { parseCharacterToolMessages } from './parseCharacterTools';

describe('parseCharacterToolMessages', () => {
  it('extracts character tool fences from assistant content', () => {
    const content = `Alex leans toward novelty.

\`\`\`json
{
  "tool": "character",
  "origin": "agent",
  "action": "update",
  "id": "char-1",
  "data": {
    "history": [{ "at": "2026-09-13T17:00:00.000Z", "summary": "Told a story" }]
  }
}
\`\`\`
`;
    const tools = parseCharacterToolMessages(content);
    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({
      tool: 'character',
      origin: 'agent',
      action: 'update',
      id: 'char-1',
    });
  });

  it('ignores non-tool json fences', () => {
    const content = '```json\n{"hello":"world"}\n```';
    expect(parseCharacterToolMessages(content)).toEqual([]);
  });

  it('ignores malformed json', () => {
    expect(parseCharacterToolMessages('```json\n{not json\n```')).toEqual([]);
  });
});
