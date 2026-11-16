import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyChatIntent, parseIntentLabel } from './classifyChatIntent';

describe('parseIntentLabel', () => {
  it('reads a bare JSON label', () => {
    expect(parseIntentLabel('{"intent":"date"}')).toBe('date');
  });

  it('reads a label wrapped in extra text', () => {
    expect(parseIntentLabel('Sure.\n{"intent":"edit"}\n')).toBe('edit');
  });

  it('rejects an unknown label', () => {
    expect(parseIntentLabel('{"intent":"party"}')).toBeNull();
  });
});

describe('classifyChatIntent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('uses the model label when the completion is valid JSON', async () => {
    vi.stubEnv('VITE_FAL_KEY', 'test-fal-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"intent":"conversation"}' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    await expect(
      classifyChatIntent({
        userText: 'take them out tonight',
        attachedCharacterCount: 0,
        historyCharacterCount: 0,
      }),
    ).resolves.toBe('conversation');
  });

  it('falls back to keywords when the completion is not a label', async () => {
    vi.stubEnv('VITE_FAL_KEY', 'test-fal-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ choices: [{ message: { content: 'hello' } }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(
      classifyChatIntent({
        userText: 'Send them on a date',
        attachedCharacterCount: 0,
        historyCharacterCount: 0,
      }),
    ).resolves.toBe('date');
  });

  it('falls back to keywords when the request fails', async () => {
    vi.stubEnv('VITE_FAL_KEY', 'test-fal-key');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(
      classifyChatIntent({
        userText: 'Ask Hector how he is',
        attachedCharacterCount: 0,
        historyCharacterCount: 0,
      }),
    ).resolves.toBe('conversation');
  });
});
