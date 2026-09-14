import { describe, expect, it } from 'vitest';
import { formatToolResponseLabel } from '../components/chat/ToolResponse/toolResponseLabel';
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

  it('extracts completed character tool fences including data.name', () => {
    const content = `A story.

\`\`\`json
{
  "tool": "character",
  "origin": "agent",
  "action": "update",
  "id": "c4e8a12b-3d7f-4b1a-9e6c-2f8d05a713c9",
  "data": { "name": "Man-4", "history": [] }
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
});

describe('formatToolResponseLabel', () => {
  it('uses Updating/Updated with character name', () => {
    expect(
      formatToolResponseLabel({
        action: 'update',
        name: 'Man-4',
        id: 'c4e8a12b-3d7f-4b1a-9e6c-2f8d05a713c9',
        complete: false,
      }),
    ).toBe('Updating Man-4');
    expect(
      formatToolResponseLabel({
        action: 'update',
        name: 'Man-4',
        id: 'c4e8a12b-3d7f-4b1a-9e6c-2f8d05a713c9',
        complete: true,
      }),
    ).toBe('Updated Man-4');
  });

  it('uses Creating/Created with character name', () => {
    expect(
      formatToolResponseLabel({
        action: 'create',
        name: 'Alex',
        complete: false,
      }),
    ).toBe('Creating Alex');
    expect(
      formatToolResponseLabel({
        action: 'create',
        name: 'Alex',
        complete: true,
      }),
    ).toBe('Created Alex');
  });

  it('falls back to last 8 id digits when name is missing', () => {
    expect(
      formatToolResponseLabel({
        action: 'update',
        id: 'c4e8a12b-3d7f-4b1a-9e6c-2f8d05a713c9',
        complete: true,
      }),
    ).toBe('Updated 05a713c9');
  });
});
