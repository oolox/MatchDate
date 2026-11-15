import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BUNDLED_PROMPT_ID,
  getBundledPromptBody,
  listBundledPrompts,
} from './bundledPrompts';
import { DEFAULT_CHAT_MODEL_ID, DEEPSEEK_V4_PRO_ID } from '../../services/fal/models/chat';
import {
  resolveThreadChatModel,
  resolveThreadSystemPrompt,
  systemPromptSelectOptions,
  threadSystemPromptSelectValue,
} from './sessionSystemPrompt';

describe('bundled prompts', () => {
  it('lists every prompts/*.md file and defaults to prompt-masterDater', () => {
    const ids = listBundledPrompts().map((item) => item.id);
    expect(ids).toContain(DEFAULT_BUNDLED_PROMPT_ID);
    expect(ids).toContain('personality-test');
    expect(getBundledPromptBody(null)).toContain('MasterDater');
  });
});

describe('systemPromptSelectOptions', () => {
  it('lists bundled prompt ids', () => {
    const options = systemPromptSelectOptions();
    expect(options.some((item) => item.value === DEFAULT_BUNDLED_PROMPT_ID)).toBe(true);
    expect(options.some((item) => item.value === 'personality-test')).toBe(true);
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

  it('uses the default bundled id when the thread has no slug', () => {
    expect(threadSystemPromptSelectValue(thread)).toBe(DEFAULT_BUNDLED_PROMPT_ID);
  });

  it('maps legacy OPFS default slug onto the bundled default', () => {
    expect(
      threadSystemPromptSelectValue({ ...thread, systemPromptSlug: 'default' }),
    ).toBe(DEFAULT_BUNDLED_PROMPT_ID);
  });

  it('keeps a known bundled slug', () => {
    expect(
      threadSystemPromptSelectValue({ ...thread, systemPromptSlug: 'personality-test' }),
    ).toBe('personality-test');
  });
});

describe('resolveThreadSystemPrompt', () => {
  it('uses the default bundled body when the session has no slug', () => {
    expect(
      resolveThreadSystemPrompt({
        id: 't',
        title: 'n',
        messages: [],
        createdAt: '',
        updatedAt: '',
      }),
    ).toBe(getBundledPromptBody(DEFAULT_BUNDLED_PROMPT_ID));
  });

  it('loads a bundled prompt body by id', () => {
    expect(
      resolveThreadSystemPrompt({
        id: 't',
        title: 'n',
        messages: [],
        createdAt: '',
        updatedAt: '',
        systemPromptSlug: 'personality-test',
      }),
    ).toBe(getBundledPromptBody('personality-test'));
  });

  it('falls back to the default for unknown slugs', () => {
    expect(
      resolveThreadSystemPrompt({
        id: 't',
        title: 'n',
        messages: [],
        createdAt: '',
        updatedAt: '',
        systemPromptSlug: 'missing-preset',
      }),
    ).toBe(getBundledPromptBody(DEFAULT_BUNDLED_PROMPT_ID));
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
