export function toolDisplayName(name: string | undefined, id: string | undefined): string {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed;
  }
  const idTrimmed = id?.trim();
  if (idTrimmed && idTrimmed.length >= 8) {
    return idTrimmed.slice(-8);
  }
  return idTrimmed || 'character';
}

export function toolActionVerb(
  action: string | undefined,
  complete: boolean,
): string {
  switch (action) {
    case 'create':
      return complete ? 'CREATED' : 'CREATING';
    case 'write':
      return complete ? 'WRITTEN' : 'WRITING';
    case 'read':
      return complete ? 'READ' : 'READING';
    case 'update':
    default:
      return complete ? 'UPDATED' : 'UPDATING';
  }
}

/** Streaming: "UPDATING : Name" / Complete: "UPDATED : Name" (tests / aria helpers). */
export function formatToolResponseLabel(options: {
  action?: string;
  name?: string;
  id?: string;
  complete: boolean;
}): string {
  const verb = toolActionVerb(options.action, options.complete);
  const display = toolDisplayName(options.name, options.id);
  return `${verb} : ${display}`;
}

/** Patch counts in parens for the single-line tool chrome; omit zero counts. */
export function formatCharacterToolPatchSummary(
  traitCount: number,
  historyCount: number,
): string {
  const parts: string[] = [];
  if (traitCount > 0) {
    parts.push(traitCount === 1 ? '1 trait' : `${traitCount} traits`);
  }
  if (historyCount > 0) {
    parts.push(historyCount === 1 ? '1 history' : `${historyCount} history`);
  }
  if (parts.length === 0) {
    return '';
  }
  return `(${parts.join(',')})`;
}
