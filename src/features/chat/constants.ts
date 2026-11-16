import { getDefaultBundledPrompt } from './bundledPrompts';

export const DEFAULT_THREAD_ID = 'default-thread';

/** Default chat system prompt — body of `prompts/prompt-masterDater.md`. */
export const DEFAULT_SYSTEM_PROMPT = getDefaultBundledPrompt().body;

/** Date compatibility strictness when a session has not set one. */
export const DEFAULT_COMPATIBILITY_WEIGHT = 50;

/** History beats copied onto a character card when a session has not set a count. */
export const DEFAULT_RECENT_HISTORY_COUNT = 3;
