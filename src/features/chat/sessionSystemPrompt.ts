import type { DropdownSelectOption } from '../../components/ui/DropdownSelect';
import { CHAT_MODELS } from '../../services/fal/models/chat';
import type { LibraryItemMeta } from '../../services/storage/types';
import { loadPreset } from '../../services/storage/persistenceService';
import type { Thread } from '../../types/chat';

/** Select value for “use the library’s enabled SYS prompt”. */
export const LIBRARY_SYSTEM_PROMPT_VALUE = '';

export function systemPromptSelectOptions(
  catalog: LibraryItemMeta[],
  activeSlug: string | null,
  activeNameFallback = 'System prompt',
): DropdownSelectOption[] {
  const systemItems = catalog.filter((item) => item.kind === 'prompt');
  const activeName =
    systemItems.find((item) => item.id === activeSlug)?.name ?? activeNameFallback;
  return [
    { value: LIBRARY_SYSTEM_PROMPT_VALUE, label: activeName },
    ...systemItems
      .filter((item) => item.id !== activeSlug)
      .map((item) => ({ value: item.id, label: item.name })),
  ];
}

export function threadSystemPromptSelectValue(
  thread: Thread | undefined,
  activeSystemPresetSlug: string | null,
): string {
  const selectedSlug = thread?.systemPromptSlug?.trim() || '';
  if (!selectedSlug || selectedSlug === (activeSystemPresetSlug ?? '')) {
    return LIBRARY_SYSTEM_PROMPT_VALUE;
  }
  return selectedSlug;
}

export async function resolveThreadSystemPrompt(
  thread: Thread | undefined,
  libraryPrompt: string,
): Promise<string> {
  const slug = thread?.systemPromptSlug?.trim();
  if (!slug) {
    return libraryPrompt;
  }
  try {
    const preset = await loadPreset(slug);
    if (preset.type !== 'system') {
      return libraryPrompt;
    }
    return preset.systemPrompt;
  } catch {
    return libraryPrompt;
  }
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
