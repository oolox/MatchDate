import { useCallback, useState } from 'react';
import {
  hasStoredColumnSplitWidth,
  readColumnSplitWidth,
  writeColumnSplitWidth,
  type ColumnSplitWidthOptions,
} from './columnSplitWidth';

export function useColumnSplitWidth(
  options: ColumnSplitWidthOptions,
  defaultRatio?: number,
) {
  const [widthPx, setWidthPxState] = useState(() => readColumnSplitWidth(options));

  const setWidth = useCallback(
    (nextWidthPx: number, containerWidthPx?: number) => {
      const written = writeColumnSplitWidth(nextWidthPx, containerWidthPx, options);
      setWidthPxState(written);
    },
    [options],
  );

  const syncFromContainer = useCallback(
    (containerWidthPx: number, currentWidthPx: number) => {
      if (
        defaultRatio != null &&
        containerWidthPx > 0 &&
        !hasStoredColumnSplitWidth(options.storageKey)
      ) {
        setWidth(Math.round(containerWidthPx * defaultRatio), containerWidthPx);
        return;
      }
      setWidth(currentWidthPx, containerWidthPx);
    },
    [defaultRatio, options.storageKey, setWidth],
  );

  return [widthPx, setWidth, syncFromContainer] as const;
}
