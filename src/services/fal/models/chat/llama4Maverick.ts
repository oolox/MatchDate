import type { ChatModelConfig } from '../chatTypes';

export const LLAMA4_MAVERICK_ID = 'meta-llama/llama-4-maverick';

export const llama4Maverick: ChatModelConfig = {
  id: LLAMA4_MAVERICK_ID,
  label: 'Llama 4 Maverick',
  modelName: LLAMA4_MAVERICK_ID,
  shortLabel: 'mav',
  description: 'General chat and multimodal-capable Llama 4',
  cost: {
    inputUsdPerMt: 0.22,
    outputUsdPerMt: 0.88,
  },
};
