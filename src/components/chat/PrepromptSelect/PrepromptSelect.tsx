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
import styles from './PrepromptSelect.module.css';

export interface PrepromptSelectProps {
  disabled?: boolean;
  /**
   * Preprompt already applied on this session's first message.
   * Still editable (saves preference); muted look; will not re-send until a new session.
   */
  consumed?: boolean;
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
  disabled = false,
  consumed = false,
  className,
}: PrepromptSelectProps) {
  const dispatch = useAppDispatch();
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const storedPrepromptId = useAppSelector(selectPrepromptAssetId);
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

  const value = resolvePrepromptSelectValue(storedPrepromptId, texts);
  const options = useMemo(
    () => prepromptSelectOptions(texts, value),
    [texts, value],
  );

  const classes = [
    styles.select,
    consumed ? styles.consumed : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <DropdownSelect
      className={classes}
      aria-label={consumed ? 'Preprompt (already sent this session)' : 'Preprompt'}
      icon="text-file"
      menuPlacement="top"
      options={options}
      value={value}
      disabled={disabled}
      onChange={(next) => {
        const saved = writePrepromptAssetId(next);
        dispatch(setPrepromptAssetId(saved === PREPROMPT_NONE_VALUE ? PREPROMPT_NONE_VALUE : saved));
      }}
    />
  );
}
