import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FAL_CHAT_COMPLETIONS_URL, streamCompletion } from './chatService';

function createSseResponse(chunks: Array<string | Record<string, unknown>>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        const delta = typeof chunk === 'string' ? { content: chunk } : chunk;
        const payload = JSON.stringify({ choices: [{ delta }] });
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
    expect(body).not.toHaveProperty('reasoning');
    expect(body).not.toHaveProperty('thinking');
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('requests thinking mode and streams reasoning separately from the answer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createSseResponse([
        { reasoning: 'Weigh ' },
        { reasoning: 'the ask', reasoning_details: [{ text: 'the ask' }] },
        { content: 'Hello' },
      ]),
    );
    vi.stubGlobal('fetch', fetchMock);

    const chunks: string[] = [];
    const reasoning: string[] = [];

    await streamCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
      thinking: true,
      onChunk: (delta) => chunks.push(delta),
      onReasoningChunk: (delta) => reasoning.push(delta),
      onDone: () => undefined,
      onError: () => undefined,
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as {
      reasoning?: { effort?: string };
      thinking?: { type?: string };
    };
    expect(body.reasoning).toEqual({ effort: 'high' });
    expect(body.thinking).toEqual({ type: 'enabled' });
    expect(reasoning.join('')).toBe('Weigh the ask');
    expect(chunks.join('')).toBe('Hello');
  });

  it('reads DeepSeek reasoning_content when OpenRouter reasoning is absent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createSseResponse([{ reasoning_content: 'Step' }])),
    );

    const reasoning: string[] = [];
    await streamCompletion({
      messages: [{ role: 'user', content: 'Hi' }],
      onChunk: () => undefined,
      onReasoningChunk: (delta) => reasoning.push(delta),
      onDone: () => undefined,
      onError: () => undefined,
    });

    expect(reasoning).toEqual(['Step']);
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
