import type { Character } from '../../../types/character';

export const CHARACTER_TOOL = 'character' as const;

export type CharacterToolOrigin = 'user' | 'agent';
export type CharacterToolAction = 'write' | 'update' | 'create' | 'read';

/** Fenced JSON tool envelope for character attach / agent updates (see docs/MD-tools.md). */
export interface CharacterToolMessage {
  tool: typeof CHARACTER_TOOL;
  origin: CharacterToolOrigin;
  action: CharacterToolAction;
  id?: string;
  data?: unknown;
}

export function buildCharacterWriteTool(
  character: Character,
  id: string,
): CharacterToolMessage {
  return {
    tool: CHARACTER_TOOL,
    origin: 'user',
    action: 'write',
    id,
    data: {
      name: character.name,
      attributes: character.attributes,
      history: character.history ?? [],
    },
  };
}

/** Fence a character attachment as a user write tool for the LLM payload. */
export function wrapAttachedCharacter(character: Character, guid: string): string {
  const payload = buildCharacterWriteTool(character, guid);
  return `\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
}
