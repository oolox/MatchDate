import type { ChatModelConfig } from '../chatTypes';

/** OpenRouter / fal model id (also preference id). */
export const AION_20_ID = 'aion-labs/aion-2.0';

/**
 * Aion-2.0 — immersive roleplay and storytelling (DeepSeek V3.2 variant).
 * @see https://openrouter.ai/aion-labs/aion-2.0
 */
export const aion20: ChatModelConfig = {
  id: AION_20_ID,
  label: 'Aion 2.0',
  modelName: AION_20_ID,
  shortLabel: 'aio',
  description: 'Immersive roleplay, storytelling, and creative writing',
  contextLength: 131072,
  cost: {
    inputUsdPerMt: 0.8,
    outputUsdPerMt: 1.6,
  },
};
