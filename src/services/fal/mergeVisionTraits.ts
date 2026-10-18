import { normalizeCharacterTraitTags, type CharacterTraitTag } from '../../types/character';
import type { VisionExtractedTrait, VisionImageTraitExtraction } from './visionTraitExtract';

export interface MergedVisionTrait {
  name: string;
  value: string;
  tags: CharacterTraitTag[];
  /** 0..1 average confidence among agreeing observations. */
  confidence: number;
  /** How many images contributed the winning value. */
  support: number;
  /** Total images that mentioned this trait name (any value). */
  mentionedIn: number;
}

export interface MergeVisionTraitsOptions {
  /** Minimum images that must agree on the same value when multiple images exist. Default 2. */
  minAgreement?: number;
  /** Minimum average confidence. Default 0.55. */
  minConfidence?: number;
}

function traitNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function traitValueKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function preferDisplayName(current: string, next: string): string {
  // Prefer the longer / more specific casing from the first observation.
  if (!current) {
    return next;
  }
  if (next.length > current.length) {
    return next;
  }
  return current;
}

/**
 * Deterministic merge of per-image vision traits.
 * - Groups by trait name (case-insensitive).
 * - Picks the value with the most image support; ties → omit (conflict).
 * - With 1 image: keep traits meeting minConfidence.
 * - With 2+ images: require minAgreement images on the winning value.
 */
export function mergeVisionTraits(
  extractions: readonly VisionImageTraitExtraction[],
  options: MergeVisionTraitsOptions = {},
): MergedVisionTrait[] {
  const minAgreement = options.minAgreement ?? 2;
  const minConfidence = options.minConfidence ?? 0.55;
  const imageCount = extractions.length;
  if (imageCount === 0) {
    return [];
  }

  type Obs = {
    imageId: string;
    name: string;
    value: string;
    tags: CharacterTraitTag[];
    confidence: number;
  };

  const byName = new Map<string, Obs[]>();

  for (const extraction of extractions) {
    const seenNames = new Set<string>();
    for (const trait of extraction.traits) {
      const key = traitNameKey(trait.name);
      if (!key || seenNames.has(key)) {
        continue;
      }
      seenNames.add(key);
      const list = byName.get(key) ?? [];
      list.push({
        imageId: extraction.imageId,
        name: trait.name.trim(),
        value: trait.value.trim(),
        tags: trait.tags,
        confidence: trait.confidence,
      });
      byName.set(key, list);
    }
  }

  const merged: MergedVisionTrait[] = [];

  for (const observations of byName.values()) {
    const mentionedIn = observations.length;
    const byValue = new Map<string, Obs[]>();
    for (const obs of observations) {
      const vKey = traitValueKey(obs.value);
      if (!vKey) {
        continue;
      }
      const list = byValue.get(vKey) ?? [];
      list.push(obs);
      byValue.set(vKey, list);
    }

    let best: Obs[] | null = null;
    let bestSupport = 0;
    let tie = false;
    for (const group of byValue.values()) {
      if (group.length > bestSupport) {
        best = group;
        bestSupport = group.length;
        tie = false;
      } else if (group.length === bestSupport && group.length > 0) {
        tie = true;
      }
    }

    if (!best || bestSupport === 0 || tie) {
      continue;
    }

    const requiredSupport = imageCount === 1 ? 1 : Math.min(minAgreement, imageCount);
    if (bestSupport < requiredSupport) {
      continue;
    }

    const avgConfidence =
      best.reduce((sum, obs) => sum + obs.confidence, 0) / best.length;
    if (avgConfidence < minConfidence) {
      continue;
    }

    let displayName = '';
    let displayValue = best[0]!.value;
    const tagSet: CharacterTraitTag[] = [];
    for (const obs of best) {
      displayName = preferDisplayName(displayName, obs.name);
      for (const tag of obs.tags) {
        tagSet.push(tag);
      }
    }

    merged.push({
      name: displayName,
      value: displayValue,
      tags: normalizeCharacterTraitTags(tagSet),
      confidence: avgConfidence,
      support: bestSupport,
      mentionedIn,
    });
  }

  return merged.sort((a, b) => {
    if (b.support !== a.support) {
      return b.support - a.support;
    }
    return b.confidence - a.confidence;
  });
}

/** Format a short line for under-image preview. */
export function formatExtractedTraitsPreview(traits: readonly VisionExtractedTrait[]): string {
  if (traits.length === 0) {
    return 'No traits extracted';
  }
  return traits.map((trait) => `${trait.name}: ${trait.value}`).join('\n');
}
