import { toggleFavorite } from '../../services/storage/persistenceService';
import type { LibraryItemKind } from '../../services/storage/types';
import { formatFailure } from '../../utils/formatFailure';

export function confirmLibraryDelete(): boolean {
  return window.confirm('Are you sure?');
}

export function createToggleFavoriteHandler(options: {
  kind: LibraryItemKind;
  refreshCatalog: () => Promise<void>;
  notify: (message: string) => void;
  setIsBusy: (busy: boolean) => void;
}) {
  const { kind, refreshCatalog, notify, setIsBusy } = options;

  return async (id: string, name: string) => {
    setIsBusy(true);
    try {
      await toggleFavorite(kind, id);
      await refreshCatalog();
      notify(`Updated favorite for ${name}`);
    } catch (error) {
      notify(formatFailure('update favorite for', name, error));
    } finally {
      setIsBusy(false);
    }
  };
}
