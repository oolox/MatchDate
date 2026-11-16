import { completeText } from '../../../services/fal/chatService';
import { detectChatIntent, type ChatIntent } from './assembleChatContext';

const CHAT_INTENTS: readonly ChatIntent[] = ['date', 'conversation', 'edit', 'question'];

const CLASSIFIER_SYSTEM = `You label one MasterDater chat turn.
Reply with JSON only, no markdown:
{"intent":"date"|"conversation"|"edit"|"question"}

date: the user wants characters on a date or a shared romantic outing.
conversation: the user is speaking with a character, or asking a character something, including a follow-up in a thread that already has characters.
edit: the user wants a trait, appearance, or value score changed.
question: anything else.

Use only the user text and the character counts. Do not write a story or emit tools.`;

export function parseIntentLabel(raw: string): ChatIntent | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }
  try {
    const parsed = JSON.parse(match[0]) as { intent?: unknown };
    if (
      typeof parsed.intent === 'string' &&
      CHAT_INTENTS.includes(parsed.intent as ChatIntent)
    ) {
      return parsed.intent as ChatIntent;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Ask the chat model for one intent label.
 * Keyword matching is used when the call fails, is aborted only by rethrow, or the label is unusable.
 */
export async function classifyChatIntent(options: {
  userText: string;
  attachedCharacterCount: number;
  historyCharacterCount: number;
  model?: string;
  signal?: AbortSignal;
}): Promise<ChatIntent> {
  const characterCount = Math.max(
    options.attachedCharacterCount,
    options.historyCharacterCount,
  );
  const fallback = detectChatIntent(options.userText, characterCount);
  try {
    const raw = await completeText({
      model: options.model,
      signal: options.signal,
      thinking: false,
      messages: [
        { role: 'system', content: CLASSIFIER_SYSTEM },
        {
          role: 'user',
          content: [
            `attached characters this turn: ${options.attachedCharacterCount}`,
            `characters already in the thread: ${options.historyCharacterCount}`,
            `user text: ${options.userText}`,
          ].join('\n'),
        },
      ],
    });
    return parseIntentLabel(raw) ?? fallback;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    console.info('Intent classifier failed; using keyword intent', { error });
    return fallback;
  }
}
