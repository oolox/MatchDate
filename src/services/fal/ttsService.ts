import { falFetch } from './falClient';
import {
  DEFAULT_TTS_MODEL_ID,
  getTtsModel,
  type GeminiTtsVoiceId,
} from './models/tts';

export interface SynthesizeSpeechVoice {
  /** Gemini VoiceEnum (e.g. Kore, Puck). */
  voiceId?: string;
  styleInstructions?: string;
  languageCode?: string;
  temperature?: number;
}

export interface SynthesizeSpeechOptions {
  text: string;
  modelId?: string;
  voice?: SynthesizeSpeechVoice;
  outputFormat?: 'mp3' | 'wav' | 'ogg_opus';
  signal?: AbortSignal;
}

export interface SynthesizeSpeechResult {
  blob: Blob;
  /** Remote fal media URL (ephemeral; prefer blob for playback). */
  url: string;
  charCount: number;
  modelId: string;
}

interface FalAudioFile {
  url?: string;
}

interface GeminiTtsResponse {
  audio?: FalAudioFile | string;
}

function falRunUrl(endpoint: string): string {
  const trimmed = endpoint.replace(/^\/+/, '');
  return `https://fal.run/${trimmed}`;
}

function audioUrlFromResponse(data: GeminiTtsResponse): string {
  const audio = data.audio;
  if (typeof audio === 'string' && audio.trim()) {
    return audio.trim();
  }
  if (audio && typeof audio === 'object' && typeof audio.url === 'string' && audio.url.trim()) {
    return audio.url.trim();
  }
  throw new Error('TTS API returned no audio URL');
}

async function fetchAudioBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Failed to download TTS audio (${response.status})`);
  }
  return response.blob();
}

/** Synthesize speech via fal; returns a temporary Blob (do not persist to OPFS). */
export async function synthesizeSpeech(
  options: SynthesizeSpeechOptions,
): Promise<SynthesizeSpeechResult> {
  const text = options.text.trim();
  if (!text) {
    throw new Error('Say this requires text');
  }

  const modelId = options.modelId?.trim() || DEFAULT_TTS_MODEL_ID;
  const model = getTtsModel(modelId);
  if (text.length > model.promptMax) {
    throw new Error(`Text exceeds max length (${model.promptMax} characters)`);
  }

  const voiceId = (options.voice?.voiceId?.trim() || 'Kore') as GeminiTtsVoiceId;
  const style = options.voice?.styleInstructions?.trim();
  const languageCode = options.voice?.languageCode?.trim();
  const temperature = options.voice?.temperature;
  const outputFormat = options.outputFormat ?? 'mp3';

  const body: Record<string, unknown> = {
    prompt: text,
    voice: voiceId,
    output_format: outputFormat,
  };
  if (style) {
    body.style_instructions = style;
  }
  if (languageCode) {
    body.language_code = languageCode;
  }
  if (typeof temperature === 'number' && Number.isFinite(temperature)) {
    body.temperature = Math.min(2, Math.max(0, temperature));
  }

  const response = await falFetch(falRunUrl(model.endpoint), {
    method: 'POST',
    body: JSON.stringify(body),
    signal: options.signal,
  });

  const data = (await response.json()) as GeminiTtsResponse;
  const url = audioUrlFromResponse(data);
  const blob = await fetchAudioBlob(url, options.signal);

  return {
    blob,
    url,
    charCount: text.length,
    modelId,
  };
}
