import { useCallback, useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon/Icon';
import { IconButton } from '../../components/ui/IconButton/IconButton';
import { tryLoadVoice } from '../../services/storage/voiceStorage';
import { useAppSelector } from '../../store/hooks';
import { selectLibraryEpoch } from '../../store/slices/appShellSlice';
import styles from './CharacterVoiceLabel.module.css';

export interface CharacterVoiceLabelProps {
  voiceAssetId: string | null | undefined;
  disabled?: boolean;
  onClear: () => void;
}

export function CharacterVoiceLabel({
  voiceAssetId,
  disabled = false,
  onClear,
}: CharacterVoiceLabelProps) {
  const navigate = useNavigate();
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const id = voiceAssetId?.trim() || '';

  useEffect(() => {
    if (!id) {
      setVoiceName(null);
      return;
    }

    let cancelled = false;
    void tryLoadVoice(id)
      .then((doc) => {
        if (!cancelled) {
          setVoiceName(doc?.name?.trim() || 'Voice');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVoiceName('Missing voice');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, libraryEpoch]);

  const openVoiceEditor = useCallback(() => {
    if (disabled || !id) {
      return;
    }
    navigate(`/voice?load=${encodeURIComponent(id)}`);
  }, [disabled, id, navigate]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openVoiceEditor();
      }
    },
    [openVoiceEditor],
  );

  const handleClear = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      onClear();
    },
    [onClear],
  );

  if (!id || !voiceName) {
    return null;
  }

  return (
    <div
      className={styles.chip}
      title={`Edit voice ${voiceName}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      aria-label={`Open voice ${voiceName}`}
      onClick={openVoiceEditor}
      onKeyDown={handleKeyDown}
    >
      <Icon name="voice" className={styles.icon} />
      <span className={styles.name}>{voiceName}</span>
      <IconButton
        icon="close"
        label={`Clear voice ${voiceName}`}
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={handleClear}
      />
    </div>
  );
}
