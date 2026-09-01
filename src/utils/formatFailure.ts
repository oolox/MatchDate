export function formatFailure(
  action: string,
  subject?: string,
  error?: unknown,
): string {
  const trimmedSubject = subject?.trim();
  const base = trimmedSubject
    ? `Could not ${action} ${trimmedSubject}`
    : `Could not ${action}`;

  if (error instanceof Error) {
    const detail = error.message.trim();
    if (detail) {
      return `${base}: ${detail}`;
    }
  }

  return base;
}
