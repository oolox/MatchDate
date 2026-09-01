import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FAL_CHAT_COMPLETIONS_URL, streamCompletion } from './chatService';

function createSseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const text of chunks) {
        const payload = JSON.stringify({ choices: [{ delta: { content: text } }] });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('fal chatService', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FAL_KEY', 'test-fal-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('streams content from the fal OpenRouter SSE response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createSseResponse(['Hello', ' world']));
    vi.stubGlobal('fetch', fetchMock);

    const chunks: string[] = [];
    const onDone = vi.fn();
    const onError = vi.fn();

    await streamCompletion({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hi' },
      ],
      onChunk: (delta) => chunks.push(delta),
      onDone,
      onError,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(FAL_CHAT_COMPLETIONS_URL);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Key test-fal-key');
    const body = JSON.parse(init.body as string) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.model).toBe('deepseek/deepseek-v4-flash');
    expect(body.messages[0]).toEqual({
      role: 'system',
      content: 'You are a helpful assistant.',
    });
    expect(chunks.join('')).toBe('Hello world');
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onDone when aborted with partial text', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const onDone = vi.fn();
    const onError = vi.fn();

    const promise = streamCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
      onChunk: () => undefined,
      onDone,
      onError,
      signal: controller.signal,
    });

    controller.abort();
    await promise;

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
});
