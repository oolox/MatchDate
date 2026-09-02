import type { NavigateFunction } from 'react-router-dom';
import { loadSessionDocument, setActiveSession } from '../../services/storage/persistenceService';
import type { LibraryItemKind, LibraryItemMeta } from '../../services/storage/types';
import type { AppDispatch } from '../../store';
import { markSessionSaved, setSelectedSessionId } from '../../store/slices/sessionsSlice';
import { sessionToThread } from '../../types/session';
import { loadThread } from '../../store/slices/threadSlice';

export type GeneratorLibraryKind = 'session';

export const GENERATOR_LOADABLE_KINDS: GeneratorLibraryKind[] = ['session'];

export function isGeneratorLibraryKind(
  kind: LibraryItemKind,
): kind is GeneratorLibraryKind {
  return kind === 'session';
}

export function sessionPathForId(id: string): string {
  return `/session/${id}`;
}

export function pathForGeneratorLoad(item: LibraryItemMeta): string | null {
  if (!isGeneratorLibraryKind(item.kind)) {
    return null;
  }
  return sessionPathForId(item.id);
}

export function pathForPromptLoad(item: LibraryItemMeta): string | null {
  if (item.kind !== 'prompt') {
    return null;
  }
  return `/prompts?load=${encodeURIComponent(item.id)}`;
}

export async function loadSessionIntoApp(options: {
  sessionId: string;
  dispatch: AppDispatch;
  navigate: NavigateFunction;
}): Promise<void> {
  const { sessionId, dispatch, navigate } = options;
  const { session } = await loadSessionDocument(sessionId);
  await setActiveSession(sessionId);
  dispatch(loadThread(sessionToThread(session)));
  dispatch(setSelectedSessionId(sessionId));
  dispatch(markSessionSaved({ id: sessionId, updatedAt: session.updatedAt }));
  navigate(sessionPathForId(sessionId));
}
