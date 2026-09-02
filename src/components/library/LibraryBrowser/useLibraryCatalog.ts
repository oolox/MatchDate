import { useCallback, useEffect, useState } from 'react';
import { useNotification } from '../../notification/Notification/useNotification';
import { listLibrary } from '../../../services/storage/persistenceService';
import type { LibraryItemMeta } from '../../../services/storage/types';
import { formatFailure } from '../../../utils/formatFailure';

export function useLibraryCatalog(catalogEpoch = 0) {
  const { notify } = useNotification();
  const [items, setItems] = useState<LibraryItemMeta[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const next = await listLibrary();
      setItems(next);
      setStorageReady(true);
    } catch (error) {
      notify(formatFailure('refresh library catalog', undefined, error));
    } finally {
      setIsRefreshing(false);
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
  }, [refresh, catalogEpoch]);

  return { items, storageReady, isRefreshing, refresh, setItemFavorite };
}
