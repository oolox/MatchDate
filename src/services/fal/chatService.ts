import type { ChatMessage } from '../../types/chat';
import { DEFAULT_CHAT_MODEL_ID, getChatModel } from './models/chat';
import { falFetch } from './falClient';

/** fal OpenRouter OpenAI-compatible chat completions (SSE). */
export const FAL_CHAT_COMPLETIONS_URL =
  'https://fal.run/openrouter/router/openai/v1/chat/completions';

export interface StreamCompletionOptions {
  messages: ChatMessage[];
  onChunk: (contentDelta: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
  model?: string;
  thinking?: boolean;
}

export const DEFAULT_MODEL = DEFAULT_CHAT_MODEL_ID;

interface ChatCompletionChunk {
  choices?: Array<{
    delta?: { content?: string };
    finish_reason?: string | null;
  }>;
}

async function consumeSseStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (contentDelta: string) => void,
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
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            onChunk(content);
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
      body.reasoning_effort = 'high';
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

    await consumeSseStream(response.body, onChunk, signal);
    onDone();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      onDone();
      return;
    }
    onError(error instanceof Error ? error : new Error('Stream failed'));
  }
}

export const chatService = {
  streamCompletion,
  DEFAULT_MODEL,
};
