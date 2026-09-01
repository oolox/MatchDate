import { loadPreset } from '../../services/storage/persistenceService';
import type { Thread } from '../../types/chat';

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
    return preset.systemPrompt;
  } catch {
    return libraryPrompt;
  }
}
