/** Custom MIME for reordering images already on the character sheet. */
export const CHARACTER_IMAGE_REORDER_MIME = 'application/x-matchdate-character-image-reorder';

export function dataTransferHasCharacterImageReorder(
  dataTransfer: DataTransfer | null | undefined,
): boolean {
  if (!dataTransfer) {
    return false;
  }
  return Array.from(dataTransfer.types).includes(CHARACTER_IMAGE_REORDER_MIME);
}

export function setCharacterImageReorderDragData(
  dataTransfer: DataTransfer,
  imageId: string,
): void {
  const id = imageId.trim();
  if (!id) {
    return;
  }
  dataTransfer.setData(CHARACTER_IMAGE_REORDER_MIME, id);
  dataTransfer.setData('text/plain', id);
  dataTransfer.effectAllowed = 'move';
}

export function readCharacterImageReorderDragId(
  dataTransfer: DataTransfer | null | undefined,
): string | null {
  if (!dataTransfer) {
    return null;
  }
  const id = dataTransfer.getData(CHARACTER_IMAGE_REORDER_MIME)?.trim();
  return id || null;
}

/**
 * Move `draggedId` to sit immediately before `targetId`.
 * Returns null when the order is unchanged or ids are invalid.
 */
export function reorderImagesBeforeTarget<T extends { id: string }>(
  images: readonly T[],
  draggedId: string,
  targetId: string,
): T[] | null {
  const fromId = draggedId.trim();
  const toId = targetId.trim();
  if (!fromId || !toId || fromId === toId) {
    return null;
  }
  const fromIndex = images.findIndex((image) => image.id === fromId);
  const toIndex = images.findIndex((image) => image.id === toId);
  if (fromIndex < 0 || toIndex < 0) {
    return null;
  }
  // Already immediately before target.
  if (fromIndex === toIndex - 1) {
    return null;
  }
  const next = images.filter((image) => image.id !== fromId);
  const insertAt = next.findIndex((image) => image.id === toId);
  if (insertAt < 0) {
    return null;
  }
  const dragged = images[fromIndex];
  if (!dragged) {
    return null;
  }
  next.splice(insertAt, 0, dragged);
  return next;
}
