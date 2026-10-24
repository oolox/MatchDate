import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { loadCharacter } from '../../services/storage/persistenceService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectLibraryEpoch } from '../../store/slices/appShellSlice';
import {
  resetCharacterEditor,
  selectCharacterEditorCharacter,
  selectCharacterEditorId,
} from '../../store/slices/characterSlice';
import styles from './VoiceCharacterLabel.module.css';

export interface VoiceCharacterLabelProps {
  /** Voice ↔ character link (`voice.characterId`). */
  characterId?: string | null;
  disabled?: boolean;
}

export function VoiceCharacterLabel({
  characterId,
  disabled = false,
}: VoiceCharacterLabelProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const editorCharacterId = useAppSelector(selectCharacterEditorId);
  const editorCharacter = useAppSelector(selectCharacterEditorCharacter);
  const [characterName, setCharacterName] = useState<string | null>(null);
  const id = characterId?.trim() || '';

  useEffect(() => {
    if (!id) {
      setCharacterName(null);
      return;
    }

    if (editorCharacterId === id) {
      setCharacterName(editorCharacter.name?.trim() || 'Character');
      return;
    }

    let cancelled = false;
    void loadCharacter(id)
      .then((character) => {
        if (!cancelled) {
          setCharacterName(character.name?.trim() || 'Character');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCharacterName('Missing character');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [editorCharacter.name, editorCharacterId, id, libraryEpoch]);

  const openExistingCharacter = useCallback(() => {
    if (disabled || !id) {
      return;
    }
    // Navigate only — useCharacterEditor skips reload when this id is already loaded.
    navigate(`/character/${id}`);
  }, [disabled, id, navigate]);

  const openNewCharacter = useCallback(() => {
    if (disabled) {
      return;
    }
    dispatch(resetCharacterEditor());
    navigate('/character');
  }, [disabled, dispatch, navigate]);

  if (!id) {
    return (
      <Button
        variant="tab"
        icon="character"
        className={styles.characterButton}
        disabled={disabled}
        title="Create a new character"
        aria-label="Character"
        onClick={openNewCharacter}
      >
        CHARACTER
      </Button>
    );
  }

  if (!characterName) {
    return null;
  }

  return (
    <Button
      variant="tab"
      icon="character"
      className={styles.characterButton}
      disabled={disabled}
      title={`Open character ${characterName}`}
      aria-label={`Open character ${characterName}`}
      onClick={openExistingCharacter}
    >
      {characterName}
    </Button>
  );
}
