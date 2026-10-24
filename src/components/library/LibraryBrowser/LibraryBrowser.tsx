import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropdownSelect } from '../../ui/DropdownSelect';
import { Tabs } from '../../ui/Tabs';
import { SubSubHeader } from '../../ui/SubSubHeader';
import { useNotification } from '../../notification/Notification/useNotification';
import type { LibraryItemKind, LibraryItemMeta } from '../../../services/storage/types';
import {
  normalizeCharacterIdentity,
  type CharacterIdentity,
} from '../../../types/character';
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
import {
  duplicateCharacter,
  setActivePrompt,
} from '../../../services/storage/persistenceService';
import { formatFailure } from '../../../utils/formatFailure';
import { LibrarySidebar } from '../LibraryList/LibrarySidebar';
import {
  confirmAndDeleteLibraryItem,
  toggleLibraryItemFavoriteSafe,
} from './libraryBrowserActions';
import {
  ALL_CHARACTER_IDENTITIES,
  LibraryIdentityFilter,
} from './LibraryIdentityFilter';
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
  /** When set, preferred subtype tab if present for the default folder (e.g. `voice`). */
  preferredSubtype?: LibraryBrowserSubtypeId;
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

function initialSubtype(
  loadableKinds: LibraryItemKind[],
  preferredSubtype?: LibraryBrowserSubtypeId,
): LibraryBrowserSubtypeId {
  const folder = defaultTabForLoadableKinds(loadableKinds);
  const subtypes = subtypesForFolder(folder);
  if (
    preferredSubtype &&
    subtypes?.some((tab) => tab.id === preferredSubtype)
  ) {
    return preferredSubtype;
  }
  return subtypes ? defaultSubtypeForLoadableKinds(folder, subtypes) : 'all';
}

export function LibraryBrowser({
  loadableKinds,
  preferredSubtype,
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
  const [activeSubtype, setActiveSubtype] = useState<LibraryBrowserSubtypeId>(() =>
    initialSubtype(loadableKinds, preferredSubtype),
  );
  const [actionBusy, setActionBusy] = useState(false);
  const [identityFilter, setIdentityFilter] = useState<CharacterIdentity[]>(() => [
    ...ALL_CHARACTER_IDENTITIES,
  ]);

  const isBusy = editorBusy || isStreaming || isRefreshing || actionBusy;

  const tabKinds = useMemo(() => kindsForTab(activeTab), [activeTab]);
  const listKind = listKindForTab(activeTab);
  const subtypeTabs = useMemo(() => subtypesForFolder(activeTab), [activeTab]);
  const showIdentityFilter = activeTab === 'characters';

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
    if (
      preferredSubtype &&
      activeTab === 'assets' &&
      subtypes.some((tab) => tab.id === preferredSubtype)
    ) {
      setActiveSubtype(preferredSubtype);
      return;
    }
    setActiveSubtype(defaultSubtypeForLoadableKinds(activeTab, subtypes));
  }, [activeTab, preferredSubtype]);

  const filteredItems = useMemo(() => {
    const allowed = new Set(tabKinds);
    let next = items.filter((item) => allowed.has(item.kind));
    if (subtypeTabs) {
      const subtype = subtypeTabs.find((tab) => tab.id === activeSubtype);
      if (
        subtype &&
        (subtype.kind != null || subtype.docSubtype != null)
      ) {
        next = next.filter((item) => itemMatchesSubtypeTab(item, subtype));
      }
    }
    if (showIdentityFilter) {
      const allowedIdentities = new Set(identityFilter);
      next = next.filter((item) => {
        if (item.kind !== 'character') {
          return true;
        }
        return allowedIdentities.has(normalizeCharacterIdentity(item.identity));
      });
    }
    return next;
  }, [activeSubtype, identityFilter, items, showIdentityFilter, subtypeTabs, tabKinds]);

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

  const handleCopy = useCallback(
    async (item: LibraryItemMeta) => {
      if (isBusy || item.kind !== 'character') {
        return;
      }
      setActionBusy(true);
      try {
        const saved = await duplicateCharacter(item.id);
        dispatch(bumpLibraryEpoch());
        onCatalogMutated?.();
        notify(`Copied as ${saved.name}`);
      } catch (error) {
        notify(formatFailure('copy character', item.name, error));
      } finally {
        setActionBusy(false);
      }
    },
    [dispatch, isBusy, notify, onCatalogMutated],
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
                  {showIdentityFilter ? (
                    <LibraryIdentityFilter
                      className={styles.identityFilter}
                      value={identityFilter}
                      disabled={isBusy}
                      onChange={setIdentityFilter}
                    />
                  ) : null}
                </div>
              </SubSubHeader>
            )
          : undefined
      }
      onSelect={handleSelect}
      onActivateType={handleActivateType}
      onToggleFavorite={handleToggleFavorite}
      onCopy={handleCopy}
      onDelete={handleDelete}
    />
  );
}
