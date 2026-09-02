import { aion20, AION_20_ID } from './aion20';
import { deepseekV4Flash, DEEPSEEK_V4_FLASH_ID } from './deepseekV4Flash';
import { deepseekV4Pro, DEEPSEEK_V4_PRO_ID } from './deepseekV4Pro';
import { llama4Maverick, LLAMA4_MAVERICK_ID } from './llama4Maverick';
import type { ChatModelConfig } from '../chatTypes';

export type { ChatModelConfig, ChatModelCost } from '../chatTypes';
export { aion20, AION_20_ID } from './aion20';
export { deepseekV4Flash, DEEPSEEK_V4_FLASH_ID } from './deepseekV4Flash';
export { deepseekV4Pro, DEEPSEEK_V4_PRO_ID } from './deepseekV4Pro';
export { llama4Maverick, LLAMA4_MAVERICK_ID } from './llama4Maverick';

export const DEFAULT_CHAT_MODEL_ID = DEEPSEEK_V4_FLASH_ID;

export const CHAT_MODELS: Record<string, ChatModelConfig> = {
  [DEEPSEEK_V4_FLASH_ID]: deepseekV4Flash,
  [DEEPSEEK_V4_PRO_ID]: deepseekV4Pro,
  [AION_20_ID]: aion20,
  [LLAMA4_MAVERICK_ID]: llama4Maverick,
};

/** Prefs from the retired Euryale slot map to Aion 2.0. */
const LEGACY_CHAT_MODEL_IDS: Record<string, string> = {
  'sao10k/l31-70b-euryale-v2.2': AION_20_ID,
};

const CHAT_MODEL_TAB_LABEL_LENGTH = 3;

/** Compact 3-letter picker label. */
export function chatModelTabLabel(model: ChatModelConfig): string {
  return (model.shortLabel ?? model.modelName.slice(0, CHAT_MODEL_TAB_LABEL_LENGTH)).toUpperCase();
}

export function listChatModels(): ChatModelConfig[] {
  return Object.values(CHAT_MODELS);
}

/** Resolve current or legacy preference ids to a registry entry. */
export function resolveChatModelId(modelId: string): string {
  return LEGACY_CHAT_MODEL_IDS[modelId] ?? modelId;
}

export function getChatModel(modelId: string = DEFAULT_CHAT_MODEL_ID): ChatModelConfig {
  const resolved = resolveChatModelId(modelId);
  const model = CHAT_MODELS[resolved];
  if (!model) {
    throw new Error(`Unknown chat model: ${modelId}`);
  }
  return model;
}

export function isKnownChatModelId(modelId: string): boolean {
  const resolved = resolveChatModelId(modelId);
  return Object.prototype.hasOwnProperty.call(CHAT_MODELS, resolved);
}
