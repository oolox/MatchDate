import type { TtsModelConfig } from './ttsTypes';

export const GEMINI_31_FLASH_TTS_ID = 'gemini/3.1-flash-tts';

/** Controllable preset TTS — style_instructions + 30 voices. */
export const gemini31FlashTts: TtsModelConfig = {
  id: GEMINI_31_FLASH_TTS_ID,
  endpoint: 'fal-ai/gemini-3.1-flash-tts',
  label: 'Gemini 3.1 Flash TTS',
  shortLabel: 'Gem',
  kind: 'preset',
  cost: { unit: 'per_1k_chars', usd: 0.05 },
  supportsClone: false,
  promptMax: 8000,
  description: 'Natural-language style, accent, and tone; 30 presets.',
};
