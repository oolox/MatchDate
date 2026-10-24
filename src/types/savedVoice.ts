export type VoicePresetProvider = 'gemini' | 'minimax' | 'kokoro' | 'elevenlabs';

export interface VoicePreset {
  provider: VoicePresetProvider;
  /** Provider preset enum (e.g. Kore, Puck) — not our asset GUID. */
  voiceId: string;
  /** Gemini: free-form accent / style / tone. */
  styleInstructions?: string;
  languageCode?: string;
  temperature?: number;
  /** ElevenLabs Turbo knobs (if used). */
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speed?: number;
}

/**
 * Display + design metadata for a `voice` asset.
 * Identity is always `AssetDocument.id` (GUID); `voiceName` is renameable.
 */
export interface VoiceAssetMetadata {
  voiceName: string;
  sampleDurationMs?: number;
  originalName?: string;
  preset?: VoicePreset;
  providerIds?: {
    minimax?: { id: string; lastUsedAt?: string };
  };
  waveformPeaks?: number[];
}

export interface SavedVoiceRef {
  id: string;
  fileName: string;
  path: string;
  createdAt: string;
  mimeType?: string;
  metadata: VoiceAssetMetadata;
}

export const DEFAULT_VOICE_NAME = 'Untitled voice';

export const DEFAULT_GEMINI_VOICE_PRESET: VoicePreset = {
  provider: 'gemini',
  voiceId: 'Kore',
};

export function normalizeVoiceAssetMetadata(
  metadata?: Partial<VoiceAssetMetadata> | null,
  fallbackName = DEFAULT_VOICE_NAME,
): VoiceAssetMetadata {
  const voiceName = metadata?.voiceName?.trim() || fallbackName;
  const next: VoiceAssetMetadata = { voiceName };

  if (
    typeof metadata?.sampleDurationMs === 'number' &&
    Number.isFinite(metadata.sampleDurationMs) &&
    metadata.sampleDurationMs > 0
  ) {
    next.sampleDurationMs = Math.round(metadata.sampleDurationMs);
  }

  const originalName = metadata?.originalName?.trim();
  if (originalName) {
    next.originalName = originalName;
  }

  if (metadata?.preset && typeof metadata.preset.voiceId === 'string') {
    const voiceId = metadata.preset.voiceId.trim();
    if (voiceId) {
      const preset: VoicePreset = {
        provider: metadata.preset.provider ?? 'gemini',
        voiceId,
      };
      const style = metadata.preset.styleInstructions?.trim();
      if (style) {
        preset.styleInstructions = style;
      }
      const languageCode = metadata.preset.languageCode?.trim();
      if (languageCode) {
        preset.languageCode = languageCode;
      }
      if (
        typeof metadata.preset.temperature === 'number' &&
        Number.isFinite(metadata.preset.temperature)
      ) {
        preset.temperature = metadata.preset.temperature;
      }
      if (typeof metadata.preset.stability === 'number') {
        preset.stability = metadata.preset.stability;
      }
      if (typeof metadata.preset.similarityBoost === 'number') {
        preset.similarityBoost = metadata.preset.similarityBoost;
      }
      if (typeof metadata.preset.style === 'number') {
        preset.style = metadata.preset.style;
      }
      if (typeof metadata.preset.speed === 'number') {
        preset.speed = metadata.preset.speed;
      }
      next.preset = preset;
    }
  }

  if (metadata?.providerIds?.minimax?.id?.trim()) {
    next.providerIds = {
      minimax: {
        id: metadata.providerIds.minimax.id.trim(),
        ...(metadata.providerIds.minimax.lastUsedAt
          ? { lastUsedAt: metadata.providerIds.minimax.lastUsedAt }
          : {}),
      },
    };
  }

  if (Array.isArray(metadata?.waveformPeaks) && metadata.waveformPeaks.length > 0) {
    next.waveformPeaks = metadata.waveformPeaks.filter(
      (n) => typeof n === 'number' && Number.isFinite(n),
    );
  }

  return next;
}
