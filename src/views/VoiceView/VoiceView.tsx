import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppHeader } from '../../components/layout/AppHeader';
import { ColumnSplit } from '../../components/layout/ColumnSplit/ColumnSplit';
import { LibraryBrowser } from '../../components/library/LibraryBrowser/LibraryBrowser';
import { VoiceContainer } from '../../features/voice/VoiceContainer';
import { useVoiceEditor } from '../../features/voice/useVoiceEditor';
import type { VoiceGenderHint } from '../../services/fal/models/tts';
import { toggleFavorite } from '../../services/storage/persistenceService';
import type { LibraryItemMeta } from '../../services/storage/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { bumpLibraryEpoch, selectLibraryEpoch } from '../../store/slices/appShellSlice';
import { isCharacterIdentity } from '../../types/character';
import styles from './VoiceView.module.css';

function clearVoiceQueryParams(prev: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(prev);
  next.delete('load');
  next.delete('new');
  next.delete('name');
  next.delete('characterId');
  next.delete('identity');
  return next;
}

function genderFromCharacterIdentity(value: string | null): VoiceGenderHint | undefined {
  if (!isCharacterIdentity(value)) {
    return undefined;
  }
  if (value === 'male') {
    return 'male';
  }
  if (value === 'female') {
    return 'female';
  }
  return 'neutral';
}

export function VoiceView() {
  const editor = useVoiceEditor();
  const { loadVoiceAsset, startNewVoiceDesign, isBusy, isSaying, voiceAssetId } = editor;
  const dispatch = useAppDispatch();
  const libraryEpoch = useAppSelector(selectLibraryEpoch);
  const [catalogEpoch, setCatalogEpoch] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const loadId = searchParams.get('load')?.trim() || null;
  const isNew = searchParams.get('new') === '1' || searchParams.get('new') === 'true';
  const newName = searchParams.get('name');
  const newCharacterId = searchParams.get('characterId');
  const newIdentity = searchParams.get('identity');
  const appliedNewKeyRef = useRef<string | null>(null);

  const clearVoiceParams = useCallback(() => {
    setSearchParams(
      (prev) => {
        if (
          !prev.has('load') &&
          !prev.has('new') &&
          !prev.has('name') &&
          !prev.has('characterId') &&
          !prev.has('identity')
        ) {
          return prev;
        }
        return clearVoiceQueryParams(prev);
      },
      { replace: true },
    );
  }, [setSearchParams]);

  useEffect(() => {
    if (!isNew) {
      appliedNewKeyRef.current = null;
      return;
    }
    const key = `${newName ?? ''}:${newCharacterId ?? ''}:${newIdentity ?? ''}`;
    if (appliedNewKeyRef.current === key) {
      return;
    }
    appliedNewKeyRef.current = key;
    startNewVoiceDesign({
      voiceName: newName?.trim() || undefined,
      characterId: newCharacterId?.trim() || null,
      gender: genderFromCharacterIdentity(newIdentity),
    });
    clearVoiceParams();
  }, [clearVoiceParams, isNew, newCharacterId, newIdentity, newName, startNewVoiceDesign]);

  useEffect(() => {
    if (!loadId || isNew) {
      return;
    }
    if (voiceAssetId === loadId) {
      clearVoiceParams();
      return;
    }
    let cancelled = false;
    void loadVoiceAsset(loadId).finally(() => {
      if (!cancelled) {
        clearVoiceParams();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [clearVoiceParams, isNew, loadId, loadVoiceAsset, voiceAssetId]);

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
