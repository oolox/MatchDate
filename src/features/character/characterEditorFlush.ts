/**
 * Bridge so chat tool chrome can flush an unsaved character sheet
 * before navigating to another character (CharacterEditor stays mounted via keep-alive).
 */
type FlushFn = () => Promise<boolean>;

let flushFn: FlushFn | null = null;

export function registerCharacterEditorFlush(fn: FlushFn | null): void {
  flushFn = fn;
}

/** Returns true if no save was needed or save succeeded. */
export async function flushCharacterEditorIfNeeded(): Promise<boolean> {
  if (!flushFn) {
    return true;
  }
  return flushFn();
}
