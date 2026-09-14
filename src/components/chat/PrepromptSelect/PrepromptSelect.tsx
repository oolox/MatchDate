import { useEffect, useMemo, useState } from 'react';
import { DropdownSelect } from '../../ui/DropdownSelect';
import {
  prepromptSelectOptions,
  resolvePrepromptSelectValue,
} from '../../../features/chat/sessionPreprompt';
import { writePrepromptAssetId } from '../../../services/localStorage';
import { listTextAssets, type TextAssetSummary } from '../../../services/storage/textStorage';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { selectLibraryEpoch } from '../../../store/slices/appShellSlice';
import {
  selectPrepromptAssetId,
  setPrepromptAssetId,
} from '../../../store/slices/localStorageSlice';
import { selectStorageReady } from '../../../store/slices/promptsSlice';
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

export function PrepromptSelect({
  disabled = false,
  consumed = false,
  className,
}: PrepromptSelectProps) {
  const dispatch = useAppDispatch();
  const storageReady = useAppSelector(selectStorageReady);
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const storedPrepromptId = useAppSelector(selectPrepromptAssetId);
  const [texts, setTexts] = useState<TextAssetSummary[]>([]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }
    let cancelled = false;
    void listTextAssets()
      .then((items) => {
        if (!cancelled) {
          setTexts(items);
        }
      })
      .catch((error) => {
        console.info('Could not list text assets for preprompt select', { error });
        // Keep prior options so a failed refresh does not collapse to "None" only.
      });
    return () => {
      cancelled = true;
    };
  }, [libraryEpoch, storageReady]);

  const options = useMemo(() => prepromptSelectOptions(texts), [texts]);
  const value = resolvePrepromptSelectValue(storedPrepromptId, texts);

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
      disabled={disabled || !storageReady}
      onChange={(next) => {
        const saved = writePrepromptAssetId(next);
        dispatch(setPrepromptAssetId(saved));
      }}
    />
  );
}
