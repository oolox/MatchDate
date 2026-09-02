import type { ChatModelConfig } from '../chatTypes';

export const DEEPSEEK_V4_PRO_ID = 'deepseek/deepseek-v4-pro';

/** Hard reasoning; OpenRouter slug matches registry id. */
export const deepseekV4Pro: ChatModelConfig = {
  id: DEEPSEEK_V4_PRO_ID,
  label: 'DeepSeek V4 Pro',
  modelName: DEEPSEEK_V4_PRO_ID,
  shortLabel: 'pro',
  description: 'Hard reasoning, planning, and careful analysis',
  cost: {
    inputUsdPerMt: 0.66,
    outputUsdPerMt: 1.98,
    cacheReadUsdPerMt: 0.022,
  },
};
