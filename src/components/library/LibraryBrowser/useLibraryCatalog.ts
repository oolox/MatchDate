import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotification } from '../../notification/Notification/useNotification';
import { listLibrary } from '../../../services/storage/persistenceService';
import type { LibraryItemMeta } from '../../../services/storage/types';
import { formatFailure } from '../../../utils/formatFailure';

export function useLibraryCatalog(catalogEpoch = 0) {
  const { notify } = useNotification();
  const [items, setItems] = useState<LibraryItemMeta[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const loadSeqRef = useRef(0);

  const refresh = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setIsRefreshing(true);
    try {
      const next = await listLibrary();
      if (loadSeqRef.current !== seq) {
        return;
      }
      setItems(next);
      setStorageReady(true);
    } catch (error) {
      if (loadSeqRef.current !== seq) {
        return;
      }
      // Soft-fail when we already have a catalog: overlapping navigations / OPFS races
      // often throw without leaving the UI broken.
      if (itemsRef.current.length === 0) {
        notify(formatFailure('refresh library catalog', undefined, error));
      } else {
        console.info('Library catalog refresh failed; keeping previous items', { error });
      }
    } finally {
      if (loadSeqRef.current === seq) {
        setIsRefreshing(false);
      }
    }
  }, [notify]);

  const setItemFavorite = useCallback(
    (item: Pick<LibraryItemMeta, 'kind' | 'id'>, isFavorite: boolean) => {
      setItems((current) =>
        current.map((row) =>
          row.kind === item.kind && row.id === item.id
            ? {
                ...row,
                isFavorite,
                favoritedAt: isFavorite ? new Date().toISOString() : undefined,
              }
            : row,
        ),
      );
    },
    [],
  );

  useEffect(() => {
    void refresh();
    return () => {
      // Invalidate in-flight refresh so unmount / epoch churn cannot toast.
      loadSeqRef.current += 1;
    };
  }, [refresh, catalogEpoch]);

  return { items, storageReady, isRefreshing, refresh, setItemFavorite };
}
