import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_DESCRIBE_PROMPT,
  DEFAULT_VISION_MODEL,
  FAL_VISION_URL,
  blobToDataUri,
  describeImage,
} from './visionService';

describe('visionService', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FAL_KEY', 'test-fal-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('blobToDataUri encodes a blob', async () => {
    const blob = new Blob(['hello'], { type: 'image/png' });
    const uri = await blobToDataUri(blob);
    expect(uri.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('describeImage posts to OpenRouter Vision and returns output', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          output: 'A person with green eyes.',
          usage: { cost: 0.001, total_tokens: 100 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await describeImage({
      imageUrl: 'data:image/png;base64,abc',
    });

    expect(result.output).toBe('A person with green eyes.');
    expect(result.usage?.cost).toBe(0.001);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(FAL_VISION_URL);
    expect(init?.method).toBe('POST');
    const body = JSON.parse(String(init?.body)) as {
      image_urls: string[];
      prompt: string;
      model: string;
    };
    expect(body.image_urls).toEqual(['data:image/png;base64,abc']);
    expect(body.prompt).toBe(DEFAULT_DESCRIBE_PROMPT);
    expect(body.model).toBe(DEFAULT_VISION_MODEL);
  });

  it('throws when output is empty', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ output: '  ' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      describeImage({ imageUrl: 'https://example.com/a.png' }),
    ).rejects.toThrow(/empty description/i);
  });
});
