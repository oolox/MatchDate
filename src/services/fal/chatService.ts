import type { ChatMessage } from '../../types/chat';
import { DEFAULT_CHAT_MODEL_ID, getChatModel } from './models/chat';
import { falFetch } from './falClient';

/** fal OpenRouter OpenAI-compatible chat completions (SSE). */
export const FAL_CHAT_COMPLETIONS_URL =
  'https://fal.run/openrouter/router/openai/v1/chat/completions';

export interface StreamCompletionOptions {
  messages: ChatMessage[];
  onChunk: (contentDelta: string) => void;
  /** OpenRouter reasoning deltas (`delta.reasoning`). Not part of the answer. */
  onReasoningChunk?: (reasoningDelta: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
  model?: string;
  thinking?: boolean;
}

export const DEFAULT_MODEL = DEFAULT_CHAT_MODEL_ID;

interface ReasoningDetail {
  text?: string;
}

interface ChatCompletionDelta {
  content?: string | null;
  reasoning?: string | null;
  reasoning_content?: string | null;
  reasoning_details?: ReasoningDetail[] | null;
}

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: ChatCompletionDelta;
    finish_reason?: string | null;
  }>;
}

/** Prefer OpenRouter `reasoning`, then DeepSeek `reasoning_content`. Details duplicate `reasoning`. */
export function reasoningTextFromDelta(delta: ChatCompletionDelta | undefined): string {
  if (!delta) {
    return '';
  }
  if (typeof delta.reasoning === 'string' && delta.reasoning.length > 0) {
    return delta.reasoning;
  }
  if (typeof delta.reasoning_content === 'string' && delta.reasoning_content.length > 0) {
    return delta.reasoning_content;
  }
  if (!Array.isArray(delta.reasoning_details)) {
    return '';
  }
  let text = '';
  for (const detail of delta.reasoning_details) {
    if (typeof detail?.text === 'string') {
      text += detail.text;
    }
  }
  return text;
}

async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (contentDelta: string) => void,
  onReasoningChunk: ((reasoningDelta: string) => void) | undefined,
  signal?: AbortSignal,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) {
          continue;
        }

        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(payload) as ChatCompletionChunk;
          const delta = parsed.choices?.[0]?.delta;
          const content = delta?.content;
          if (content) {
            onChunk(content);
          }
          const reasoning = reasoningTextFromDelta(delta);
          if (reasoning) {
            onReasoningChunk?.(reasoning);
          }
        } catch (error) {
          console.info('Skipped malformed fal SSE chunk', { payload, error });
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function streamCompletion({
  messages,
  onChunk,
  onDone,
  onError,
  signal,
  model = DEFAULT_MODEL,
  thinking,
  onReasoningChunk,
}: StreamCompletionOptions): Promise<void> {
  try {
    const chatModel = getChatModel(model);
    const body: Record<string, unknown> = {
      model: chatModel.modelName,
      messages,
      stream: true,
      response_format: { type: 'text' },
    };
    if (thinking === true) {
      body.reasoning = { effort: 'high' };
      body.thinking = { type: 'enabled' };
    } else if (thinking === false) {
      body.thinking = { type: 'disabled' };
    }

    const response = await falFetch(FAL_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      body: JSON.stringify(body),
      signal,
    });

    if (!response.body) {
      throw new Error('fal API returned an empty response body');
    }

    await consumeSseStream(response.body, onChunk, onReasoningChunk, signal);
    onDone();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      onDone();
      return;
    }
    onError(error instanceof Error ? error : new Error('Stream failed'));
  }
}

/** One non-streaming completion. Used by the intent classifier, not the writer. */
export async function completeText(options: {
  messages: ChatMessage[];
  model?: string;
  signal?: AbortSignal;
  thinking?: boolean;
}): Promise<string> {
  const chatModel = getChatModel(options.model ?? DEFAULT_MODEL);
  const body: Record<string, unknown> = {
    model: chatModel.modelName,
    messages: options.messages,
    stream: false,
    response_format: { type: 'text' },
  };
  if (options.thinking === false) {
    body.thinking = { type: 'disabled' };
  }

  const response = await falFetch(FAL_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    body: JSON.stringify(body),
    signal: options.signal,
  });
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('fal API returned an empty completion');
  }
  return content;
}

export const chatService = {
  streamCompletion,
  completeText,
  DEFAULT_MODEL,
};
