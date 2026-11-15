import { CHAT_MODELS } from '../../services/fal/models/chat';
import type { Thread } from '../../types/chat';
import {
  bundledPromptSelectOptions,
  DEFAULT_BUNDLED_PROMPT_ID,
  getBundledPromptBody,
  normalizeBundledPromptId,
} from './bundledPrompts';

export { DEFAULT_BUNDLED_PROMPT_ID };

export function systemPromptSelectOptions() {
  return bundledPromptSelectOptions();
}

export function threadSystemPromptSelectValue(thread: Thread | undefined): string {
  return normalizeBundledPromptId(thread?.systemPromptSlug);
}

export function resolveThreadSystemPrompt(thread: Thread | undefined): string {
  return getBundledPromptBody(thread?.systemPromptSlug);
}

export function resolveThreadChatModel(
  thread: Thread | undefined,
  fallback: string,
): string {
  const modelId = thread?.modelId?.trim();
  if (modelId && Object.prototype.hasOwnProperty.call(CHAT_MODELS, modelId)) {
    return modelId;
  }
  return fallback;
}
