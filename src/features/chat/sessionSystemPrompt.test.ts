import { describe, expect, it, vi, beforeEach } from 'vitest';
import { libraryItem } from '../../services/storage/libraryItem';
import { DEFAULT_CHAT_MODEL_ID, DEEPSEEK_V4_PRO_ID } from '../../services/fal/models/chat';
import {
  LIBRARY_SYSTEM_PROMPT_VALUE,
  resolveThreadChatModel,
  resolveThreadSystemPrompt,
  systemPromptSelectOptions,
  threadSystemPromptSelectValue,
} from './sessionSystemPrompt';

const loadPreset = vi.fn();

vi.mock('../../services/storage/persistenceService', () => ({
  loadPreset: (...args: unknown[]) => loadPreset(...args),
}));

describe('systemPromptSelectOptions', () => {
  it('puts the library-enabled SYS first and lists the rest', () => {
    const options = systemPromptSelectOptions(
      [
        libraryItem('prompt', 'default', 'Default'),
        libraryItem('prompt', 'writer', 'Writer'),
        libraryItem('session', 's1', 'Chat'),
      ],
      'default',
    );

    expect(options[0]).toEqual({ value: LIBRARY_SYSTEM_PROMPT_VALUE, label: 'Default' });
    expect(options.map((item) => item.value)).toEqual(['', 'writer']);
  });
});

describe('threadSystemPromptSelectValue', () => {
  const thread = {
    id: 't1',
    title: 'Test',
    messages: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('uses the global default when the thread has no slug', () => {
    expect(threadSystemPromptSelectValue(thread, 'default')).toBe(LIBRARY_SYSTEM_PROMPT_VALUE);
  });

  it('uses the global default when the thread slug matches the active preset', () => {
    expect(
      threadSystemPromptSelectValue({ ...thread, systemPromptSlug: 'default' }, 'default'),
    ).toBe(LIBRARY_SYSTEM_PROMPT_VALUE);
  });

  it('uses the thread slug when it differs from the active preset', () => {
    expect(
      threadSystemPromptSelectValue({ ...thread, systemPromptSlug: 'writer' }, 'default'),
    ).toBe('writer');
  });
});

describe('resolveThreadSystemPrompt', () => {
  beforeEach(() => {
    loadPreset.mockReset();
  });

  it('uses the library prompt when the session has no slug', async () => {
    await expect(
      resolveThreadSystemPrompt(
        { id: 't', title: 'n', messages: [], createdAt: '', updatedAt: '' },
        'Lib',
      ),
    ).resolves.toBe('Lib');
    expect(loadPreset).not.toHaveBeenCalled();
  });

  it('loads the session SYS preset body', async () => {
    loadPreset.mockResolvedValue({
      slug: 'writer',
      type: 'system',
      systemPrompt: 'Be a writer.',
    });

    await expect(
      resolveThreadSystemPrompt(
        {
          id: 't',
          title: 'n',
          messages: [],
          createdAt: '',
          updatedAt: '',
          systemPromptSlug: 'writer',
        },
        'Lib',
      ),
    ).resolves.toBe('Be a writer.');
  });

  it('falls back when the preset is not a system prompt', async () => {
    loadPreset.mockResolvedValue({
      slug: 'neg',
      type: 'negative',
      systemPrompt: 'No negativity.',
    });

    await expect(
      resolveThreadSystemPrompt(
        {
          id: 't',
          title: 'n',
          messages: [],
          createdAt: '',
          updatedAt: '',
          systemPromptSlug: 'neg',
        },
        'Lib',
      ),
    ).resolves.toBe('Lib');
  });
});

describe('resolveThreadChatModel', () => {
  it('uses the thread override when it is a known model id', () => {
    const thread = {
      id: 't1',
      title: 'Test',
      modelId: DEEPSEEK_V4_PRO_ID,
      messages: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(resolveThreadChatModel(thread, DEFAULT_CHAT_MODEL_ID)).toBe(DEEPSEEK_V4_PRO_ID);
  });

  it('falls back when the thread override is missing or unknown', () => {
    expect(resolveThreadChatModel(undefined, DEFAULT_CHAT_MODEL_ID)).toBe(DEFAULT_CHAT_MODEL_ID);
    expect(
      resolveThreadChatModel(
        {
          id: 't1',
          title: 'Test',
          modelId: 'not-a-model',
          messages: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        DEFAULT_CHAT_MODEL_ID,
      ),
    ).toBe(DEFAULT_CHAT_MODEL_ID);
  });
});
