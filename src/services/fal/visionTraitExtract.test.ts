import { describe, expect, it } from 'vitest';
import { extractJsonObjectText, parseVisionTraitOutput } from './visionTraitExtract';

describe('visionTraitExtract', () => {
  it('extracts JSON from fenced markdown', () => {
    const raw = 'Here you go:\n```json\n{"traits":[]}\n```\n';
    expect(extractJsonObjectText(raw)).toBe('{"traits":[]}');
  });

  it('parses traits and drops low confidence / invalid tags', () => {
    const traits = parseVisionTraitOutput(
      JSON.stringify({
        traits: [
          {
            name: 'Eye Color',
            value: 'green',
            tags: ['Physical', 'Nope'],
            confidence: 0.9,
          },
          { name: 'mood', value: 'happy', tags: ['Psychological'], confidence: 0.2 },
          { name: '  ', value: 'x', tags: [], confidence: 0.9 },
        ],
      }),
    );
    expect(traits).toEqual([
      {
        name: 'Eye Color',
        value: 'green',
        tags: ['Physical'],
        confidence: 0.9,
      },
    ]);
  });

  it('throws when JSON is missing', () => {
    expect(() => parseVisionTraitOutput('no traits here')).toThrow(/not valid JSON/i);
  });
});
