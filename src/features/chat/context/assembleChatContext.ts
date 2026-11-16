import { BASIC_VALUES, type BasicValue } from '../../../types/character';
import { parseCharacterToolMessages } from '../attach/parseCharacterTools';
import {
  DEFAULT_COMPATIBILITY_WEIGHT,
  DEFAULT_RECENT_HISTORY_COUNT,
} from '../constants';
import { splitMarkdownSections, type MarkdownSection } from './markdownSections';

export type ChatIntent = 'date' | 'conversation' | 'edit' | 'question';

export interface SessionCommandPatch {
  weight?: number;
  recentHistoryCount?: number;
}

export interface ValueModelSource {
  name: string;
  body: string;
}

export interface CharacterScoreCard {
  id?: string;
  name?: string;
  top: Array<{ name: string; value: number }>;
}

const TOOL_HEADING = 'When to emit tools';

/** Last `set weight N` / `set history N` in the user's text. Out-of-range numbers are ignored. */
export function parseSessionCommands(userText: string): SessionCommandPatch {
  const patch: SessionCommandPatch = {};
  for (const match of userText.matchAll(/\bset\s+weight\s+(\d{1,3})\b/gi)) {
    const value = Number(match[1]);
    if (value >= 0 && value <= 100) {
      patch.weight = value;
    }
  }
  for (const match of userText.matchAll(/\bset\s+history\s+(\d{1,2})\b/gi)) {
    const value = Number(match[1]);
    if (value >= 0 && value <= 20) {
      patch.recentHistoryCount = value;
    }
  }
  return patch;
}

export function detectChatIntent(userText: string, characterCount: number): ChatIntent {
  const text = userText.toLowerCase();
  if (/\b(date|dates|dating|go out|night out|dinner date)\b/.test(text)) {
    return 'date';
  }
  if (characterCount >= 2 && /\b(together|outing|meet)\b/.test(text)) {
    return 'date';
  }
  if (
    /\b(trait|traits|appearance|eye|hair|score|scores|attribute|attributes)\b/.test(text)
  ) {
    return 'edit';
  }
  if (characterCount >= 1) {
    return 'conversation';
  }
  if (/\b(ask|tell)\b/.test(text)) {
    return 'conversation';
  }
  return 'question';
}

export function characterScoreCards(content: string, topN = 2): CharacterScoreCard[] {
  return parseCharacterToolMessages(content).map((tool) => {
    const data =
      tool.data && typeof tool.data === 'object'
        ? (tool.data as { name?: unknown; attributes?: unknown })
        : undefined;
    const attributes = Array.isArray(data?.attributes) ? data.attributes : [];
    const ranked = attributes
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        const attribute = entry as { name?: unknown; value?: unknown };
        if (typeof attribute.name !== 'string' || typeof attribute.value !== 'number') {
          return null;
        }
        return { name: attribute.name, value: attribute.value };
      })
      .filter((entry): entry is { name: string; value: number } => entry !== null)
      .sort((a, b) => b.value - a.value)
      .slice(0, topN);
    return {
      id: tool.id,
      name: typeof data?.name === 'string' ? data.name : undefined,
      top: ranked,
    };
  });
}

/** Keep the last `limit` history beats on each character tool fence. Traits stay. */
export function limitCharacterHistory(content: string, limit: number): string {
  if (!Number.isFinite(limit) || limit < 0) {
    return content;
  }
  return content.replace(/```json\s*([\s\S]*?)```/gi, (full, raw: string) => {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return full;
      }
      const tool = parsed as { tool?: unknown; data?: unknown };
      if (tool.tool !== 'character' || !tool.data || typeof tool.data !== 'object') {
        return full;
      }
      const data = tool.data as { history?: unknown };
      if (!Array.isArray(data.history)) {
        return full;
      }
      const next = {
        ...(parsed as Record<string, unknown>),
        data: {
          ...(data as Record<string, unknown>),
          history: data.history.slice(-limit),
        },
      };
      return `\`\`\`json\n${JSON.stringify(next, null, 2)}\n\`\`\``;
    } catch {
      return full;
    }
  });
}

function titleStarts(section: MarkdownSection, prefix: string): boolean {
  return section.title.toLowerCase().startsWith(prefix.toLowerCase());
}

