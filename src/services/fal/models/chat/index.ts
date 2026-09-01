import { deepseekV4Flash, DEEPSEEK_V4_FLASH_ID } from './deepseekV4Flash';
import type { ChatModelConfig } from '../chatTypes';

export type { ChatModelConfig } from '../chatTypes';
export { deepseekV4Flash, DEEPSEEK_V4_FLASH_ID } from './deepseekV4Flash';

export const DEFAULT_CHAT_MODEL_ID = DEEPSEEK_V4_FLASH_ID;

export const CHAT_MODELS: Record<string, ChatModelConfig> = {
  [DEEPSEEK_V4_FLASH_ID]: deepseekV4Flash,
};

export function getChatModel(modelId: string = DEFAULT_CHAT_MODEL_ID): ChatModelConfig {
  const model = CHAT_MODELS[modelId];
  if (!model) {
    throw new Error(`Unknown chat model: ${modelId}`);
  }
  return model;
}
