import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton/IconButton';
import { tryLoadVoice } from '../../services/storage/voiceStorage';
import { useAppSelector } from '../../store/hooks';
import { selectLibraryEpoch } from '../../store/slices/appShellSlice';
import type { CharacterIdentity } from '../../types/character';
import styles from './CharacterVoiceLabel.module.css';

export interface CharacterVoiceLabelProps {
  voiceAssetId: string | null | undefined;
  /** Used as the new voice’s display name when none is assigned. */
  characterName: string;
  /** Character identity → initial voice gender when creating. */
  characterIdentity: CharacterIdentity;
  /** Passed through so Save on VOICE can bind the new voice to this character. */
  characterId?: string | null;
  disabled?: boolean;
  onClear: () => void;
}

export function CharacterVoiceLabel({
  voiceAssetId,
  characterName,
  characterIdentity,
  characterId,
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

  const openExistingVoice = useCallback(() => {
    if (disabled || !id) {
      return;
    }
    navigate(`/voice?load=${encodeURIComponent(id)}`);
  }, [disabled, id, navigate]);

  const openNewVoice = useCallback(() => {
    if (disabled) {
      return;
    }
    const params = new URLSearchParams();
    params.set('new', '1');
    const name = characterName.trim();
    if (name) {
      params.set('name', name);
    }
    const charId = characterId?.trim();
    if (charId) {
      params.set('characterId', charId);
    }
    params.set('identity', characterIdentity);
    navigate(`/voice?${params.toString()}`);
  }, [characterId, characterIdentity, characterName, disabled, navigate]);

  const handleClear = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.preventDefault();
      onClear();
    },
    [onClear],
  );

  if (!id) {
    return (
      <Button
        variant="tab"
        icon="voice"
        className={styles.voiceButton}
        disabled={disabled}
        title="Create a new voice for this character"
        aria-label="Voice"
        onClick={openNewVoice}
      >
        VOICE
      </Button>
    );
  }

  if (!voiceName) {
    return null;
  }

  return (
    <div className={styles.group}>
      <Button
        variant="tab"
        icon="voice"
        className={styles.voiceButton}
        disabled={disabled}
        title={`Edit voice ${voiceName}`}
        aria-label={`Open voice ${voiceName}`}
        onClick={openExistingVoice}
      >
        {voiceName}
      </Button>
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
