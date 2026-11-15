import { useCallback, useRef, useState } from 'react';
import { useNotification } from '../../components/notification/Notification/useNotification';
import { useAbortController } from '../../hooks/useAbortController';
import { loadCharacter } from '../../services/storage/persistenceService';
import { loadVoiceMetadata } from '../../services/storage/voiceStorage';
import { DEFAULT_GEMINI_VOICE_PRESET } from '../../types/savedVoice';
import { formatFailure } from '../../utils/formatFailure';
import { synthesizeAndPlaySpeech } from './synthesizeAndPlay';

/** Only one quote utterance plays at a time across bubbles. */
let activeQuoteAbort: (() => void) | null = null;

export function useQuotePlay(options: {
  speakerId: string;
  quote: string;
  enabled: boolean;
}): {
  /** Synthesizing speech (before audio starts). */
  isGenerating: boolean;
  /** Audio is actively playing. */
  isPlaying: boolean;
  /** Whether the play control should be shown. */
  showPlay: boolean;
  play: () => void;
  stop: () => void;
} {
  const { speakerId, quote, enabled } = options;
  const { notify } = useNotification();
  const { begin, abort } = useAbortController();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const inFlightRef = useRef(false);
  const playingRef = useRef(false);

  const text = quote.trim();
  const characterId = speakerId.trim();
  const showPlay = enabled && Boolean(characterId) && Boolean(text);

  const stop = useCallback(() => {
    if (!playingRef.current) {
      return;
    }
    abort();
  }, [abort]);

  const play = useCallback(() => {
    if (!showPlay || inFlightRef.current) {
      return;
    }

    const myAbort = () => {
      abort();
    };
    activeQuoteAbort?.();
    activeQuoteAbort = myAbort;

    inFlightRef.current = true;
    playingRef.current = false;
    setIsGenerating(true);
    setIsPlaying(false);
    const controller = begin();

    void (async () => {
      try {
        const character = await loadCharacter(characterId);
        if (controller.signal.aborted) {
          return;
        }
        const voiceAssetId = character.voiceAssetId?.trim();
        if (!voiceAssetId) {
          throw new Error('No voice assigned to this character');
        }
        const metadata = await loadVoiceMetadata(voiceAssetId);
        if (controller.signal.aborted) {
          return;
        }
        const preset = metadata.preset ?? DEFAULT_GEMINI_VOICE_PRESET;
        await synthesizeAndPlaySpeech({
          text,
          voice: {
            voiceId: preset.voiceId,
            styleInstructions: preset.styleInstructions,
            languageCode: preset.languageCode,
            temperature:
              typeof preset.temperature === 'number' && Number.isFinite(preset.temperature)
                ? preset.temperature
                : 1,
          },
          signal: controller.signal,
          onPlaybackStart: () => {
            if (controller.signal.aborted) {
              return;
            }
            playingRef.current = true;
            setIsGenerating(false);
            setIsPlaying(true);
          },
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        notify(formatFailure('play speech', characterId, error));
      } finally {
        if (activeQuoteAbort === myAbort) {
          activeQuoteAbort = null;
        }
        inFlightRef.current = false;
        playingRef.current = false;
        setIsGenerating(false);
        setIsPlaying(false);
      }
    })();
  }, [abort, begin, characterId, notify, showPlay, text]);

  return { isGenerating, isPlaying, showPlay, play, stop };
}