function titleIncludes(section: MarkdownSection, needle: string): boolean {
  return section.title.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Section the MasterDater prompt by intent. Any other prompt is returned whole.
 * A date turn that lost its date schemas falls back to the full prompt.
 */
export function selectPromptSections(promptBody: string, intent: ChatIntent, characterCount: number): string {
  const sections = splitMarkdownSections(promptBody);
  if (!sections.some((section) => titleStarts(section, TOOL_HEADING))) {
    return promptBody.trim();
  }

  const wantsCharacterTools =
    characterCount > 0 || intent === 'edit' || intent === 'date' || intent === 'conversation';
  const wantsContinuity = wantsCharacterTools;
  const wantsConversation = characterCount > 0 || intent === 'conversation' || intent === 'date';
  const wantsDate = intent === 'date';
  const wantsQuote = wantsDate || intent === 'conversation' || characterCount > 0;

  const chosen = sections.filter((section) => {
    if (section.level === 0 || section.title === '') {
      return true;
    }
    if (titleStarts(section, 'Inputs') || titleStarts(section, 'Your job')) {
      return true;
    }
    if (titleStarts(section, 'Presentation note')) {
      return true;
    }
    if (titleStarts(section, 'Continuity') || titleStarts(section, 'Trait tags')) {
      return wantsContinuity;
    }
    if (titleStarts(section, 'Character Activities')) {
      return wantsConversation || wantsDate;
    }
    if (titleStarts(section, 'Conversation')) {
      return wantsConversation;
    }
    if (titleStarts(section, 'Date')) {
      return wantsDate;
    }
    if (titleStarts(section, TOOL_HEADING)) {
      return wantsCharacterTools || wantsDate || wantsQuote;
    }
    if (
      titleIncludes(section, 'datePlan') ||
      titleIncludes(section, 'dateTranscript') ||
      titleIncludes(section, 'dateSummary')
    ) {
      return wantsDate;
    }
    if (titleIncludes(section, 'quote')) {
      return wantsQuote;
    }
    if (
      titleStarts(section, '`update`') ||
      titleStarts(section, '`create`') ||
      titleStarts(section, 'Update tool') ||
      titleStarts(section, 'Create tool')
    ) {
      return wantsCharacterTools;
    }
    return false;
  });

  const text = chosen.map((section) => section.text.trim()).filter(Boolean).join('\n\n');
  if (wantsDate && !text.includes('datePlan')) {
    return promptBody.trim();
  }
  return text || promptBody.trim();
}

function valuesIn(text: string): BasicValue[] {
  return BASIC_VALUES.filter((name) => text.includes(name));
}

function isSchwartzValueModel(body: string): boolean {
  return /schwartz/i.test(body) && BASIC_VALUES.every((name) => body.includes(name));
}

function isDefinitionSection(section: MarkdownSection): boolean {
  return /10 basic values|higher-order/i.test(section.title);
}

/**
 * Schwartz models contribute the definition sections plus the passages that
 * name this turn's top scores. Any other model is included in full.
 */
export function selectValueModelPassages(
  body: string,
  cards: CharacterScoreCard[],
): string {
  const trimmed = body.trim();
  if (!trimmed || !isSchwartzValueModel(trimmed)) {
    return trimmed;
  }

  const sections = splitMarkdownSections(trimmed);
  const groups = cards.map((card) => new Set(card.top.map((score) => score.name)));
  const chosen = sections.filter((section) => {
    if (section.level <= 1 || isDefinitionSection(section)) {
      return true;
    }
    const mentioned = valuesIn(section.text);
    if (mentioned.length === 0 || mentioned.length >= 8) {
      return false;
    }
    if (groups.length >= 2) {
      const covered = groups.filter((group) => mentioned.some((name) => group.has(name)));
      return covered.length >= 2;
    }
    if (groups.length === 1) {
      return mentioned.some((name) => groups[0].has(name));
    }
    return false;
  });

  return chosen.map((section) => section.text.trim()).filter(Boolean).join('\n\n');
}

export function assembleChatContext(options: {
  promptBody: string;
  userText: string;
  apiContent: string;
  /** Earlier turns. Used so a follow-up still gets conversation and quote rules. */
  historyApiContent?: string;
  weight?: number;
  recentHistoryCount?: number;
  valueModels: ValueModelSource[];
}): string {
  const cards = characterScoreCards(options.apiContent);
  const historyCount = options.historyApiContent
    ? characterScoreCards(options.historyApiContent).length
    : 0;
  const characterCount = Math.max(cards.length, historyCount);
  const intent = detectChatIntent(options.userText, characterCount);
  const weight = options.weight ?? DEFAULT_COMPATIBILITY_WEIGHT;
  const recentHistoryCount = options.recentHistoryCount ?? DEFAULT_RECENT_HISTORY_COUNT;
  const prompt = selectPromptSections(options.promptBody, intent, characterCount);
  const modelNames =
    options.valueModels.length > 0
      ? options.valueModels.map((model) => model.name).join(', ')
      : 'none';

  const sessionBlock = [
    '[Session]',
    `compatibility weight: ${weight}`,
    `recent history beats: ${recentHistoryCount}`,
    `active value models: ${modelNames}`,
    'The session weight overrides any weight= example in the playbook.',
    'Say "set weight N" (0–100) or "set history N" (0–20). The app applies those before you reply.',
  ].join('\n');

  const passages = options.valueModels
    .map((model) => {
      const body = selectValueModelPassages(model.body, cards);
      if (!body) {
        return '';
      }
      return [`[Value model: ${model.name}]`, body].join('\n');
    })
    .filter(Boolean);

  return [prompt, sessionBlock, ...passages].filter(Boolean).join('\n\n');
}
