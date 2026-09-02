import { deleteAsset, deleteCharacter, deletePreset, deleteSession, toggleFavorite } from '../../../services/storage/persistenceService';
import type { LibraryItemMeta } from '../../../services/storage/types';
import { formatFailure } from '../../../utils/formatFailure';

export async function deleteLibraryItem(item: LibraryItemMeta): Promise<void> {
  switch (item.kind) {
    case 'prompt':
      await deletePreset(item.id);
      return;
    case 'session':
      await deleteSession(item.id);
      return;
    case 'asset':
      await deleteAsset(item.id);
      return;
    case 'character':
      await deleteCharacter(item.id);
      return;
    default:
      throw new Error(`Unsupported library kind: ${item.kind}`);
  }
}

export async function toggleLibraryItemFavorite(item: LibraryItemMeta): Promise<void> {
  await toggleFavorite(item.kind, item.id);
}

export async function confirmAndDeleteLibraryItem(
  item: LibraryItemMeta,
  notify: (message: string) => void,
): Promise<boolean> {
  if (item.kind !== 'asset' && !window.confirm(`Delete "${item.name}"? This cannot be undone.`)) {
    return false;
  }
  try {
    await deleteLibraryItem(item);
    return true;
  } catch (error) {
    notify(formatFailure('delete', item.name, error));
    return false;
  }
}

export async function toggleLibraryItemFavoriteSafe(
  item: LibraryItemMeta,
  notify: (message: string) => void,
): Promise<boolean> {
  try {
    await toggleLibraryItemFavorite(item);
    return true;
  } catch (error) {
    notify(formatFailure('update favorite for', item.name, error));
    return false;
  }
}
