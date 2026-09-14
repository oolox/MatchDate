import type { CharacterToolMessage } from '../../features/chat/attach/jsonAttach';
import { CHARACTER_TOOL } from '../../features/chat/attach/jsonAttach';
import {
  processCharacterTool,
  type ProcessCharacterToolResult,
} from './processCharacterTool';

export type ProcessToolsResult = {
  results: ProcessCharacterToolResult[];
  applied: number;
  failed: number;
};

/**
 * Process tool envelopes in order. Currently routes `character` tools to
 * {@link processCharacterTool} (update → merge history into library character).
 */
export async function processTools(
  messages: CharacterToolMessage[],
): Promise<ProcessToolsResult> {
  const results: ProcessCharacterToolResult[] = [];

  for (const message of messages) {
    if (message.tool === CHARACTER_TOOL) {
      results.push(await processCharacterTool(message));
      continue;
    }
    results.push({
      ok: false,
      tool: CHARACTER_TOOL,
      action: undefined,
      reason: 'unsupported_action',
      message: `Unsupported tool: ${String((message as { tool?: unknown }).tool)}`,
    });
  }

  return {
    results,
    applied: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  };
}
