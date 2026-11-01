import type { CharacterToolMessage } from '../../features/chat/attach/jsonAttach';
import { CHARACTER_TOOL } from '../../features/chat/attach/jsonAttach';
import {
  processCharacterTool,
  type ProcessCharacterToolOptions,
  type ProcessCharacterToolResult,
} from './processCharacterTool';

export type ProcessToolsResult = {
  results: ProcessCharacterToolResult[];
  applied: number;
  failed: number;
};

/**
 * Process tool envelopes in order. Routes `character` tools to
 * {@link processCharacterTool} (update / create → library).
 *
 * Display-only tools such as `quote` must not be passed here — parse with
 * {@link parseCharacterToolMessages} (or filter `tool === "character"`) first.
 * See docs/MD-quotes.md.
 */
export async function processTools(
  messages: CharacterToolMessage[],
  options?: ProcessCharacterToolOptions,
): Promise<ProcessToolsResult> {
  const results: ProcessCharacterToolResult[] = [];

  for (const message of messages) {
    if (message.tool === CHARACTER_TOOL) {
      results.push(await processCharacterTool(message, options));
      continue;
    }
    // Non-character envelopes should never reach this loop; ignore if they do.
    continue;
  }

  return {
    results,
    applied: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  };
}
