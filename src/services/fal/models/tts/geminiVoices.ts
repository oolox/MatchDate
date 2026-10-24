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

export function geminiVoiceOptions(): Array<{ value: GeminiTtsVoiceId; label: string }> {
  return GEMINI_TTS_VOICES.map((voice) => ({
    value: voice,
    label: voice,
  }));
}
