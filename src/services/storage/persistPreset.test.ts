import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SYSTEM_PROMPT } from '../../features/chat/constants';
import { inMemoryFileStorage, setFileStorageForTests } from './index';
import {
  deletePreset,
  loadPreset,
  loadPromptsState,
  savePreset,
  setActivePrompt,
} from './persistenceService';

describe('persistPreset', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('seeds default preset on first load', async () => {
    const state = await loadPromptsState();
    expect(state.activeSystemPresetSlug).toBe('default');
    expect(state.activeSystemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
    expect(state.presetCatalog.some((item) => item.id === 'default')).toBe(true);
  });

  it('saves and loads a custom preset', async () => {
    const saved = await savePreset({
      name: 'Date Coach',
      systemPrompt: 'You help plan thoughtful dates.',
    });

    expect(saved.slug).toBe('date-coach');
    const loaded = await loadPreset('date-coach');
    expect(loaded.systemPrompt).toBe('You help plan thoughtful dates.');
  });

  it('sets active preset in config', async () => {
    const saved = await savePreset({
      name: 'Wingman',
      systemPrompt: 'Be playful and supportive.',
    });

    const active = await setActivePrompt(saved.slug);
    expect(active.slug).toBe('wingman');

    const state = await loadPromptsState();
    expect(state.activeSystemPresetSlug).toBe('wingman');
    expect(state.activeSystemPrompt).toBe('Be playful and supportive.');
  });

  it('falls back to default when deleting active preset', async () => {
    const saved = await savePreset({
      name: 'Temp',
      systemPrompt: 'Temporary prompt.',
    });
    await setActivePrompt(saved.slug);

    const next = await deletePreset(saved.slug);
    expect(next.activeSystemPresetSlug).toBe('default');
    expect(next.activeSystemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
  });
});
