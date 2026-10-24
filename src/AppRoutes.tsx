import { useRef } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  SectionKeepAlive,
  SectionWorkspace,
  characterIdFromPath,
  isKnownAppPath,
  sessionIdFromPath,
  useVisitedSections,
} from './components/layout/SectionKeepAlive';
import { appMainNavIdFromPath } from './components/layout/AppMainNav/mainNavConfig';
import { useAppSelector } from './store/hooks';
import { selectCharacterEditorId } from './store/slices/characterSlice';
import { selectSelectedSessionId } from './store/slices/sessionsSlice';
import { createId } from './store/slices/threadSlice';
import { ChatView } from './views/ChatView/ChatView';
import { CharacterSheetView } from './views/CharacterSheetView/CharacterSheetView';
import { ConfigView } from './views/ConfigView/ConfigView';
import { PromptsView } from './views/PromptsView/PromptsView';

function RootRedirect() {
  const selectedId = useAppSelector(selectSelectedSessionId);
  const id = selectedId ?? createId();
  return <Navigate to={`/session/${id}`} replace />;
}

function VoiceRedirect() {
  const characterEditorId = useAppSelector(selectCharacterEditorId);
  return (
    <Navigate
      to={characterEditorId ? `/character/${characterEditorId}` : '/character'}
      replace
    />
  );
}

/**
 * Keeps each main nav section mounted after first visit so editor/chat
 * context survives tab switches.
 */
function AppWorkspace() {
  const { pathname } = useLocation();
  const selectedSessionId = useAppSelector(selectSelectedSessionId);
  const fallbackSessionId = useRef(createId()).current;
  const section = appMainNavIdFromPath(pathname);
  const visited = useVisitedSections(section);
  const pathSessionId = sessionIdFromPath(pathname);
  const chatSessionId = pathSessionId ?? selectedSessionId ?? fallbackSessionId;
  const characterId = characterIdFromPath(pathname);

  if (pathname === '/voice' || pathname.startsWith('/voice/')) {
    return <VoiceRedirect />;
  }

  if (!isKnownAppPath(pathname)) {
    return <Navigate to="/" replace />;
  }

  return (
    <SectionWorkspace>
      {visited.has('chat') ? (
        <SectionKeepAlive active={section === 'chat'} label="Chat">
          <ChatView sessionId={chatSessionId} />
        </SectionKeepAlive>
      ) : null}
      {visited.has('character') ? (
        <SectionKeepAlive active={section === 'character'} label="Character">
          <CharacterSheetView characterId={characterId} />
        </SectionKeepAlive>
      ) : null}
      {visited.has('prompts') ? (
        <SectionKeepAlive active={section === 'prompts'} label="Prompts">
          <PromptsView />
        </SectionKeepAlive>
      ) : null}
      {visited.has('config') ? (
        <SectionKeepAlive active={section === 'config'} label="Config">
          <ConfigView />
        </SectionKeepAlive>
      ) : null}
    </SectionWorkspace>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<AppWorkspace />} />
    </Routes>
  );
}
