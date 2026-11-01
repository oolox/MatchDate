import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectSelectedSessionId } from '../../store/slices/sessionsSlice';
import { setCharacterReturnChatPath } from '../../store/slices/characterSlice';
import { flushCharacterEditorIfNeeded } from './characterEditorFlush';

function chatPathFromLocation(
  pathname: string,
  selectedSessionId: string | null,
): string | null {
  if (pathname.startsWith('/session/') || pathname === '/session') {
    return pathname === '/session' && selectedSessionId
      ? `/session/${selectedSessionId}`
      : pathname;
  }
  if (selectedSessionId?.trim()) {
    return `/session/${selectedSessionId.trim()}`;
  }
  return null;
}

/** Open a character from chat tool chrome; stores return path and saves dirty sheet first. */
export function useOpenCharacterFromChat() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dispatch = useAppDispatch();
  const selectedSessionId = useAppSelector(selectSelectedSessionId);

  return useCallback(
    async (characterId: string) => {
      const id = characterId.trim();
      if (!id) {
        return;
      }
      const chatPath = chatPathFromLocation(pathname, selectedSessionId);
      if (chatPath) {
        dispatch(setCharacterReturnChatPath(chatPath));
      }
      const ok = await flushCharacterEditorIfNeeded();
      if (!ok) {
        return;
      }
      navigate(`/character/${id}`);
    },
    [dispatch, navigate, pathname, selectedSessionId],
  );
}
