import { gemini31FlashTts, GEMINI_31_FLASH_TTS_ID } from './gemini31FlashTts';
import type { TtsModelConfig } from './ttsTypes';

export type { TtsModelConfig, TtsModelCost, TtsModelKind } from './ttsTypes';
export {
  costPerCharacterUsd,
  estimateTtsCostUsd,
  formatTtsCostLabel,
  formatTtsCostUsd,
} from './ttsTypes';
export { gemini31FlashTts, GEMINI_31_FLASH_TTS_ID } from './gemini31FlashTts';
export {
  GEMINI_TTS_VOICES,
  GEMINI_VOICE_BY_GENDER,
  GEMINI_VOICE_OPTIONS_BY_GENDER,
  genderHintForGeminiVoice,
  geminiVoiceOptions,
  geminiVoiceOptionsForGender,
  isGeminiTtsVoiceId,
  pickRandomGeminiVoice,
  type GeminiTtsVoiceId,
  type GeminiVoiceOption,
  type VoiceGenderHint,
} from './geminiVoices';

export const DEFAULT_TTS_MODEL_ID = GEMINI_31_FLASH_TTS_ID;

export const TTS_MODELS: Record<string, TtsModelConfig> = {
  [GEMINI_31_FLASH_TTS_ID]: gemini31FlashTts,
};

export function listTtsModels(): TtsModelConfig[] {
  return Object.values(TTS_MODELS);
}

export function getTtsModel(modelId: string = DEFAULT_TTS_MODEL_ID): TtsModelConfig {
  const model = TTS_MODELS[modelId];
  if (!model) {
    throw new Error(`Unknown TTS model: ${modelId}`);
  }
  return model;
}

export function isKnownTtsModelId(modelId: string): boolean {
  return Object.prototype.hasOwnProperty.call(TTS_MODELS, modelId);
}
