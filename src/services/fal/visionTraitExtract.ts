import {
  CHARACTER_TRAIT_TAGS,
  normalizeCharacterTraitTags,
  type CharacterTraitTag,
} from '../../types/character';
import {
  DEFAULT_VISION_MODEL,
  describeImageBlob,
  type DescribeImageResult,
} from './visionService';

const TAG_LIST = CHARACTER_TRAIT_TAGS.join(', ');

/** System prompt: force JSON trait extraction (no markdown essays). */
export const VISION_TRAIT_SYSTEM_PROMPT = [
  'You extract lasting character-sheet traits visible in a single image.',
  'Respond with JSON only — no markdown fences, no commentary.',
  `Allowed tags only: ${TAG_LIST}.`,
  'Prefer Physical and Style. Use Psychological/Negative only if clearly visible. Avoid Conscience/Unconscience unless unmistakable from the image.',
  'Use canonical lowercase trait names when possible: eye color, hair color, hair style, build, skin tone, age appearance, facial hair, distinctive marks, wardrobe.',
  'Outfit that looks one-off → tags include Style, or omit if not a lasting look.',
  'Do not invent biography, personality, or facts not visible.',
].join(' ');

/** User prompt: schema reminder. */
export const VISION_TRAIT_USER_PROMPT = [
  'Extract traits from this image as JSON with this exact shape:',
  '{"traits":[{"name":"eye color","value":"green","tags":["Physical"],"confidence":0.9}]}',
  'confidence is 0..1. Omit traits you are unsure about (confidence < 0.5).',
  'Return {"traits":[]} if nothing reliable is visible.',
].join(' ');

export interface VisionExtractedTrait {
  name: string;
  value: string;
  tags: CharacterTraitTag[];
  confidence: number;
}

export interface VisionImageTraitExtraction {
  imageId: string;
  rawOutput: string;
  traits: VisionExtractedTrait[];
}

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, value));
}

/** Pull the first JSON object from model text (handles accidental fences). */
export function extractJsonObjectText(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();

  if (candidate.startsWith('{') && candidate.endsWith('}')) {
    return candidate;
  }

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return candidate.slice(start, end + 1);
  }
  return null;
}

export function parseVisionTraitOutput(raw: string): VisionExtractedTrait[] {
  const jsonText = extractJsonObjectText(raw);
  if (!jsonText) {
    throw new Error('Vision output was not valid JSON');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Vision output JSON could not be parsed');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Vision output JSON must be an object');
  }

  const traitsRaw = (parsed as { traits?: unknown }).traits;
  if (!Array.isArray(traitsRaw)) {
    throw new Error('Vision output JSON must include a traits array');
  }

  const traits: VisionExtractedTrait[] = [];
  for (const entry of traitsRaw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const row = entry as Partial<VisionExtractedTrait>;
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    const value = typeof row.value === 'string' ? row.value.trim() : '';
    if (!name || !value) {
      continue;
    }
    const confidence = clampConfidence(row.confidence);
    if (confidence < 0.5) {
      continue;
    }
    traits.push({
      name,
      value,
      tags: normalizeCharacterTraitTags(row.tags),
      confidence,
    });
  }
  return traits;
}

export async function extractTraitsFromImageBlob(
  imageId: string,
  blob: Blob,
  options?: { model?: string; signal?: AbortSignal },
): Promise<VisionImageTraitExtraction> {
  const result: DescribeImageResult = await describeImageBlob(blob, {
    model: options?.model ?? DEFAULT_VISION_MODEL,
    systemPrompt: VISION_TRAIT_SYSTEM_PROMPT,
    prompt: VISION_TRAIT_USER_PROMPT,
    signal: options?.signal,
  });
  const traits = parseVisionTraitOutput(result.output);
  return {
    imageId,
    rawOutput: result.output,
    traits,
  };
}
