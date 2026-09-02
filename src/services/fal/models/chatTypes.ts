/**
 * LLM pricing (USD per million tokens) — display estimates via OpenRouter on fal.
 * Confirm live rates on openrouter.ai / fal model pages.
 */
export type ChatModelCost = {
  inputUsdPerMt: number;
  outputUsdPerMt: number;
  cacheReadUsdPerMt?: number;
};

/**
 * LLM chat model registry entry.
 * `id` is the registry / preference key.
 * `modelName` is the OpenRouter slug sent to fal's chat completions API.
 */
export type ChatModelConfig = {
  id: string;
  label: string;
  modelName: string;
  shortLabel?: string;
  /** Best-use specialization shown in Config. */
  description: string;
  /** Optional max context tokens (e.g. Aion 131k). */
  contextLength?: number;
  cost: ChatModelCost;
};
