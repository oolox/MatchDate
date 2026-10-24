import { useEffect, useState } from 'react';
import type { AppMainNavId } from '../AppMainNav/mainNavConfig';

/**
 * Mount a section on first visit, then keep it forever for context retention.
 */
export function useVisitedSections(active: AppMainNavId): ReadonlySet<AppMainNavId> {
  const [visited, setVisited] = useState<ReadonlySet<AppMainNavId>>(() => new Set([active]));

  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(active)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(active);
      return next;
    });
  }, [active]);

  return visited;
}
