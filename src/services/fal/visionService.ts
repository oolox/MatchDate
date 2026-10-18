import { falFetch } from './falClient';

/** fal OpenRouter vision endpoint (image caption / VQA). */
export const FAL_VISION_URL = 'https://fal.run/openrouter/router/vision';

/** Default OpenRouter vision model (cost-aware, widely available). */
export const DEFAULT_VISION_MODEL = 'openai/gpt-4o-mini';

export const DEFAULT_DESCRIBE_PROMPT =
  'Describe this image in clear detail. Cover subject, appearance, clothing, setting, mood, and any notable details useful for a character sheet.';

export interface DescribeImageOptions {
  /** Public URL or data URI (`data:image/...;base64,...`). */
  imageUrl: string;
  prompt?: string;
  model?: string;
  systemPrompt?: string;
  signal?: AbortSignal;
}

export interface DescribeImageResult {
  output: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
}

interface VisionApiResponse {
  output?: unknown;
  usage?: DescribeImageResult['usage'];
}

export async function blobToDataUri(blob: Blob): Promise<string> {
  if (typeof FileReader === 'undefined') {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const mime = blob.type || 'application/octet-stream';
    return `data:${mime};base64,${btoa(binary)}`;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result.startsWith('data:')) {
        reject(new Error('Failed to encode image as data URI'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read image'));
    };
    reader.readAsDataURL(blob);
  });
}

/** Describe one image via fal OpenRouter Vision. */
export async function describeImage(options: DescribeImageOptions): Promise<DescribeImageResult> {
  const imageUrl = options.imageUrl.trim();
  if (!imageUrl) {
    throw new Error('describeImage requires imageUrl');
  }

  const body = {
    image_urls: [imageUrl],
    prompt: (options.prompt ?? DEFAULT_DESCRIBE_PROMPT).trim() || DEFAULT_DESCRIBE_PROMPT,
    model: (options.model ?? DEFAULT_VISION_MODEL).trim() || DEFAULT_VISION_MODEL,
    ...(options.systemPrompt?.trim()
      ? { system_prompt: options.systemPrompt.trim() }
      : {}),
  };

  const response = await falFetch(FAL_VISION_URL, {
    method: 'POST',
    body: JSON.stringify(body),
    signal: options.signal,
  });

  const data = (await response.json()) as VisionApiResponse;
  const output = typeof data.output === 'string' ? data.output.trim() : '';
  if (!output) {
    throw new Error('Vision API returned an empty description');
  }

  return {
    output,
    ...(data.usage ? { usage: data.usage } : {}),
  };
}

/** Load a blob, encode as data URI, and describe it. */
export async function describeImageBlob(
  blob: Blob,
  options: Omit<DescribeImageOptions, 'imageUrl'> = {},
): Promise<DescribeImageResult> {
  const imageUrl = await blobToDataUri(blob);
  return describeImage({ ...options, imageUrl });
}
