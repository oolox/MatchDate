import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../../components/notification/Notification/useNotification';
import { formatFailure } from '../../../utils/formatFailure';
import {
  deletePreset,
  listPresets,
  loadPreset,
  savePreset,
  setActivePrompt,
} from '../../../services/storage/persistenceService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  selectActiveSystemPresetSlug,
  selectPresetCatalog,
  selectSelectedPresetSlug,
  selectStorageReady,
  selectSystemPrompt,
  setActiveSystemPreset,
  setPresetCatalog,
  setSelectedPresetSlug,
  setSystemPrompt,
} from '../../../store/slices/promptsSlice';

export function usePromptsEditor() {
  const dispatch = useAppDispatch();
  const { notify } = useNotification();
  const systemPrompt = useAppSelector(selectSystemPrompt);
  const presetCatalog = useAppSelector(selectPresetCatalog);
  const selectedPresetSlug = useAppSelector(selectSelectedPresetSlug);
  const activeSystemPresetSlug = useAppSelector(selectActiveSystemPresetSlug);
  const storageReady = useAppSelector(selectStorageReady);

  const [presetName, setPresetName] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!selectedPresetSlug) {
      return;
    }
    const summary = presetCatalog.find((preset) => preset.id === selectedPresetSlug);
    if (summary) {
      setPresetName(summary.name);
    }
  }, [selectedPresetSlug, presetCatalog]);

  const refreshCatalog = useCallback(async () => {
    try {
      const catalog = await listPresets();
      dispatch(setPresetCatalog(catalog));
    } catch (error) {
      notify(formatFailure('refresh prompt list', undefined, error));
    }
  }, [dispatch, notify]);

  const applyPreset = useCallback(
    async (slug: string, name: string) => {
      setIsBusy(true);
      try {
        const preset = await loadPreset(slug);
        dispatch(setSelectedPresetSlug(slug));
        dispatch(setSystemPrompt(preset.systemPrompt));
        setPresetName(preset.name);
      } catch (error) {
        notify(formatFailure('load', name, error));
      } finally {
        setIsBusy(false);
      }
    },
    [dispatch, notify],
  );

  const activatePreset = useCallback(
    async (slug: string, name: string) => {
      setIsBusy(true);
      try {
        const preset = await setActivePrompt(slug);
        dispatch(
          setActiveSystemPreset({
            slug: preset.slug,
            prompt: preset.systemPrompt,
          }),
        );
        notify(`Activated ${preset.name}`);
      } catch (error) {
        notify(formatFailure('activate', name, error));
      } finally {
        setIsBusy(false);
      }
    },
    [dispatch, notify],
  );

  const handleSave = useCallback(async () => {
    const name = presetName.trim();
    if (!name || !systemPrompt.trim()) {
      notify('Enter a name and prompt before saving');
      return;
    }

    setIsBusy(true);
    try {
      const saved = await savePreset({
        name,
        systemPrompt,
        slug: selectedPresetSlug ?? undefined,
      });

      dispatch(setSystemPrompt(saved.systemPrompt));
      dispatch(setSelectedPresetSlug(saved.slug));
      setPresetName(saved.name);

      if (saved.slug === activeSystemPresetSlug) {
        dispatch(
          setActiveSystemPreset({
            slug: saved.slug,
            prompt: saved.systemPrompt,
          }),
        );
      }

      await refreshCatalog();
      notify(`Saved ${saved.name}`);
    } catch (error) {
      notify(formatFailure('save', name, error));
    } finally {
      setIsBusy(false);
    }
  }, [
    activeSystemPresetSlug,
    dispatch,
    notify,
    presetName,
    refreshCatalog,
    selectedPresetSlug,
    systemPrompt,
  ]);

  const handleNew = useCallback(() => {
    setPresetName('');
    dispatch(setSystemPrompt(''));
    dispatch(setSelectedPresetSlug(null));
  }, [dispatch]);

  const handleDeletePreset = useCallback(
    async (slug: string, name: string) => {
      if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) {
        return;
      }

      setIsBusy(true);
      try {
        const next = await deletePreset(slug);
        dispatch(
          setActiveSystemPreset({
            slug: next.activeSystemPresetSlug,
            prompt: next.activeSystemPrompt,
          }),
        );

        if (selectedPresetSlug === slug) {
          dispatch(setSelectedPresetSlug(null));
          setPresetName('');
          dispatch(setSystemPrompt(''));
        }

        await refreshCatalog();
        notify(`Deleted ${name}`);
      } catch (error) {
        notify(formatFailure('delete', name, error));
      } finally {
        setIsBusy(false);
      }
    },
    [dispatch, notify, refreshCatalog, selectedPresetSlug],
  );

  const canSave = presetName.trim().length > 0 && systemPrompt.trim().length > 0 && !isBusy;
  const isNewPrompt =
    selectedPresetSlug === null &&
    presetName.trim().length === 0 &&
    systemPrompt.trim().length === 0;
  const canNew = !isNewPrompt && !isBusy;

  return {
    systemPrompt,
    presetCatalog,
    selectedPresetSlug,
    activeSystemPresetSlug,
    storageReady,
    presetName,
    setPresetName,
    isBusy,
    canSave,
    canNew,
    applyPreset,
    activatePreset,
    handleSave,
    handleNew,
    handleDeletePreset,
    setSystemPrompt: (value: string) => dispatch(setSystemPrompt(value)),
  };
}

export type PromptsEditor = ReturnType<typeof usePromptsEditor>;
