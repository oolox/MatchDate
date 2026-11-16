export interface NamedCharacterRef {
  id: string;
  name: string;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function firstToken(value: string): string {
  return normalize(value).split(/\s+/)[0] ?? '';
}

/**
 * Resolve a quote `speakerName` to a library character id.
 * Exact name wins. A unique first-name match is used when the model only says "Peyton".
 * Two characters sharing that first name return null.
 */
export function matchCharacterIdByName(
  speakerName: string,
  characters: ReadonlyArray<NamedCharacterRef>,
): string | null {
  const wanted = normalize(speakerName);
  if (!wanted) {
    return null;
  }

  const exact = characters.find((character) => normalize(character.name) === wanted);
  if (exact) {
    return exact.id;
  }

  const wantedFirst = firstToken(wanted);
  const byFirst = characters.filter((character) => firstToken(character.name) === wantedFirst);
  if (byFirst.length === 1) {
    return byFirst[0].id;
  }
  return null;
}
