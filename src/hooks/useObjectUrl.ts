import { useCallback, useEffect, useRef, useState } from 'react';

/** Revoke every object URL in `urls` (safe for maps/lists of thumbs). */
export function revokeObjectUrls(urls: Iterable<string>): void {
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Owns a single object URL: replace/clear always revokes the previous URL,
 * and unmount revokes the current one.
 */
export function useObjectUrl(): {
  objectUrl: string | null;
  replace: (nextUrl: string | null) => void;
  setFromBlob: (blob: Blob) => void;
  clear: () => void;
} {
  const objectUrlRef = useRef<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const replace = useCallback((nextUrl: string | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = nextUrl;
    setObjectUrl(nextUrl);
  }, []);

  const setFromBlob = useCallback(
    (blob: Blob) => {
      replace(URL.createObjectURL(blob));
    },
    [replace],
  );

  const clear = useCallback(() => {
    replace(null);
  }, [replace]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  return { objectUrl, replace, setFromBlob, clear };
}
