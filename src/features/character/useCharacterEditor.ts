import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../components/notification/Notification/useNotification';
import {
  isImageLikeAssetSubtype,
  savedImageRefFromAsset,
} from '../../services/storage/assetDocument';
import { saveImage } from '../../services/storage/imageStorage';
import { loadAsset, loadCharacter, saveCharacter } from '../../services/storage/persistenceService';
import type { BasicValue, Character } from '../../types/character';
import type { SavedImageRef } from '../../types/savedImage';
import { formatFailure } from '../../utils/formatFailure';
import type { MatchDateLibraryDragPayload } from '../../utils/matchdateLibraryDrag';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { bumpLibraryEpoch, selectLibraryEpoch } from '../../store/slices/appShellSlice';
import {
  markCharacterEditorSaved,
  prependCharacterEditorImages,
  replaceCharacterEditor,
  resetCharacterEditor,
  removeCharacterEditorImage,
  selectCharacterEditorCharacter,
  selectCharacterEditorDirty,
  selectCharacterEditorId,
  setCharacterEditorAttributeValue,
  removeCharacterEditorHistoryEntry,
  removeCharacterEditorTrait,
  setCharacterEditorName,
} from '../../store/slices/characterSlice';
import { selectStorageReady } from '../../store/slices/promptsSlice';

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round(value)));
}

function toEditorCharacter(character: Character, images?: SavedImageRef[]): Character {
  return {
    name: character.name,
    attributes: character.attributes,
    history: character.history ?? [],
    traits: character.traits ?? [],
    images: images ?? character.images ?? [],
  };
}

function prependUniqueImages(
  existing: SavedImageRef[],
  incoming: SavedImageRef[],
): { next: SavedImageRef[]; added: SavedImageRef[] } {
  const existingIds = new Set(existing.map((image) => image.id));
  const added = incoming.filter((ref) => !existingIds.has(ref.id));
  if (added.length === 0) {
    return { next: existing, added };
  }
  return { next: [...added, ...existing], added };
}

