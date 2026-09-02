import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { createId } from './store/slices/threadSlice';
import { useAppSelector } from './store/hooks';
import { selectSelectedSessionId } from './store/slices/sessionsSlice';
import { ChatView } from './views/ChatView/ChatView';
import { CharacterSheetView } from './views/CharacterSheetView/CharacterSheetView';
import { ConfigView } from './views/ConfigView/ConfigView';
import { PromptsView } from './views/PromptsView/PromptsView';

function RootRedirect() {
  const selectedId = useAppSelector(selectSelectedSessionId);
  const id = selectedId ?? createId();
  return <Navigate to={`/session/${id}`} replace />;
}

function SessionRoute() {
  const { sessionId } = useParams<{ sessionId: string }>();
  if (!sessionId?.trim()) {
    return <Navigate to="/" replace />;
  }
  return <ChatView sessionId={sessionId} />;
}

function CharacterRoute() {
  const { sessionId } = useParams<{ sessionId: string }>();
  if (!sessionId?.trim()) {
    return <Navigate to="/" replace />;
  }
  return <CharacterSheetView sessionId={sessionId} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/session/:sessionId" element={<SessionRoute />} />
      <Route path="/character/:sessionId" element={<CharacterRoute />} />
      <Route path="/prompts" element={<PromptsView />} />
      <Route path="/config" element={<ConfigView />} />
    </Routes>
  );
}
