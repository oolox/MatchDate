import { describe, expect, it } from 'vitest';
import {
  AION_20_ID,
  CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  LLAMA4_MAVERICK_ID,
  chatModelTabLabel,
  getChatModel,
  isKnownChatModelId,
  listChatModels,
  resolveChatModelId,
} from './index';

describe('fal chat models registry', () => {
  it('lists four LLM models and resolves the default by id', () => {
    expect(listChatModels().length).toBe(4);
    expect(getChatModel().id).toBe(DEFAULT_CHAT_MODEL_ID);
    expect(getChatModel(DEFAULT_CHAT_MODEL_ID).modelName).toBe(DEFAULT_CHAT_MODEL_ID);
  });

  it('registers the ship set with unique short labels', () => {
    expect(Object.keys(CHAT_MODELS)).toEqual(
      expect.arrayContaining([
        'deepseek/deepseek-v4-flash',
        'deepseek/deepseek-v4-pro',
        AION_20_ID,
        LLAMA4_MAVERICK_ID,
      ]),
    );
    const shortLabels = listChatModels().map((model) => model.shortLabel);
    expect(new Set(shortLabels).size).toBe(shortLabels.length);
    expect(getChatModel(AION_20_ID).modelName).toBe(AION_20_ID);
    expect(getChatModel(AION_20_ID).contextLength).toBe(131072);
    expect(listChatModels().map(chatModelTabLabel)).toEqual(['FLA', 'PRO', 'AIO', 'MAV']);
  });

  it('maps legacy Euryale prefs to Aion 2.0', () => {
    expect(resolveChatModelId('sao10k/l31-70b-euryale-v2.2')).toBe(AION_20_ID);
    expect(isKnownChatModelId('sao10k/l31-70b-euryale-v2.2')).toBe(true);
    expect(getChatModel('sao10k/l31-70b-euryale-v2.2').id).toBe(AION_20_ID);
  });

  it('includes per-Mt cost on every chat model', () => {
    for (const model of listChatModels()) {
      expect(model.cost.inputUsdPerMt).toBeGreaterThan(0);
      expect(model.cost.outputUsdPerMt).toBeGreaterThan(0);
      expect(model.description.length).toBeGreaterThan(0);
    }
  });

  it('throws for unknown chat model ids', () => {
    expect(() => getChatModel('not-a-model')).toThrow(/Unknown chat model/);
  });
});
