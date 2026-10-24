/** Session id from `/session/:sessionId`, else null. */
export function sessionIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/session\/([^/?#]+)/);
  const id = match?.[1]?.trim();
  return id || null;
}

/** Character id from `/character/:characterId`, else null (`/character` → null). */
export function characterIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/character\/([^/?#]+)/);
  const id = match?.[1]?.trim();
  return id || null;
}

export function isKnownAppPath(pathname: string): boolean {
  return (
    pathname.startsWith('/session/') ||
    pathname === '/character' ||
    pathname.startsWith('/character/') ||
    pathname === '/prompts' ||
    pathname.startsWith('/prompts/') ||
    pathname === '/config' ||
    pathname.startsWith('/config/')
  );
}
