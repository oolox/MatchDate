import { Icon } from '../../components/ui/Icon/Icon';
import { useQuotePlay } from './useQuotePlay';
import styles from './SayPlayButton.module.css';

export interface SayPlayButtonProps {
  speakerId: string;
  text: string;
  enabled?: boolean;
}

/** Shared TTS play control (quote bubbles + date summary reviews). */
export function SayPlayButton({ speakerId, text, enabled = true }: SayPlayButtonProps) {
  const { isGenerating, isPlaying, showPlay, play, stop } = useQuotePlay({
    speakerId,
    quote: text,
    enabled,
  });
  const busy = isGenerating || isPlaying;

  if (!showPlay) {
    return null;
  }

  return (
    <button
      type="button"
      className={[
        styles.playButton,
        isGenerating ? styles.playButtonGenerating : '',
        isPlaying ? styles.playButtonPlaying : '',
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={isGenerating}
      aria-busy={busy || undefined}
      aria-label={isPlaying ? 'Stop' : isGenerating ? 'Generating…' : 'Play'}
      title={isPlaying ? 'Stop' : isGenerating ? 'Generating…' : 'Play'}
      onClick={() => {
        if (isPlaying) {
          stop();
          return;
        }
        if (isGenerating) {
          return;
        }
        play();
      }}
    >
      <Icon
        name="voice"
        className={[styles.playIcon, isGenerating || isPlaying ? styles.playIconSpeaking : '']
          .filter(Boolean)
          .join(' ')}
      />
      <Icon name="stop" className={styles.stopIcon} />
    </button>
  );
}