export function useCharacterEditor(characterIdFromRoute: string | null) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { notify } = useNotification();
  const storageReady = useAppSelector(selectStorageReady);
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const characterId = useAppSelector(selectCharacterEditorId);
  const character = useAppSelector(selectCharacterEditorCharacter);
  const isDirty = useAppSelector(selectCharacterEditorDirty);

  const [isBusy, setIsBusy] = useState(false);
  const loadSeqRef = useRef(0);
  const lastLoadKeyRef = useRef<string | null>(null);
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const characterIdRef = useRef(characterId);
  characterIdRef.current = characterId;
  const characterRef = useRef(character);
  characterRef.current = character;

  useEffect(() => {
    if (!storageReady || !characterIdFromRoute) {
      return;
    }

    const loadKey = `${characterIdFromRoute}:${libraryEpoch}`;
    // Avoid clobbering in-progress edits when epoch bumps while this sheet is open.
    if (
      isDirtyRef.current &&
      characterIdFromRoute === characterIdRef.current &&
      lastLoadKeyRef.current !== null
    ) {
      return;
    }
    if (lastLoadKeyRef.current === loadKey) {
      return;
    }

    const seq = ++loadSeqRef.current;
    let cancelled = false;
    setIsBusy(true);
    void loadCharacter(characterIdFromRoute)
      .then((loaded) => {
        if (cancelled) {
          return;
        }
        // Skip apply if the user started editing this sheet while load was in flight.
        if (
          isDirtyRef.current &&
          characterIdFromRoute === characterIdRef.current &&
          lastLoadKeyRef.current !== null
        ) {
          return;
        }
        lastLoadKeyRef.current = loadKey;
        dispatch(
          replaceCharacterEditor({
            characterId: characterIdFromRoute,
            character: loaded,
            isDirty: false,
          }),
        );
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
  }, [characterIdFromRoute, dispatch, isDirty, libraryEpoch, notify, storageReady]);

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

  const removeHistoryEntry = useCallback(
    (index: number) => {
      dispatch(removeCharacterEditorHistoryEntry(index));
    },
    [dispatch],
  );

  const removeTrait = useCallback(
    (name: string) => {
      dispatch(removeCharacterEditorTrait(name));
    },
    [dispatch],
  );

  /** Auto-persist image list when the sheet already has an id + name (LuxNova-style). */
  const persistImagesIfPossible = useCallback(
    async (nextImages: SavedImageRef[]) => {
      const current = characterRef.current;
      const id = characterIdRef.current;
      if (!id || !current.name.trim()) {
        return;
      }
      const saved = await saveCharacter({ ...current, images: nextImages }, id);
      dispatch(bumpLibraryEpoch());
      dispatch(
        markCharacterEditorSaved({
          characterId: saved.id,
          character: toEditorCharacter(
            {
              name: saved.name,
              attributes: saved.attributes,
              history: saved.history ?? [],
              traits: saved.traits ?? [],
              images: saved.images ?? nextImages,
            },
            saved.images ?? nextImages,
          ),
        }),
      );
      lastLoadKeyRef.current = `${saved.id}:${libraryEpoch + 1}`;
    },
    [dispatch, libraryEpoch],
  );

  const attachImageRefs = useCallback(
    async (refs: SavedImageRef[]) => {
      const { next, added } = prependUniqueImages(characterRef.current.images, refs);
      if (added.length === 0) {
        notify('Image already on this character');
        return;
      }
      dispatch(prependCharacterEditorImages(added));
      characterRef.current = { ...characterRef.current, images: next };
      try {
        await persistImagesIfPossible(next);
      } catch (error) {
        notify(formatFailure('save', characterRef.current.name || 'character', error));
      }
    },
    [dispatch, notify, persistImagesIfPossible],
  );

  const addImagesFromFiles = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((file) => file.type.startsWith('image/'));
      if (imageFiles.length === 0) {
        notify('Drop image files (PNG, JPEG, …)');
        return;
      }
      setIsBusy(true);
      try {
        const refs: SavedImageRef[] = [];
        for (const file of imageFiles) {
          refs.push(await saveImage(file, { name: file.name }));
        }
        dispatch(bumpLibraryEpoch());
        await attachImageRefs(refs);
        notify(refs.length === 1 ? 'Image added' : `Added ${refs.length} images`);
      } catch (error) {
        notify(formatFailure('upload image', undefined, error));
      } finally {
        setIsBusy(false);
      }
    },
    [attachImageRefs, dispatch, notify],
  );

  const addImagesFromLibrary = useCallback(
    async (items: MatchDateLibraryDragPayload[]) => {
      const imageItems = items.filter(
        (item) => item.kind === 'asset' && (item.subtype === 'image' || item.subtype === undefined),
      );
      if (imageItems.length === 0) {
        notify('Drop an IMAGE asset from the library');
        return;
      }
      setIsBusy(true);
      try {
        const refs: SavedImageRef[] = [];
        for (const item of imageItems) {
          const asset = await loadAsset(item.id);
          if (!isImageLikeAssetSubtype(asset.subtype)) {
            notify(`Skipped non-image asset: ${asset.name}`);
            continue;
          }
          refs.push(savedImageRefFromAsset(asset));
        }
        await attachImageRefs(refs);
        if (refs.length > 0) {
          notify(refs.length === 1 ? 'Image linked' : `Linked ${refs.length} images`);
        }
      } catch (error) {
        notify(formatFailure('link image', undefined, error));
      } finally {
        setIsBusy(false);
      }
    },
    [attachImageRefs, notify],
  );

  const removeImage = useCallback(
    async (imageId: string) => {
      const id = imageId.trim();
      if (!id) {
        return;
      }
      const nextImages = characterRef.current.images.filter((image) => image.id !== id);
      dispatch(removeCharacterEditorImage(id));
      characterRef.current = { ...characterRef.current, images: nextImages };
      try {
        await persistImagesIfPossible(nextImages);
      } catch (error) {
        notify(formatFailure('save', characterRef.current.name || 'character', error));
      }
    },
    [dispatch, notify, persistImagesIfPossible],
  );

  const loadCharacterById = useCallback(
    (id: string) => {
      navigate(`/character/${id}`);
    },
    [navigate],
  );

  const startNewCharacter = useCallback(() => {
    lastLoadKeyRef.current = null;
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
          character: toEditorCharacter(
            {
              name: saved.name,
              attributes: saved.attributes,
              history: saved.history ?? [],
              traits: saved.traits ?? [],
              images: saved.images ?? character.images ?? [],
            },
            saved.images ?? character.images ?? [],
          ),
        }),
      );
      lastLoadKeyRef.current = `${saved.id}:${libraryEpoch + 1}`;
      notify(`Saved ${saved.name}`);
      if (saved.id !== characterIdFromRoute) {
        navigate(`/character/${saved.id}`, { replace: true });
      }
    } catch (error) {
      notify(formatFailure('save', character.name || 'character', error));
    } finally {
      setIsBusy(false);
    }
  }, [character, characterId, characterIdFromRoute, dispatch, libraryEpoch, navigate, notify]);

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
    removeHistoryEntry,
    removeTrait,
    addImagesFromFiles,
    addImagesFromLibrary,
    removeImage,
    loadCharacterById,
    startNewCharacter,
    handleSave,
    handleNew,
  };
}
