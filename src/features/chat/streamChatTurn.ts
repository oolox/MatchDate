import { chatService } from '../../services/fal/chatService';
import { DEFAULT_SYSTEM_PROMPT } from './constants';
import type { ChatMessage } from '../../types/chat';
import { formatFailure } from '../../utils/formatFailure';

export interface StreamChatTurnHistoryMessage {
  role: ChatMessage['role'];
  content: string;
}

export async function streamChatTurn(options: {
  systemPrompt: string;
  historyMessages?: StreamChatTurnHistoryMessage[];
  userContent: string;
  model?: string;
  /** When true, ask the model for reasoning tokens before the answer. */
  thinking?: boolean;
  signal: AbortSignal;
  abortRef: { current: AbortController | null };
  controller: AbortController;
  onChunk: (accumulated: string) => void;
  onReasoning?: (accumulated: string) => void;
  onDone: (accumulated: string) => void;
  onError: (error: Error) => void;
  notify: (message: string) => void;
}): Promise<void> {
  const {
    systemPrompt,
    historyMessages = [],
    userContent,
    model,
    thinking,
    signal,
    abortRef,
    controller,
    onChunk,
    onReasoning,
    onDone,
    onError,
    notify,
  } = options;

  const apiMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT },
    ...historyMessages,
    { role: 'user', content: userContent },
  ];

  let accumulated = '';
  let reasoning = '';

  await chatService.streamCompletion({
    messages: apiMessages,
    model,
    thinking,
    signal,
    onChunk: (delta) => {
      accumulated += delta;
      onChunk(accumulated);
    },
    onReasoningChunk: onReasoning
      ? (delta) => {
          reasoning += delta;
          onReasoning(reasoning);
        }
      : undefined,
    onDone: () => {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      onDone(accumulated);
    },
    onError: (error) => {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      notify(formatFailure('send message', undefined, error));
      onError(error);
    },
  });
}
