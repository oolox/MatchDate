import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/notification/Notification/useNotification';
import { loadCharacter, saveCharacter } from '../../services/storage/persistenceService';
import type { BasicValue } from '../../types/character';
import { formatFailure } from '../../utils/formatFailure';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { bumpLibraryEpoch } from '../../store/slices/appShellSlice';
import {
  markCharacterEditorSaved,
  replaceCharacterEditor,
  resetCharacterEditor,
  selectCharacterEditorCharacter,
  selectCharacterEditorDirty,
  selectCharacterEditorId,
  setCharacterEditorAttributeValue,
  setCharacterEditorName,
} from '../../store/slices/characterSlice';
import { selectStorageReady } from '../../store/slices/promptsSlice';

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function useCharacterEditor(characterIdFromRoute: string | null) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { notify } = useNotification();
  const storageReady = useAppSelector(selectStorageReady);
  const characterId = useAppSelector(selectCharacterEditorId);
  const character = useAppSelector(selectCharacterEditorCharacter);
  const isDirty = useAppSelector(selectCharacterEditorDirty);

  const [isBusy, setIsBusy] = useState(false);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    if (!storageReady || !characterIdFromRoute) {
      return;
    }
    if (characterIdFromRoute === characterId) {
      return;
    }

    const seq = ++loadSeqRef.current;
    let cancelled = false;
    setIsBusy(true);
    void loadCharacter(characterIdFromRoute)
      .then((loaded) => {
        if (!cancelled) {
          dispatch(
            replaceCharacterEditor({
              characterId: characterIdFromRoute,
              character: loaded,
              isDirty: false,
            }),
          );
        }
      })
      .catch((error) => {
        if (!cancelled) {
          notify(formatFailure('load', characterIdFromRoute, error));
        }
      })
      .finally(() => {
        if (loadSeqRef.current === seq) {
          setIsBusy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [characterId, characterIdFromRoute, dispatch, notify, storageReady]);

  const setCharacterName = useCallback(
    (name: string) => {
      dispatch(setCharacterEditorName(name));
    },
    [dispatch],
  );

  const clearCharacterName = useCallback(() => {
    setCharacterName('');
  }, [setCharacterName]);

  const setAttributeValue = useCallback(
    (name: BasicValue, value: number) => {
      dispatch(setCharacterEditorAttributeValue({ name, value: clampScore(value) }));
    },
    [dispatch],
  );

  const loadCharacterById = useCallback(
    (id: string) => {
      navigate(`/character/${id}`);
    },
    [navigate],
  );

  const startNewCharacter = useCallback(() => {
    dispatch(resetCharacterEditor());
    navigate('/character');
  }, [dispatch, navigate]);

  const handleSave = useCallback(async () => {
    setIsBusy(true);
    try {
      const saved = await saveCharacter(character, characterId ?? undefined);
      dispatch(bumpLibraryEpoch());
      dispatch(
        markCharacterEditorSaved({
          characterId: saved.id,
          character: {
            name: saved.name,
            attributes: saved.attributes,
          },
        }),
      );
      notify(`Saved ${saved.name}`);
      if (saved.id !== characterIdFromRoute) {
        navigate(`/character/${saved.id}`, { replace: true });
      }
    } catch (error) {
      notify(formatFailure('save', character.name || 'character', error));
    } finally {
      setIsBusy(false);
    }
  }, [character, characterId, characterIdFromRoute, dispatch, navigate, notify]);

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
    clearCharacterName,
    setAttributeValue,
    loadCharacterById,
    startNewCharacter,
    handleSave,
    handleNew,
  };
}
