/** Gemini 3.1 Flash TTS voice presets (fal VoiceEnum). */
export const GEMINI_TTS_VOICES = [
  'Achernar',
  'Achird',
  'Algenib',
  'Algieba',
  'Alnilam',
  'Aoede',
  'Autonoe',
  'Callirrhoe',
  'Charon',
  'Despina',
  'Enceladus',
  'Erinome',
  'Fenrir',
  'Gacrux',
  'Iapetus',
  'Kore',
  'Laomedeia',
  'Leda',
  'Orus',
  'Pulcherrima',
  'Puck',
  'Rasalgethi',
  'Sadachbia',
  'Sadaltager',
  'Schedar',
  'Sulafat',
  'Umbriel',
  'Vindemiatrix',
  'Zephyr',
  'Zubenelgenubi',
] as const;

export type GeminiTtsVoiceId = (typeof GEMINI_TTS_VOICES)[number];

export type VoiceGenderHint = 'male' | 'female' | 'neutral';

/** Gender → recommended Gemini preset for the VOICE designer. */
export const GEMINI_VOICE_BY_GENDER: Record<VoiceGenderHint, GeminiTtsVoiceId> = {
  male: 'Puck',
  female: 'Kore',
  neutral: 'Charon',
};

const MALE_VOICES = new Set<string>([
  'Puck',
  'Charon',
  'Fenrir',
  'Orus',
  'Enceladus',
  'Iapetus',
  'Umbriel',
  'Algenib',
  'Algieba',
  'Alnilam',
  'Schedar',
  'Achird',
]);

const FEMALE_VOICES = new Set<string>([
  'Kore',
  'Zephyr',
  'Aoede',
  'Leda',
  'Autonoe',
  'Callirrhoe',
  'Despina',
  'Erinome',
  'Gacrux',
  'Laomedeia',
  'Pulcherrima',
  'Sulafat',
  'Vindemiatrix',
  'Achernar',
]);

export function isGeminiTtsVoiceId(value: string): value is GeminiTtsVoiceId {
  return (GEMINI_TTS_VOICES as readonly string[]).includes(value);
}

export function genderHintForGeminiVoice(voiceId: string): VoiceGenderHint {
  if (MALE_VOICES.has(voiceId)) {
    return 'male';
  }
  if (FEMALE_VOICES.has(voiceId)) {
    return 'female';
  }
  return 'neutral';
}

export type GeminiVoiceOption = { value: GeminiTtsVoiceId; label: string };

function toVoiceOptions(voices: readonly GeminiTtsVoiceId[]): GeminiVoiceOption[] {
  return voices.map((voice) => ({
    value: voice,
    label: voice,
  }));
}

/** Built once at module load — voice lists rarely change. */
const GEMINI_VOICE_OPTIONS_ALL = toVoiceOptions(GEMINI_TTS_VOICES);
const GEMINI_VOICE_OPTIONS_MALE = toVoiceOptions(
  GEMINI_TTS_VOICES.filter((voice) => MALE_VOICES.has(voice)),
);
const GEMINI_VOICE_OPTIONS_FEMALE = toVoiceOptions(
  GEMINI_TTS_VOICES.filter((voice) => FEMALE_VOICES.has(voice)),
);

/**
 * Dropdown options by gender hint.
 * `neutral` (binary) = full catalog; male/female = filtered lists.
 */
export const GEMINI_VOICE_OPTIONS_BY_GENDER: Record<VoiceGenderHint, readonly GeminiVoiceOption[]> =
  {
    male: GEMINI_VOICE_OPTIONS_MALE,
    female: GEMINI_VOICE_OPTIONS_FEMALE,
    neutral: GEMINI_VOICE_OPTIONS_ALL,
  };

/** Full catalog (same as gender `neutral`). */
export function geminiVoiceOptions(): GeminiVoiceOption[] {
  return [...GEMINI_VOICE_OPTIONS_ALL];
}

/** Options for the voice selector UI, filtered by gender toggle. */
export function geminiVoiceOptionsForGender(gender: VoiceGenderHint): readonly GeminiVoiceOption[] {
  return GEMINI_VOICE_OPTIONS_BY_GENDER[gender];
}

/** Uniform random preset from the Gemini VoiceEnum list. */
export function pickRandomGeminiVoice(): GeminiTtsVoiceId {
  const index = Math.floor(Math.random() * GEMINI_TTS_VOICES.length);
  return GEMINI_TTS_VOICES[index] ?? 'Kore';
}
