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

/** Rehydrate the composer reasoning toggle. Unset means off. */
export function readChatReasoning(): boolean {
  return readRaw(LOCAL_STORAGE_KEYS.chatReasoning) === '1';
}

/** Persist whether chat turns request reasoning tokens. */
export function writeChatReasoning(enabled: boolean): boolean {
  writeRaw(LOCAL_STORAGE_KEYS.chatReasoning, enabled ? '1' : '0');
  return enabled;
}
