export function createId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function truncateTitle(text: string, maxLength = 48): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed || 'New chat';
  }
  return `${trimmed.slice(0, maxLength)}…`;
}
