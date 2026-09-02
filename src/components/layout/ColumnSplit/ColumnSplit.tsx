import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { LOCAL_STORAGE_KEYS } from '../../../services/localStorage';
import { clampColumnSplitWidth, type ColumnSplitWidthOptions } from './columnSplitWidth';
import {
  LIBRARY_SIDEBAR_DEFAULT_WIDTH_PX,
  LIBRARY_SIDEBAR_EDGE_RATIO,
  LIBRARY_SIDEBAR_MIN_WIDTH_PX,
} from './librarySidebarWidth';
import { useColumnSplitWidth } from './useColumnSplitWidth';
import styles from './ColumnSplit.module.css';

export interface ColumnSplitProps {
  left: ReactNode;
  right: ReactNode;
  'aria-label'?: string;
  sizedPane?: 'left' | 'right';
  storageKey?: string;
  defaultWidthPx?: number;
  defaultRatio?: number;
  minWidthPx?: number;
  edgeRatio?: number;
}

export function ColumnSplit({
  left,
  right,
  'aria-label': ariaLabel = 'Resize columns',
  sizedPane = 'right',
  storageKey = LOCAL_STORAGE_KEYS.librarySidebarWidthPx,
  defaultWidthPx = LIBRARY_SIDEBAR_DEFAULT_WIDTH_PX,
  defaultRatio,
  minWidthPx = LIBRARY_SIDEBAR_MIN_WIDTH_PX,
  edgeRatio = LIBRARY_SIDEBAR_EDGE_RATIO,
}: ColumnSplitProps) {
  const widthOptions = useMemo<ColumnSplitWidthOptions>(
    () => ({
      storageKey,
      defaultWidthPx,
      minWidthPx,
      edgeRatio,
    }),
    [storageKey, defaultWidthPx, minWidthPx, edgeRatio],
  );

  const [widthPx, setWidthPx, syncFromContainer] = useColumnSplitWidth(
    widthOptions,
    defaultRatio,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidthPx, setContainerWidthPx] = useState(0);
  const splitRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(widthPx);
  const syncFromContainerRef = useRef(syncFromContainer);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  widthRef.current = widthPx;
  syncFromContainerRef.current = syncFromContainer;

  useEffect(() => {
    const node = splitRef.current;
    if (!node) {
      return;
    }

    const syncContainerWidth = (nextWidth: number) => {
      setContainerWidthPx(nextWidth);
      syncFromContainerRef.current(nextWidth, widthRef.current);
    };

    syncContainerWidth(node.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      syncContainerWidth(entry.contentRect.width);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragRef.current = { startX: event.clientX, startWidth: widthPx };
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [widthPx],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) {
        return;
      }
      const containerWidth = splitRef.current?.getBoundingClientRect().width ?? containerWidthPx;
      const delta =
        sizedPane === 'left'
          ? event.clientX - dragRef.current.startX
          : dragRef.current.startX - event.clientX;
      setWidthPx(dragRef.current.startWidth + delta, containerWidth);
    },
    [containerWidthPx, setWidthPx, sizedPane],
  );

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) {
      return;
    }
    dragRef.current = null;
    setIsDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const minValuePx =
    containerWidthPx > 0
      ? Math.min(
          Math.max(minWidthPx, Math.round(containerWidthPx * edgeRatio)),
          Math.round(containerWidthPx * (1 - edgeRatio)),
        )
      : minWidthPx;
  const maxValuePx =
    containerWidthPx > 0
      ? Math.round(containerWidthPx * (1 - edgeRatio))
      : undefined;
  const displayWidthPx = clampColumnSplitWidth(
    widthPx,
    containerWidthPx || undefined,
    widthOptions,
  );
  const sizedStyle = {
    width: `${displayWidthPx}px`,
    flex: `0 0 ${displayWidthPx}px`,
  };

  return (
    <div
      ref={splitRef}
      className={[styles.split, isDragging ? styles.dragging : ''].filter(Boolean).join(' ')}
    >
      <div className={styles.left} style={sizedPane === 'left' ? sizedStyle : undefined}>
        {left}
      </div>
      <div
        className={styles.handle}
        role="separator"
        aria-orientation="vertical"
        aria-label={ariaLabel}
        aria-valuemin={minValuePx}
        aria-valuemax={maxValuePx}
        aria-valuenow={displayWidthPx}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <div className={styles.right} style={sizedPane === 'right' ? sizedStyle : undefined}>
        {right}
      </div>
    </div>
  );
}
