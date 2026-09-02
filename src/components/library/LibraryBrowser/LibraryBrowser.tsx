import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../notification/Notification/useNotification';
import { searchLibraryItems } from '../../../services/library/searchLibraryItems';
import { setActivePrompt } from '../../../services/storage/persistenceService';
import type { LibraryItemKind, LibraryItemMeta } from '../../../services/storage/types';
import {
  loadSessionIntoApp,
  pathForGeneratorLoad,
  pathForPromptLoad,
} from '../../../features/library/openLibraryGenerator';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { bumpLibraryEpoch } from '../../../store/slices/appShellSlice';
import { selectIsStreaming } from '../../../store/slices/chatUiSlice';
import { selectActiveSystemPresetSlug, setActiveSystemPreset } from '../../../store/slices/promptsSlice';
import { selectIsActiveThreadDirty } from '../../../store/slices/sessionsSlice';
import { LibrarySidebar, type LibraryTabId } from '../LibraryList/LibrarySidebar';
import {
  confirmAndDeleteLibraryItem,
  toggleLibraryItemFavoriteSafe,
} from './libraryBrowserActions';
import { useLibraryCatalog } from './useLibraryCatalog';

export interface LibraryBrowserProps {
  loadableKinds: LibraryItemKind[];
  catalogEpoch?: number;
  selectedId?: string | null;
  selectedKind?: LibraryItemKind | null;
  isBusy?: boolean;
  onLoad: (item: LibraryItemMeta) => void;
  onDeleteLoadable?: (item: LibraryItemMeta) => void | Promise<void>;
  onToggleFavoriteLoadable?: (item: LibraryItemMeta) => void | Promise<void>;
  onActivateType?: (item: LibraryItemMeta) => void | Promise<void>;
  onCatalogMutated?: () => void;
  headerActions?: React.ReactNode;
}

function kindsForTab(tab: LibraryTabId): LibraryItemKind[] | null {
  switch (tab) {
    case 'sessions':
      return ['session'];
    case 'prompts':
      return ['prompt'];
    default:
      return null;
  }
}

function defaultTabForKinds(loadableKinds: LibraryItemKind[]): LibraryTabId {
  if (loadableKinds.length === 1 && loadableKinds[0] === 'prompt') {
    return 'prompts';
  }
  if (loadableKinds.length === 1 && loadableKinds[0] === 'session') {
    return 'sessions';
  }
  return 'all';
}

export function LibraryBrowser({
  loadableKinds,
  catalogEpoch = 0,
  selectedId = null,
  selectedKind = null,
  isBusy: editorBusy = false,
  onLoad,
  onDeleteLoadable,
  onToggleFavoriteLoadable,
  onActivateType,
  onCatalogMutated,
  headerActions,
}: LibraryBrowserProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { notify } = useNotification();
  const isStreaming = useAppSelector(selectIsStreaming);
  const isDirty = useAppSelector(selectIsActiveThreadDirty);
  const activePromptId = useAppSelector(selectActiveSystemPresetSlug);
  const { items, isRefreshing, setItemFavorite } = useLibraryCatalog(catalogEpoch);
  const [tab, setTab] = useState<LibraryTabId>(() => defaultTabForKinds(loadableKinds));
  const [searchQuery, setSearchQuery] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const isBusy = editorBusy || isStreaming || isRefreshing || actionBusy;

  const filteredItems = useMemo(() => {
    const tabKinds = kindsForTab(tab);
    const byTab = tabKinds
      ? items.filter((item) => tabKinds.includes(item.kind))
      : items;
    const searched = searchLibraryItems(byTab, searchQuery);
    return [...searched].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) {
        return a.isFavorite ? -1 : 1;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [items, searchQuery, tab]);

  const isLoadable = useCallback(
    (item: LibraryItemMeta) => loadableKinds.includes(item.kind),
    [loadableKinds],
  );

  const navigateToItem = useCallback(
    async (item: LibraryItemMeta) => {
      const promptPath = pathForPromptLoad(item);
      if (promptPath) {
        navigate(promptPath);
        return;
      }
      const sessionPath = pathForGeneratorLoad(item);
      if (sessionPath) {
        if (item.kind === 'session') {
          await loadSessionIntoApp({
            sessionId: item.id,
            dispatch,
            navigate,
          });
          return;
        }
        navigate(sessionPath);
      }
    },
    [dispatch, navigate],
  );

  const handleSelect = useCallback(
    (item: LibraryItemMeta) => {
      if (isBusy || isDirty) {
        return;
      }
      if (isLoadable(item)) {
        onLoad(item);
        return;
      }
      void navigateToItem(item);
    },
    [isBusy, isDirty, isLoadable, navigateToItem, onLoad],
  );

  const handleActivateType = useCallback(
    async (item: LibraryItemMeta) => {
      if (item.kind !== 'prompt' || isBusy) {
        return;
      }
      if (onActivateType) {
        await onActivateType(item);
        return;
      }
      setActionBusy(true);
      try {
        const preset = await setActivePrompt(item.id);
        dispatch(
          setActiveSystemPreset({
            slug: preset.slug,
            prompt: preset.systemPrompt,
          }),
        );
        notify(`Activated ${preset.name}`);
      } catch (error) {
        notify(`Could not activate ${item.name}`);
        console.info('Activate preset failed', error);
      } finally {
        setActionBusy(false);
      }
    },
    [dispatch, isBusy, notify, onActivateType],
  );

  const handleToggleFavorite = useCallback(
    async (item: LibraryItemMeta) => {
      if (isBusy) {
        return;
      }
      if (isLoadable(item) && onToggleFavoriteLoadable) {
        await onToggleFavoriteLoadable(item);
        return;
      }
      setActionBusy(true);
      const ok = await toggleLibraryItemFavoriteSafe(item, notify);
      if (ok) {
        setItemFavorite(item, !item.isFavorite);
        dispatch(bumpLibraryEpoch());
        onCatalogMutated?.();
      }
      setActionBusy(false);
    },
    [
      dispatch,
      isBusy,
      isLoadable,
      notify,
      onCatalogMutated,
      onToggleFavoriteLoadable,
      setItemFavorite,
    ],
  );

  const handleDelete = useCallback(
    async (item: LibraryItemMeta) => {
      if (isBusy) {
        return;
      }
      if (isLoadable(item) && onDeleteLoadable) {
        await onDeleteLoadable(item);
        return;
      }
      setActionBusy(true);
      const ok = await confirmAndDeleteLibraryItem(item, notify);
      if (ok) {
        dispatch(bumpLibraryEpoch());
        onCatalogMutated?.();
        if (item.kind === 'session' && item.id === selectedId) {
          navigate('/');
        }
      }
      setActionBusy(false);
    },
    [
      dispatch,
      isBusy,
      isLoadable,
      navigate,
      notify,
      onCatalogMutated,
      onDeleteLoadable,
      selectedId,
    ],
  );

  return (
    <LibrarySidebar
      tab={tab}
      searchQuery={searchQuery}
      items={filteredItems}
      selectedId={selectedId}
      selectedKind={selectedKind}
      activePromptId={activePromptId}
      isBusy={isBusy}
      headerActions={headerActions}
      onTabChange={setTab}
      onSearchChange={setSearchQuery}
      onSelect={handleSelect}
      onActivateType={handleActivateType}
      onToggleFavorite={handleToggleFavorite}
      onDelete={handleDelete}
    />
  );
}
