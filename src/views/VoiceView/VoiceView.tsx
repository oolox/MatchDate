import { useCallback, useState } from 'react';
import { AppHeader } from '../../components/layout/AppHeader';
import { ColumnSplit } from '../../components/layout/ColumnSplit/ColumnSplit';
import { LibraryBrowser } from '../../components/library/LibraryBrowser/LibraryBrowser';
import { VoiceContainer } from '../../features/voice/VoiceContainer';
import { useVoiceEditor } from '../../features/voice/useVoiceEditor';
import { toggleFavorite } from '../../services/storage/persistenceService';
import type { LibraryItemMeta } from '../../services/storage/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { bumpLibraryEpoch, selectLibraryEpoch } from '../../store/slices/appShellSlice';
import styles from './VoiceView.module.css';

export function VoiceView() {
  const editor = useVoiceEditor();
  const { loadVoiceAsset, isBusy, isSaying, voiceAssetId } = editor;
  const dispatch = useAppDispatch();
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const [catalogEpoch, setCatalogEpoch] = useState(0);

  const bumpCatalog = useCallback(() => {
    dispatch(bumpLibraryEpoch());
    setCatalogEpoch((epoch) => epoch + 1);
  }, [dispatch]);

  const handleLoad = useCallback(
    (item: LibraryItemMeta) => {
      if (item.kind === 'asset' && item.subtype === 'voice') {
        void loadVoiceAsset(item.id);
      }
    },
    [loadVoiceAsset],
  );

  return (
    <div className={styles.page}>
      <AppHeader />
      <main className={styles.main}>
        <ColumnSplit
          left={<VoiceContainer editor={editor} />}
          right={
            <LibraryBrowser
              loadableKinds={['asset']}
              preferredSubtype="voice"
              catalogEpoch={catalogEpoch + libraryEpoch}
              selectedId={voiceAssetId}
              selectedKind="asset"
              isBusy={isBusy || isSaying}
              onLoad={handleLoad}
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
