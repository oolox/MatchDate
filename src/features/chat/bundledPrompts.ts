import type { DropdownSelectOption } from '../../components/ui/DropdownSelect';

export interface BundledPrompt {
  /** Basename without `.md` (e.g. `prompt-masterDater`). */
  id: string;
  fileName: string;
  label: string;
  body: string;
}

/** Default system prompt for new / unpicked sessions. */
export const DEFAULT_BUNDLED_PROMPT_ID = 'prompt-masterDater';

const promptModules = import.meta.glob('../../../prompts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function idFromModulePath(modulePath: string): string {
  const fileName = modulePath.split('/').pop() ?? modulePath;
  return fileName.replace(/\.md$/i, '');
}

function buildCatalog(): BundledPrompt[] {
  const items: BundledPrompt[] = [];
  for (const [modulePath, body] of Object.entries(promptModules)) {
    const id = idFromModulePath(modulePath);
    if (!id || typeof body !== 'string') {
      continue;
    }
    items.push({
      id,
      fileName: `${id}.md`,
      label: id,
      body,
    });
  }
  return items.sort((a, b) => a.label.localeCompare(b.label));
}

const catalog = buildCatalog();
const byId = new Map(catalog.map((item) => [item.id, item]));

/** Legacy OPFS preset slug → bundled prompt id. */
const LEGACY_PROMPT_SLUG_MAP: Record<string, string> = {
  default: DEFAULT_BUNDLED_PROMPT_ID,
  'prompt-matchDate': DEFAULT_BUNDLED_PROMPT_ID,
  'prompt-matchdate': DEFAULT_BUNDLED_PROMPT_ID,
};

export function listBundledPrompts(): BundledPrompt[] {
  return catalog;
}

export function getBundledPrompt(id: string | null | undefined): BundledPrompt | null {
  const normalized = normalizeBundledPromptId(id);
  return byId.get(normalized) ?? null;
}

export function getBundledPromptBody(id: string | null | undefined): string {
  return getBundledPrompt(id)?.body ?? getDefaultBundledPrompt().body;
}

export function getDefaultBundledPrompt(): BundledPrompt {
  const fallback = byId.get(DEFAULT_BUNDLED_PROMPT_ID);
  if (fallback) {
    return fallback;
  }
  if (catalog[0]) {
    return catalog[0];
  }
  throw new Error('No bundled prompts found under prompts/*.md');
}

/** Map empty / legacy OPFS slugs onto a bundled prompt id. */
export function normalizeBundledPromptId(id: string | null | undefined): string {
  const trimmed = id?.trim() ?? '';
  if (!trimmed) {
    return DEFAULT_BUNDLED_PROMPT_ID;
  }
  const mapped = LEGACY_PROMPT_SLUG_MAP[trimmed] ?? LEGACY_PROMPT_SLUG_MAP[trimmed.toLowerCase()];
  if (mapped) {
    return mapped;
  }
  if (byId.has(trimmed)) {
    return trimmed;
  }
  return DEFAULT_BUNDLED_PROMPT_ID;
}

export function bundledPromptSelectOptions(): DropdownSelectOption[] {
  return listBundledPrompts().map((item) => ({
    value: item.id,
    label: item.label,
  }));
}
