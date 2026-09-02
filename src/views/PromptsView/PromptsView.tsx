import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppHeader } from '../../components/layout/AppHeader';
import { ColumnSplit } from '../../components/layout/ColumnSplit/ColumnSplit';
import { LibraryBrowser } from '../../components/library/LibraryBrowser/LibraryBrowser';
import { PromptsContainer } from '../../features/prompts/containers/PromptsContainer';
import { usePromptsEditor } from '../../features/prompts/containers/usePromptsEditor';
import { toggleFavorite } from '../../services/storage/persistenceService';
import type { LibraryItemMeta } from '../../services/storage/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { bumpLibraryEpoch, selectLibraryEpoch } from '../../store/slices/appShellSlice';
import { selectSelectedPresetSlug } from '../../store/slices/promptsSlice';
import styles from './PromptsView.module.css';

export function PromptsView() {
  const editor = usePromptsEditor();
  const {
    applyPreset,
    activatePreset,
    handleDeletePreset,
    isBusy,
    selectedPresetSlug,
  } = editor;
  const dispatch = useAppDispatch();
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const activeSelectedSlug = useAppSelector(selectSelectedPresetSlug);
  const [catalogEpoch, setCatalogEpoch] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const loadId = searchParams.get('load');
  const appliedLoadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loadId || appliedLoadRef.current === loadId) {
      return;
    }
    appliedLoadRef.current = loadId;
    void applyPreset(loadId, loadId).finally(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('load');
          return next;
        },
        { replace: true },
      );
    });
  }, [applyPreset, loadId, setSearchParams]);

  const bumpCatalog = () => {
    dispatch(bumpLibraryEpoch());
    setCatalogEpoch((epoch) => epoch + 1);
  };

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <ColumnSplit
          left={<PromptsContainer editor={editor} />}
          right={
            <LibraryBrowser
              loadableKinds={['prompt']}
              catalogEpoch={catalogEpoch + libraryEpoch}
              selectedId={selectedPresetSlug ?? activeSelectedSlug}
              selectedKind="prompt"
              isBusy={isBusy}
              onLoad={(item) => {
                void applyPreset(item.id, item.name);
              }}
              onActivateType={(item) => activatePreset(item.id, item.name)}
              onDeleteLoadable={(item) => handleDeletePreset(item.id, item.name).then(bumpCatalog)}
              onToggleFavoriteLoadable={async (item: LibraryItemMeta) => {
                await toggleFavorite(item.kind, item.id);
                bumpCatalog();
              }}
              onCatalogMutated={bumpCatalog}
            />
          }
        />
      </main>
    </div>
  );
}
