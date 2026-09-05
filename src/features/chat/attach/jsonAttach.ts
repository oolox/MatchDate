import type { Character } from '../../../types/character';

export const CHARACTER_ATTACH_TOOL = 'MatchDate';

export interface CharacterAttachPayload extends Character {
  type: 'character';
  tool: typeof CHARACTER_ATTACH_TOOL;
  guid: string;
}

export function buildCharacterAttachPayload(
  character: Character,
  guid: string,
): CharacterAttachPayload {
  return {
    ...character,
    type: 'character',
    tool: CHARACTER_ATTACH_TOOL,
    guid,
  };
}

/** Fence a character attachment as ```json for the LLM payload. */
export function wrapAttachedCharacter(character: Character, guid: string): string {
  const payload = buildCharacterAttachPayload(character, guid);
  return `\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
}
