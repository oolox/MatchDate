import type { ChatModelConfig } from '../chatTypes';

export const DEEPSEEK_V4_FLASH_ID = 'deepseek/deepseek-v4-flash';

/** Everyday default; OpenRouter slug matches registry id. */
export const deepseekV4Flash: ChatModelConfig = {
  id: DEEPSEEK_V4_FLASH_ID,
  label: 'DeepSeek V4 Flash',
  modelName: DEEPSEEK_V4_FLASH_ID,
  shortLabel: 'fla',
  description: 'Everyday chat and long-context work',
  cost: {
    inputUsdPerMt: 0.07,
    outputUsdPerMt: 0.17,
    cacheReadUsdPerMt: 0.017,
  },
};
