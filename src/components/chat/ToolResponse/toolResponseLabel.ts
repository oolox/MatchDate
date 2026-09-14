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
      return complete ? 'Created' : 'Creating';
    case 'write':
      return complete ? 'Written' : 'Writing';
    case 'read':
      return complete ? 'Read' : 'Reading';
    case 'update':
    default:
      return complete ? 'Updated' : 'Updating';
  }
}

/** Streaming: "Updating Name" / Complete: "Updated Name" */
export function formatToolResponseLabel(options: {
  action?: string;
  name?: string;
  id?: string;
  complete: boolean;
}): string {
  const verb = toolActionVerb(options.action, options.complete);
  const display = toolDisplayName(options.name, options.id);
  return `${verb} ${display}`;
}
