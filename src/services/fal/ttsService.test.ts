import { afterEach, describe, expect, it, vi } from 'vitest';
import { estimateTtsCostUsd, formatTtsCostLabel, formatTtsCostUsd } from './models/tts';
import { synthesizeSpeech } from './ttsService';

describe('tts cost helpers', () => {
  it('estimates char count × per-character cost', () => {
    const cost = { unit: 'per_1k_chars' as const, usd: 0.05 };
    expect(estimateTtsCostUsd(0, cost)).toBe(0);
    expect(estimateTtsCostUsd(34, cost)).toBeCloseTo(0.0017, 6);
    expect(estimateTtsCostUsd(1000, cost)).toBe(0.05);
    expect(estimateTtsCostUsd(2000, cost)).toBe(0.1);
    expect(formatTtsCostUsd(0.0017)).toBe('$0.0017');
    expect(formatTtsCostLabel(34, cost)).toBe('$0.0017');
    expect(formatTtsCostLabel(1000, cost)).toBe('$0.05');
  });
});

describe('synthesizeSpeech', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts to Gemini fal.run and downloads audio blob', async () => {
    const audioBytes = new Uint8Array([1, 2, 3, 4]);
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('fal.run/fal-ai/gemini-3.1-flash-tts')) {
        expect(init?.method).toBe('POST');
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(body.prompt).toBe('Hello there');
        expect(body.voice).toBe('Puck');
        expect(body.style_instructions).toBe('warm');
        return new Response(
          JSON.stringify({ audio: { url: 'https://example.test/out.mp3' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url === 'https://example.test/out.mp3') {
        return new Response(audioBytes, {
          status: 200,
          headers: { 'Content-Type': 'audio/mpeg' },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('VITE_FAL_KEY', 'test-key');

    const result = await synthesizeSpeech({
      text: 'Hello there',
      voice: { voiceId: 'Puck', styleInstructions: 'warm', temperature: 0.8 },
    });

    expect(result.charCount).toBe(11);
    expect(result.url).toBe('https://example.test/out.mp3');
    expect(result.blob.size).toBe(4);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects empty text', async () => {
    await expect(synthesizeSpeech({ text: '  ' })).rejects.toThrow(/requires text/i);
  });
});
