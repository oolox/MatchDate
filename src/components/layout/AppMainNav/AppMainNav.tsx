import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs } from '../../ui/Tabs';
import { createId } from '../../../store/slices/threadSlice';
import { useAppSelector } from '../../../store/hooks';
import { selectCharacterEditorId } from '../../../store/slices/characterSlice';
import { selectSelectedSessionId } from '../../../store/slices/sessionsSlice';
import { APP_MAIN_NAV_ITEMS, appMainNavIdFromPath, type AppMainNavId } from './mainNavConfig';

export function AppMainNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const selectedSessionId = useAppSelector(selectSelectedSessionId);
  const characterEditorId = useAppSelector(selectCharacterEditorId);
  const activeId = appMainNavIdFromPath(pathname);

  const handleChange = useCallback(
    (id: string) => {
      const next = id as AppMainNavId;
      if (next === 'chat') {
        navigate(`/session/${selectedSessionId ?? createId()}`);
        return;
      }
      if (next === 'character') {
        navigate(characterEditorId ? `/character/${characterEditorId}` : '/character');
        return;
      }
      if (next === 'prompts') {
        navigate('/prompts');
        return;
      }
      if (next === 'config') {
        navigate('/config');
      }
    },
    [characterEditorId, navigate, selectedSessionId],
  );

  return (
    <Tabs
      items={[...APP_MAIN_NAV_ITEMS]}
      value={activeId}
      idPrefix="app-main"
      aria-label="Main sections"
      onChange={handleChange}
    />
  );
}
