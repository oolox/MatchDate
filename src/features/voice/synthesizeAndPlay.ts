import {
  synthesizeSpeech,
  type SynthesizeSpeechVoice,
} from '../../services/fal/ttsService';

export interface SynthesizeAndPlayOptions {
  text: string;
  voice?: SynthesizeSpeechVoice;
  signal?: AbortSignal;
  /**
   * Called once the Audio element exists (before play).
   * Return a cancel hook store so callers can revoke mid-play (Say this).
   */
  onAudioCreated?: (handles: {
    audio: HTMLAudioElement;
    objectUrl: string;
    cancelWait: () => void;
  }) => void;
  /** Fired when playback has actually started (after `audio.play()` resolves). */
  onPlaybackStart?: () => void;
}

/**
 * Synthesize via fal TTS and play to completion (same wait semantics as Say this).
 * Revokes the object URL when settled. Aborts cleanly on `signal`.
 */
export async function synthesizeAndPlaySpeech(
  options: SynthesizeAndPlayOptions,
): Promise<void> {
  const text = options.text.trim();
  if (!text) {
    return;
  }

  const result = await synthesizeSpeech({
    text,
    voice: options.voice,
    signal: options.signal,
  });
  if (options.signal?.aborted) {
    return;
  }

  const objectUrl = URL.createObjectURL(result.blob);
  const audio = new Audio(objectUrl);
  audio.loop = false;
  /** When `onAudioCreated` is set, the caller owns revoke (Say this keeps the URL until next play). */
  const callerOwnsUrl = Boolean(options.onAudioCreated);

  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        fn();
      };
      const onEnded = () => settle(() => resolve());
      const onError = () => settle(() => reject(new Error('Audio playback failed')));
      const cancelWait = () => settle(() => resolve());
      const onAbort = () => {
        audio.pause();
        cancelWait();
      };
      const cleanup = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        options.signal?.removeEventListener('abort', onAbort);
      };

      options.onAudioCreated?.({ audio, objectUrl, cancelWait });
      options.signal?.addEventListener('abort', onAbort);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
      void audio
        .play()
        .then(() => {
          if (!settled && !options.signal?.aborted) {
            options.onPlaybackStart?.();
          }
        })
        .catch((error: unknown) => {
          settle(() => reject(error));
        });
    });
  } finally {
    if (!callerOwnsUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}
