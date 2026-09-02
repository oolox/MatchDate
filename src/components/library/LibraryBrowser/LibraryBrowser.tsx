import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropdownSelect } from '../../ui/DropdownSelect';
import { Tabs } from '../../ui/Tabs';
import { SubSubHeader } from '../../ui/SubSubHeader';
import { useNotification } from '../../notification/Notification/useNotification';
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
import { setActivePrompt } from '../../../services/storage/persistenceService';
import { LibrarySidebar } from '../LibraryList/LibrarySidebar';
import {
  confirmAndDeleteLibraryItem,
  toggleLibraryItemFavoriteSafe,
} from './libraryBrowserActions';
import {
  defaultTabForLoadableKinds,
  kindsForTab,
  LIBRARY_BROWSER_TABS,
  listKindForTab,
  type LibraryBrowserTabId,
} from './libraryBrowserTabs';
import {
  defaultSubtypeForLoadableKinds,
  itemMatchesSubtypeTab,
  subtypeTabsLabel,
  subtypesForFolder,
  type LibraryBrowserSubtypeId,
} from './libraryBrowserSubtypes';
import { useLibraryCatalog } from './useLibraryCatalog';
import styles from './LibraryBrowser.module.css';

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
  const { items, storageReady, isRefreshing, setItemFavorite } = useLibraryCatalog(catalogEpoch);
  const [activeTab, setActiveTab] = useState<LibraryBrowserTabId>(() =>
    defaultTabForLoadableKinds(loadableKinds),
  );
  const [activeSubtype, setActiveSubtype] = useState<LibraryBrowserSubtypeId>(() => {
    const folder = defaultTabForLoadableKinds(loadableKinds);
    const subtypes = subtypesForFolder(folder);
    return subtypes ? defaultSubtypeForLoadableKinds(folder, subtypes) : 'all';
  });
  const [actionBusy, setActionBusy] = useState(false);

  const isBusy = editorBusy || isStreaming || isRefreshing || actionBusy;

  const tabKinds = useMemo(() => kindsForTab(activeTab), [activeTab]);
  const listKind = listKindForTab(activeTab);
  const subtypeTabs = useMemo(() => subtypesForFolder(activeTab), [activeTab]);
  const showKindLabels = activeTab === 'all';

  const tabItems = useMemo(
    () => LIBRARY_BROWSER_TABS.map(({ id, label }) => ({ id, label })),
    [],
  );

  useEffect(() => {
    const subtypes = subtypesForFolder(activeTab);
    if (!subtypes) {
      setActiveSubtype('all');
      return;
    }
    setActiveSubtype(defaultSubtypeForLoadableKinds(activeTab, subtypes));
  }, [activeTab]);

  const filteredItems = useMemo(() => {
    let next = items;
    if (tabKinds !== null) {
      const allowed = new Set(tabKinds);
      next = next.filter((item) => allowed.has(item.kind));
    }
    if (subtypeTabs) {
      const subtype = subtypeTabs.find((tab) => tab.id === activeSubtype);
      if (
        subtype &&
        (subtype.kind != null || subtype.docSubtype != null)
      ) {
        next = next.filter((item) => itemMatchesSubtypeTab(item, subtype));
      }
    }
    return next;
  }, [activeSubtype, items, subtypeTabs, tabKinds]);

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

  const chromeKey = `${activeTab}:${activeSubtype}`;

  return (
    <LibrarySidebar
      kind={listKind}
      items={filteredItems}
      selectedId={selectedId}
      selectedKind={selectedKind}
      activePromptId={activePromptId}
      storageReady={storageReady}
      isBusy={isBusy}
      chromeKey={chromeKey}
      showKindLabels={showKindLabels}
      headerActions={headerActions}
      sortSelectClassName={styles.sortSelect}
      searchInputClassName={styles.searchInput}
      header={
        <Tabs
          items={tabItems}
          value={activeTab}
          disabled={isBusy}
          idPrefix="library-folder"
          aria-label="Library folders"
          onChange={(id) => setActiveTab(id as LibraryBrowserTabId)}
        />
      }
      subHeader={
        subtypeTabs
          ? ({ sortSelect, searchInput }) => (
              <SubSubHeader tabsLabel={subtypeTabsLabel(activeTab)}>
                <div className={styles.subSubHeaderControls}>
                  {subtypeTabs.length > 1 ? (
                    <DropdownSelect
                      className={styles.subtypeSelect}
                      aria-label={subtypeTabsLabel(activeTab)}
                      icon="tag"
                      options={subtypeTabs.map(({ id, label }) => ({ value: id, label }))}
                      value={activeSubtype}
                      disabled={isBusy}
                      onChange={setActiveSubtype}
                    />
                  ) : null}
                  {sortSelect}
                  {searchInput}
                </div>
              </SubSubHeader>
            )
          : undefined
      }
      onSelect={handleSelect}
      onActivateType={handleActivateType}
      onToggleFavorite={handleToggleFavorite}
      onDelete={handleDelete}
    />
  );
}
