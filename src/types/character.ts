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
  source?: string;
}

/** Physical / appearance traits (hair color, eye color, weight, etc.). */
export interface CharacterTrait {
  /** When this trait was defined or last updated (ISO-8601). */
  at: string;
  /** Trait label, e.g. "hair color", "eye color", "weight". */
  name: string;
  /** Trait value, e.g. "dark brown", "blue", "180 lbs". */
  value: string;
}

export interface Character {
  name: string;
  attributes: ValueScore[];
  history: CharacterHistoryEntry[];
  traits: CharacterTrait[];
}

export interface CharacterDocument {
  schemaVersion?: number;
  type: 'character';
  id: string;
  name: string;
  attributes: ValueScore[];
  history: CharacterHistoryEntry[];
  traits: CharacterTrait[];
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
  };
}

export function isBasicValue(value: unknown): value is BasicValue {
  return typeof value === 'string' && (BASIC_VALUES as readonly string[]).includes(value);
}

export function isCharacterHistoryEntry(value: unknown): value is CharacterHistoryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as Partial<CharacterHistoryEntry>;
  return (
    typeof entry.at === 'string' &&
    typeof entry.summary === 'string' &&
    (entry.source === undefined || typeof entry.source === 'string')
  );
}

export function isCharacterTrait(value: unknown): value is CharacterTrait {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const trait = value as Partial<CharacterTrait>;
  return (
    typeof trait.at === 'string' &&
    typeof trait.name === 'string' &&
    trait.name.trim().length > 0 &&
    typeof trait.value === 'string' &&
    trait.value.trim().length > 0
  );
}
