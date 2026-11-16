type CharacterThumb = {
  url: string | null;
  imageId: string | null;
  width?: number;
  height?: number;
  /** Library epoch this entry was checked against. */
  epoch: number;
};

type AssetThumb = {
  url: string;
};

const characterThumbs = new Map<string, CharacterThumb>();
const characterInflight = new Map<string, Promise<CharacterThumb | null>>();
const assetThumbs = new Map<string, AssetThumb>();
const assetInflight = new Map<string, Promise<string | null>>();

export function peekCharacterThumb(characterId: string): CharacterThumb | null {
  return characterThumbs.get(characterId) ?? null;
}

export function peekAssetThumb(assetId: string): string | null {
  return assetThumbs.get(assetId)?.url ?? null;
}

/** Drop cached URLs. Tests only. */
export function resetImageThumbCache(): void {
  for (const entry of characterThumbs.values()) {
    if (entry.url) {
      URL.revokeObjectURL(entry.url);
    }
  }
  for (const entry of assetThumbs.values()) {
    URL.revokeObjectURL(entry.url);
  }
  characterThumbs.clear();
  characterInflight.clear();
  assetThumbs.clear();
  assetInflight.clear();
}

/**
 * One in-flight load per character and library epoch.
 * A later epoch reuses the object URL when the portrait id is unchanged.
 */
export function loadCharacterThumb(
  characterId: string,
  epoch: number,
  loadCharacterDoc: () => Promise<{ images?: Array<{ id: string; metadata?: { width?: number; height?: number } }> }>,
  loadImageBlob: (imageId: string) => Promise<Blob>,
): Promise<CharacterThumb | null> {
  const hit = characterThumbs.get(characterId);
  if (hit && hit.epoch === epoch) {
    return Promise.resolve(hit);
  }

  const flightKey = `${characterId}:${epoch}`;
  const pending = characterInflight.get(flightKey);
  if (pending) {
    return pending;
  }

  const promise = (async (): Promise<CharacterThumb | null> => {
    const character = await loadCharacterDoc();
    const newer = characterThumbs.get(characterId);
    if (newer && newer.epoch > epoch) {
      return newer;
    }
    const image = character.images?.[0] ?? null;
    const previous = characterThumbs.get(characterId);
    if (!image) {
      const entry: CharacterThumb = {
        url: null,
        imageId: null,
        epoch,
      };
      if (previous?.url) {
        URL.revokeObjectURL(previous.url);
      }
      characterThumbs.set(characterId, entry);
      return entry;
    }

    if (previous?.imageId === image.id && previous.url) {
      const entry: CharacterThumb = { ...previous, epoch };
      characterThumbs.set(characterId, entry);
      return entry;
    }

    const blob = await loadImageBlob(image.id);
    if (previous?.url) {
      URL.revokeObjectURL(previous.url);
    }
    const entry: CharacterThumb = {
      url: URL.createObjectURL(blob),
      imageId: image.id,
      width: image.metadata?.width,
      height: image.metadata?.height,
      epoch,
    };
    characterThumbs.set(characterId, entry);
    return entry;
  })()
    .catch(() => null)
    .finally(() => {
      characterInflight.delete(flightKey);
    });

  characterInflight.set(flightKey, promise);
  return promise;
}

/** One in-flight load per asset. Later callers reuse the same object URL. */
export function loadAssetThumb(
  assetId: string,
  loadImageBlob: (assetId: string) => Promise<Blob>,
): Promise<string | null> {
  const hit = assetThumbs.get(assetId);
  if (hit) {
    return Promise.resolve(hit.url);
  }
  const pending = assetInflight.get(assetId);
  if (pending) {
    return pending;
  }

  const promise = (async (): Promise<string | null> => {
    const blob = await loadImageBlob(assetId);
    const existing = assetThumbs.get(assetId);
    if (existing) {
      return existing.url;
    }
    const url = URL.createObjectURL(blob);
    assetThumbs.set(assetId, { url });
    return url;
  })()
    .catch(() => null)
    .finally(() => {
      assetInflight.delete(assetId);
    });

  assetInflight.set(assetId, promise);
  return promise;
}
