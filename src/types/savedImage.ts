/**
 * Image metadata snapshot at save time.
 * Keep host fields light vs LuxNova — extend when character / generation needs them.
 */
export interface SavedImageMetadata {
  visual?: string;
  originalName?: string;
  /** Pixel width at save time (optional). */
  width?: number;
  /** Pixel height at save time (optional). */
  height?: number;
}

/** Saved image ref in OPFS; `metadata` is host-defined snapshot at save time. */
export interface SavedImageRef {
  id: string;
  fileName: string;
  path: string;
  createdAt: string;
  metadata?: SavedImageMetadata;
}

export function normalizeSavedImageMetadata(
  metadata?: SavedImageMetadata | null,
): SavedImageMetadata | undefined {
  if (!metadata) {
    return undefined;
  }
  const next: SavedImageMetadata = {};
  const visual = metadata.visual?.trim();
  const originalName = metadata.originalName?.trim();
  if (visual) {
    next.visual = visual;
  }
  if (originalName) {
    next.originalName = originalName;
  }
  if (typeof metadata.width === 'number' && Number.isFinite(metadata.width) && metadata.width > 0) {
    next.width = Math.round(metadata.width);
  }
  if (
    typeof metadata.height === 'number' &&
    Number.isFinite(metadata.height) &&
    metadata.height > 0
  ) {
    next.height = Math.round(metadata.height);
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function isSavedImageRef(value: unknown): value is SavedImageRef {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const ref = value as Partial<SavedImageRef>;
  return (
    typeof ref.id === 'string' &&
    ref.id.trim().length > 0 &&
    typeof ref.fileName === 'string' &&
    typeof ref.path === 'string' &&
    typeof ref.createdAt === 'string'
  );
}

/** Keep valid image refs; drops malformed entries. */
export function normalizeSavedImageRefs(images: unknown): SavedImageRef[] {
  if (!Array.isArray(images) || images.length === 0) {
    return [];
  }
  const normalized: SavedImageRef[] = [];
  const seen = new Set<string>();
  for (const image of images) {
    if (!isSavedImageRef(image)) {
      continue;
    }
    const id = image.id.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    const metadata = normalizeSavedImageMetadata(image.metadata);
    normalized.push({
      id,
      fileName: image.fileName,
      path: image.path,
      createdAt: image.createdAt,
      ...(metadata ? { metadata } : {}),
    });
  }
  return normalized;
}
