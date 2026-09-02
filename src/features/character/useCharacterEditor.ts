import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/notification/Notification/useNotification';
import { loadCharacter, saveCharacter } from '../../services/storage/persistenceService';
import type { BasicValue, Character } from '../../types/character';
import { createDefaultCharacter } from '../../types/character';
import { formatFailure } from '../../utils/formatFailure';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { bumpLibraryEpoch } from '../../store/slices/appShellSlice';
import { selectStorageReady } from '../../store/slices/promptsSlice';

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function useCharacterEditor(characterId: string | null) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { notify } = useNotification();
  const storageReady = useAppSelector(selectStorageReady);

  const [character, setCharacter] = useState<Character>(() => createDefaultCharacter());
  const [isBusy, setIsBusy] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!storageReady) {
      return;
    }
    if (!characterId) {
      setCharacter(createDefaultCharacter());
      setIsDirty(false);
      return;
    }

    let cancelled = false;
    setIsBusy(true);
    void loadCharacter(characterId)
      .then((loaded) => {
        if (!cancelled) {
          setCharacter(loaded);
          setIsDirty(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          notify(formatFailure('load', characterId, error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsBusy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [characterId, notify, storageReady]);

  const setCharacterName = useCallback((name: string) => {
    setCharacter((current) => ({ ...current, name }));
    setIsDirty(true);
  }, []);

  const setAttributeValue = useCallback((name: BasicValue, value: number) => {
    const nextValue = clampScore(value);
    setCharacter((current) => ({
      ...current,
      attributes: current.attributes.map((attribute) =>
        attribute.name === name ? { ...attribute, value: nextValue } : attribute,
      ),
    }));
    setIsDirty(true);
  }, []);

  const loadCharacterById = useCallback(
    (id: string) => {
      navigate(`/character/${id}`);
    },
    [navigate],
  );

  const startNewCharacter = useCallback(() => {
    navigate('/character');
  }, [navigate]);

  const handleSave = useCallback(async () => {
    setIsBusy(true);
    try {
      const saved = await saveCharacter(character, characterId ?? undefined);
      dispatch(bumpLibraryEpoch());
      setIsDirty(false);
      notify(`Saved ${saved.name}`);
      if (saved.id !== characterId) {
        navigate(`/character/${saved.id}`, { replace: true });
      }
    } catch (error) {
      notify(formatFailure('save', character.name || 'character', error));
    } finally {
      setIsBusy(false);
    }
  }, [character, characterId, dispatch, navigate, notify]);

  const handleNew = useCallback(() => {
    startNewCharacter();
  }, [startNewCharacter]);

  return {
    characterId,
    character,
    isBusy,
    isDirty,
    storageReady,
    canSave: isDirty && !isBusy && storageReady,
    setCharacterName,
    setAttributeValue,
    loadCharacterById,
    startNewCharacter,
    handleSave,
    handleNew,
  };
}
