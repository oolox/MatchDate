import { getDefaultBundledPrompt } from './bundledPrompts';

export const DEFAULT_THREAD_ID = 'default-thread';

/** Default chat system prompt — body of `prompts/prompt-masterDater.md`. */
export const DEFAULT_SYSTEM_PROMPT = getDefaultBundledPrompt().body;
