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

export interface Character {
  name: string;
  attributes: ValueScore[];
}

export interface CharacterDocument {
  schemaVersion?: number;
  type: 'character';
  id: string;
  name: string;
  attributes: ValueScore[];
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
  };
}

export function isBasicValue(value: unknown): value is BasicValue {
  return typeof value === 'string' && (BASIC_VALUES as readonly string[]).includes(value);
}
