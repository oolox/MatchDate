import type { FileStorageService } from './types';
import { LIBRARY_PATH, PROMPTS_PRESET_DIR } from './paths';
import { nowIso } from '../../utils/id';

/**
 * One-shot cleanup: system prompts now live in repo `prompts/*.md`.
 * Deletes OPFS preset JSON under `/masterdater/prompts/session/` and drops
 * `kind: 'prompt'` rows from `library.json`. Chat session files under
 * `prompts/sessions/` are left alone.
 */
export async function migrateLegacyOpfsPrompts(storage: FileStorageService): Promise<void> {
  try {
    const entries = await storage.list(PROMPTS_PRESET_DIR);
    for (const entry of entries) {
      if (entry.kind === 'file') {
        await storage.delete(entry.path);
      }
    }
  } catch (error) {
    console.info('Legacy OPFS prompt preset cleanup skipped', error);
  }

  if (!(await storage.exists(LIBRARY_PATH))) {
    return;
  }

  try {
    const raw = await storage.read(LIBRARY_PATH);
    const parsed = JSON.parse(raw) as { items?: unknown[]; updatedAt?: string };
    if (!Array.isArray(parsed.items)) {
      return;
    }
    const items = parsed.items.filter((item) => {
      if (!item || typeof item !== 'object') {
        return false;
      }
      return (item as { kind?: string }).kind !== 'prompt';
    });
    if (items.length === parsed.items.length) {
      return;
    }
    await storage.write(
      LIBRARY_PATH,
      JSON.stringify({ items, updatedAt: nowIso() }, null, 2),
    );
  } catch (error) {
    console.info('Could not strip prompt rows from library index', error);
  }
}
