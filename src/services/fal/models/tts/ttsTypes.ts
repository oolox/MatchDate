/**
 * TTS pricing — display estimates from fal model llms.txt.
 * Gemini: $0.05 / 1K characters.
 */
export type TtsModelKind = 'preset' | 'cloneable';

export type TtsModelCost =
  | { unit: 'per_1k_chars'; usd: number }
  | { unit: 'per_minute'; usd: number };

export interface TtsModelConfig {
  id: string;
  endpoint: string;
  label: string;
  shortLabel: string;
  kind: TtsModelKind;
  cost: TtsModelCost;
  supportsClone: boolean;
  /** Max chars per request (chunk long replies later). */
  promptMax: number;
  description: string;
}

/** USD per single character from a model cost entry. */
export function costPerCharacterUsd(cost: TtsModelCost): number {
  if (cost.unit === 'per_1k_chars') {
    return cost.usd / 1000;
  }
  return 0;
}

/** Live estimate: character count × cost per character. */
export function estimateTtsCostUsd(charCount: number, cost: TtsModelCost): number {
  return Math.max(0, charCount) * costPerCharacterUsd(cost);
}

export function formatTtsCostUsd(usd: number): string {
  if (usd <= 0) {
    return '$0';
  }
  if (usd < 0.01) {
    // Enough digits for short utterances (e.g. $0.0017).
    return `$${usd.toFixed(4).replace(/0+$/, '').replace(/\.$/, '')}`;
  }
  if (usd < 1) {
    return `$${usd.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}`;
  }
  return `$${usd.toFixed(2)}`;
}

/** Live estimate for typed text (e.g. `$0.0017`). */
export function formatTtsCostLabel(charCount: number, cost: TtsModelCost): string {
  return formatTtsCostUsd(estimateTtsCostUsd(charCount, cost));
}
