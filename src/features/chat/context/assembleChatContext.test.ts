import { describe, expect, it } from 'vitest';
import { getBundledPromptBody } from '../bundledPrompts';
import {
  assembleChatContext,
  characterScoreCards,
  detectChatIntent,
  limitCharacterHistory,
  parseSessionCommands,
  selectPromptSections,
  selectValueModelPassages,
} from './assembleChatContext';

const SCHWARTZ = `# Schwartz Value Model

## The 10 Basic Values

Self-Direction, Stimulation, Hedonism, Achievement, Power, Security, Conformity, Tradition, Benevolence, Universalism.

## Four Higher-Order Dimensions

Openness, Conservation, Self-Transcendence, Self-Enhancement. All ten: Self-Direction, Stimulation, Hedonism, Achievement, Power, Security, Conformity, Tradition, Benevolence, Universalism.

## Interpersonal Compatibility

### Low Compatibility: Opposite Values

Self-Direction, Stimulation, Hedonism, Achievement, Power, Security, Conformity, Tradition, Benevolence, Universalism clash in a single table.

### The Role of Hedonism

Hedonism sits beside Stimulation and against Conformity.

## Romantic Relationships

### High-Friction Romances

#### The Thrill-Seeker and the Homebody

Stimulation versus Security. One wants novelty. The other wants safety.

#### The Rebel and the Rule-Follower

Self-Direction versus Conformity.
`;

function characterFence(name: string, scores: Array<[string, number]>, history: string[]): string {
  return `\`\`\`json\n${JSON.stringify(
    {
      tool: 'character',
      origin: 'user',
      action: 'write',
      id: name.toLowerCase(),
      data: {
        name,
        attributes: scores.map(([scoreName, value]) => ({ name: scoreName, value })),
        history: history.map((summary) => ({ at: '2026-01-01', summary })),
        traits: [{ name: 'eye color', value: 'green' }],
      },
    },
    null,
    2,
  )}\n\`\`\``;
}

describe('parseSessionCommands', () => {
  it('reads the last in-range set weight and set history', () => {
    expect(parseSessionCommands('set weight 25 then set weight 101 and set history 5')).toEqual({
      weight: 25,
      recentHistoryCount: 5,
    });
  });
});

describe('detectChatIntent', () => {
  it('treats a date word as a date even with no attachments', () => {
    expect(detectChatIntent('Send them on a date', 0)).toBe('date');
  });

  it('treats one attached character as conversation', () => {
    expect(detectChatIntent('How are you?', 1)).toBe('conversation');
  });

  it('treats ask-someone with no new attachment as conversation', () => {
    expect(detectChatIntent('Ask hector how his relationship is', 0)).toBe('conversation');
  });
});

describe('selectPromptSections', () => {
  const prompt = getBundledPromptBody('prompt-masterDater');

  it('keeps the quote schema when earlier turns already attached characters', () => {
    const prompt = getBundledPromptBody('prompt-masterDater');
    const history = characterFence('Hector', [['Stimulation', 80]], ['met Peyton']);
    const text = assembleChatContext({
      promptBody: prompt,
      userText: 'Ask hector how his relationship is',
      apiContent: 'Ask hector how his relationship is',
      historyApiContent: history,
      valueModels: [],
    });
    expect(text).toContain('### `quote`');
    expect(text).not.toContain('### `datePlan`');
  });

  it('keeps date tool schemas for a date and drops them for a plain question', () => {
    const date = selectPromptSections(prompt, 'date', 2);
    const question = selectPromptSections(prompt, 'question', 0);
    expect(date).toContain('### `datePlan`');
    expect(date).toContain('### `dateSummary`');
    expect(question).not.toContain('### `datePlan`');
    expect(question).toContain('Your job');
  });

  it('returns an unrelated prompt unchanged', () => {
    const other = getBundledPromptBody('personality-test');
    expect(selectPromptSections(other, 'question', 0)).toBe(other.trim());
  });
});

describe('selectValueModelPassages', () => {
  it('keeps the clash that matches the two top scores and skips unrelated clashes', () => {
    const cards = characterScoreCards(
      [
        characterFence('Alex', [['Stimulation', 90], ['Hedonism', 40]], []),
        characterFence('Blair', [['Security', 88], ['Tradition', 20]], []),
      ].join('\n'),
    );
    const passages = selectValueModelPassages(SCHWARTZ, cards);
    expect(passages).toContain('The 10 Basic Values');
    expect(passages).toContain('Thrill-Seeker');
    expect(passages).not.toContain('Rebel and the Rule-Follower');
  });

  it('returns a non-Schwartz model in full', () => {
    const body = '# Other theory\n\nBe kind.';
    expect(selectValueModelPassages(body, [])).toBe(body);
  });
});

describe('limitCharacterHistory', () => {
  it('keeps the last N beats and leaves traits in place', () => {
    const fenced = characterFence('Alex', [['Security', 10]], ['one', 'two', 'three', 'four']);
    const limited = limitCharacterHistory(fenced, 3);
    expect(limited).toContain('two');
    expect(limited).toContain('four');
    expect(limited).not.toContain('one');
    expect(limited).toContain('green');
  });
});

describe('assembleChatContext', () => {
  it('puts the session weight and the named value model after the prompt', () => {
    const text = assembleChatContext({
      promptBody: getBundledPromptBody('prompt-masterDater'),
      userText: 'hello',
      apiContent: 'hello',
      weight: 62,
      recentHistoryCount: 3,
      valueModels: [{ name: 'MD-ValueModel.md', body: SCHWARTZ }],
    });
    expect(text).toContain('compatibility weight: 62');
    expect(text).toContain('[Value model: MD-ValueModel.md]');
    expect(text).toContain('The 10 Basic Values');
    expect(text).not.toContain('Thrill-Seeker');
  });
});
