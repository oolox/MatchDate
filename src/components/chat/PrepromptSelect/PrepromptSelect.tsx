import { useEffect, useMemo, useState } from 'react';
import { DropdownSelect } from '../../ui/DropdownSelect';
import {
  PREPROMPT_NONE_VALUE,
  prepromptSelectOptions,
  resolvePrepromptSelectValue,
} from '../../../features/chat/sessionPreprompt';
import { writePrepromptAssetId } from '../../../services/localStorage';
import { listAssets } from '../../../services/storage/persistenceService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { selectLibraryEpoch } from '../../../store/slices/appShellSlice';
import {
  selectPrepromptAssetId,
  setPrepromptAssetId,
} from '../../../store/slices/localStorageSlice';
import { setThreadValueModelIds } from '../../../store/slices/threadSlice';
import type { ThreadId } from '../../../types/chat';
import styles from './PrepromptSelect.module.css';

export interface PrepromptSelectProps {
  threadId: ThreadId;
  disabled?: boolean;
  className?: string;
}

type TextOption = { id: string; name: string };

async function loadTextAssetOptions(): Promise<TextOption[]> {
  const assets = await listAssets();
  return assets
    .filter((item) => item.subtype === 'text')
    .map((item) => ({ id: item.id, name: item.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function PrepromptSelect({
  threadId,
  disabled = false,
  className,
}: PrepromptSelectProps) {
  const dispatch = useAppDispatch();
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const storedPrepromptId = useAppSelector(selectPrepromptAssetId);
  const threadValueModelIds = useAppSelector(
    (state) => state.thread.threads[threadId]?.valueModelIds,
  );
  const [texts, setTexts] = useState<TextOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadTextAssetOptions()
      .then((items) => {
        if (!cancelled) {
          setTexts(items);
        }
      })
      .catch((error) => {
        console.info('Could not list text assets for preprompt select', { error });
      });
    return () => {
      cancelled = true;
    };
  }, [libraryEpoch]);

  const storedForThread = threadValueModelIds
    ? (threadValueModelIds[0] ?? PREPROMPT_NONE_VALUE)
    : storedPrepromptId;
  const value = resolvePrepromptSelectValue(storedForThread, texts);
  const options = useMemo(
    () => prepromptSelectOptions(texts, value),
    [texts, value],
  );

  const classes = [styles.select, className].filter(Boolean).join(' ');

  return (
    <DropdownSelect
      className={classes}
      aria-label="Value model"
      icon="text-file"
      menuPlacement="top"
      options={options}
      value={value}
      disabled={disabled}
      onChange={(next) => {
        const saved = writePrepromptAssetId(next);
        dispatch(
          setPrepromptAssetId(saved === PREPROMPT_NONE_VALUE ? PREPROMPT_NONE_VALUE : saved),
        );
        dispatch(
          setThreadValueModelIds({
            threadId,
            ids: saved === PREPROMPT_NONE_VALUE ? [] : [saved],
          }),
        );
      }}
    />
  );
}
