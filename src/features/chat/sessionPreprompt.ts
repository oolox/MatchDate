import {
  DEFAULT_PREPROMPT_ASSET_NAME,
  PREPROMPT_NONE_VALUE,
} from '../../services/localStorage';

export { DEFAULT_PREPROMPT_ASSET_NAME, PREPROMPT_NONE_VALUE };

export function isDefaultPrepromptAssetName(name: string): boolean {
  const normalized = name.trim().toLowerCase();
  return (
    normalized === DEFAULT_PREPROMPT_ASSET_NAME.toLowerCase() ||
    normalized === 'md-valuemodel'
  );
}

/** Find the default MD-ValueModel text asset id, if present in the library. */
export function findDefaultPrepromptAssetId(
  texts: ReadonlyArray<{ id: string; name: string }>,
): string | null {
  return texts.find((item) => isDefaultPrepromptAssetName(item.name))?.id ?? null;
}

/**
 * Resolve the dropdown / effective preprompt id.
 * - stored `none` → none
 * - stored id → that id (even before the library list has loaded)
 * - stored id missing after list loads → MD-ValueModel.md if available, else none
 * - unset → MD-ValueModel.md if available, else none
 */
export function resolvePrepromptSelectValue(
  stored: string | null,
  texts: ReadonlyArray<{ id: string; name: string }>,
): string {
  if (stored === PREPROMPT_NONE_VALUE) {
    return PREPROMPT_NONE_VALUE;
  }
  if (stored) {
    if (texts.length === 0 || texts.some((item) => item.id === stored)) {
      return stored;
    }
    return findDefaultPrepromptAssetId(texts) ?? PREPROMPT_NONE_VALUE;
  }
  return findDefaultPrepromptAssetId(texts) ?? PREPROMPT_NONE_VALUE;
}

export function prepromptSelectOptions(
  texts: ReadonlyArray<{ id: string; name: string }>,
  selectedId?: string | null,
): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [
    { value: PREPROMPT_NONE_VALUE, label: 'None' },
    ...texts.map((item) => ({ value: item.id, label: item.name })),
  ];
  if (
    selectedId &&
    selectedId !== PREPROMPT_NONE_VALUE &&
    !texts.some((item) => item.id === selectedId)
  ) {
    options.push({ value: selectedId, label: 'Selected text' });
  }
  return options;
}
