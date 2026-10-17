import type { SavedImageRef } from './savedImage';

export const BASIC_VALUES = [
  'Self-Direction',
  'Stimulation',
  'Hedonism',
  'Achievement',
  'Power',
  'Security',
  'Conformity',
  'Tradition',
  'Benevolence',
  'Universalism',
] as const;

export type BasicValue = (typeof BASIC_VALUES)[number];

export const BASIC_VALUE_DESCRIPTIONS: Record<BasicValue, string> = {
  'Self-Direction': 'Independent thought and action, choosing, creating, and exploring.',
  Stimulation: 'Excitement, novelty, and challenge in life.',
  Hedonism: 'Pleasure and sensuous gratification for oneself.',
  Achievement: 'Personal success through demonstrating competence based on social standards.',
  Power: 'Social status, prestige, and control or dominance over people and resources.',
  Security: 'Safety, harmony, and stability of society, relationships, and the self.',
  Conformity:
    'Restraint of actions and impulses that might upset or harm others and violate social norms.',
  Tradition:
    "Respect, commitment, and acceptance of the customs and ideas traditional to one's culture or religion.",
  Benevolence:
    'Preserving and enhancing the welfare of people with whom one has frequent personal contact.',
  Universalism:
    'Understanding, appreciation, tolerance, and protection for the welfare of all people and nature.',
};

export interface ValueScore {
  name: BasicValue;
  description: string;
  /** 0 (not important) to 100 (extremely important). */
  value: number;
}

export interface CharacterHistoryEntry {
  at: string;
  summary: string;
  /** Session that created this beat (when known). */
  sessionId?: string;
}

/** Allowed trait taxonomy tags (0 or more per trait). */
export const CHARACTER_TRAIT_TAGS = [
  'Physical',
  'Psychological',
  'Conscience',
  'Unconscience',
  'Style',
  'Negative',
] as const;

export type CharacterTraitTag = (typeof CHARACTER_TRAIT_TAGS)[number];

/** Character traits (appearance, psychology, etc.). */
export interface CharacterTrait {
  /** When this trait was defined or last updated (ISO-8601). */
  at: string;
  /** Trait label, e.g. "hair color", "eye color", "weight". */
  name: string;
  /** Trait value, e.g. "dark brown", "blue", "180 lbs". */
  value: string;
  /** Zero or more taxonomy tags. */
  tags: CharacterTraitTag[];
  /** Session that created or last updated this trait (when known). */
  sessionId?: string;
}

export interface Character {
  name: string;
  attributes: ValueScore[];
  history: CharacterHistoryEntry[];
  traits: CharacterTrait[];
  /** Image asset refs (by guid / `SavedImageRef.id`), LuxNova-style. */
  images: SavedImageRef[];
}

export interface CharacterDocument {
  schemaVersion?: number;
  type: 'character';
  id: string;
  name: string;
  attributes: ValueScore[];
  history: CharacterHistoryEntry[];
  traits: CharacterTrait[];
  /** Image asset refs keyed by asset id. */
  images?: SavedImageRef[];
  createdAt: string;
  updatedAt: string;
}

export function createDefaultValueScores(): ValueScore[] {
  return BASIC_VALUES.map((name) => ({
    name,
    description: BASIC_VALUE_DESCRIPTIONS[name],
    value: 0,
  }));
}

export function createDefaultCharacter(name = ''): Character {
  return {
    name,
    attributes: createDefaultValueScores(),
    history: [],
    traits: [],
    images: [],
  };
}

export function isBasicValue(value: unknown): value is BasicValue {
  return typeof value === 'string' && (BASIC_VALUES as readonly string[]).includes(value);
}

export function isCharacterTraitTag(value: unknown): value is CharacterTraitTag {
  return (
    typeof value === 'string' && (CHARACTER_TRAIT_TAGS as readonly string[]).includes(value)
  );
}

/** Dedupe and keep only known trait tags, in canonical order. */
export function normalizeCharacterTraitTags(tags: unknown): CharacterTraitTag[] {
  if (!Array.isArray(tags)) {
    return [];
  }
  const selected = new Set<CharacterTraitTag>();
  for (const tag of tags) {
    if (isCharacterTraitTag(tag)) {
      selected.add(tag);
    }
  }
  return CHARACTER_TRAIT_TAGS.filter((tag) => selected.has(tag));
}

export function isCharacterHistoryEntry(value: unknown): value is CharacterHistoryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as Partial<CharacterHistoryEntry>;
  return (
    typeof entry.at === 'string' &&
    typeof entry.summary === 'string' &&
    (entry.sessionId === undefined || typeof entry.sessionId === 'string')
  );
}

export function isCharacterTrait(value: unknown): value is CharacterTrait {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const trait = value as Partial<CharacterTrait>;
  if (
    typeof trait.at !== 'string' ||
    typeof trait.name !== 'string' ||
    trait.name.trim().length === 0 ||
    typeof trait.value !== 'string' ||
    trait.value.trim().length === 0 ||
    (trait.sessionId !== undefined && typeof trait.sessionId !== 'string')
  ) {
    return false;
  }
  // Missing/undefined tags allowed (legacy docs); invalid non-array tags rejected.
  if (trait.tags !== undefined && !Array.isArray(trait.tags)) {
    return false;
  }
  return true;
}
