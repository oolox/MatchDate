import type { LibraryItemMeta } from '../storage/types';

export function searchLibraryItems(
  items: LibraryItemMeta[],
  query: string,
): LibraryItemMeta[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return items;
  }

  return items.filter((item) => item.name.toLowerCase().includes(trimmed));
}
