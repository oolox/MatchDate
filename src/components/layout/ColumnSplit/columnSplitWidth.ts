import {
  hasLocalStorageItem,
  readPositiveWidthPx,
  writePositiveWidthPx,
} from '../../../services/localStorage';

export interface ColumnSplitWidthOptions {
  storageKey: string;
  defaultWidthPx: number;
  minWidthPx: number;
  edgeRatio: number;
}

export function clampColumnSplitWidth(
  widthPx: number,
  containerWidthPx: number | undefined,
  { minWidthPx, edgeRatio }: Pick<ColumnSplitWidthOptions, 'minWidthPx' | 'edgeRatio'>,
): number {
  const rounded = Math.round(widthPx);

  if (!containerWidthPx || containerWidthPx <= 0) {
    return Math.max(minWidthPx, rounded);
  }

  const ratioMin = Math.round(containerWidthPx * edgeRatio);
  const ratioMax = Math.round(containerWidthPx * (1 - edgeRatio));
  const min = Math.min(Math.max(minWidthPx, ratioMin), ratioMax);
  const max = Math.max(min, ratioMax);
  return Math.min(max, Math.max(min, rounded));
}

export function readColumnSplitWidth({
  storageKey,
  defaultWidthPx,
}: Pick<ColumnSplitWidthOptions, 'storageKey' | 'defaultWidthPx'>): number {
  return readPositiveWidthPx(storageKey, defaultWidthPx);
}

export function hasStoredColumnSplitWidth(storageKey: string): boolean {
  return hasLocalStorageItem(storageKey);
}

export function writeColumnSplitWidth(
  widthPx: number,
  containerWidthPx: number | undefined,
  options: ColumnSplitWidthOptions,
): number {
  const next = clampColumnSplitWidth(widthPx, containerWidthPx, options);
  return writePositiveWidthPx(options.storageKey, next, options.defaultWidthPx);
}
