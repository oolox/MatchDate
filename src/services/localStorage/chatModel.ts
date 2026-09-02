import {
  DEFAULT_CHAT_MODEL_ID,
  isKnownChatModelId,
  resolveChatModelId,
} from '../fal/models/chat';
import { LOCAL_STORAGE_KEYS } from './keys';

function readRaw(key: string): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // best-effort
  }
}

/** Rehydrate the last selected chat model, or the registry default. */
export function readTxtModel(): string {
  const raw = readRaw(LOCAL_STORAGE_KEYS.txtModel)?.trim();
  if (!raw || !isKnownChatModelId(raw)) {
    return DEFAULT_CHAT_MODEL_ID;
  }
  return resolveChatModelId(raw);
}

/** Persist a chat model id when it is known to the registry. */
export function writeTxtModel(modelId: string): string {
  const next = isKnownChatModelId(modelId)
    ? resolveChatModelId(modelId)
    : DEFAULT_CHAT_MODEL_ID;
  writeRaw(LOCAL_STORAGE_KEYS.txtModel, next);
  return next;
}
