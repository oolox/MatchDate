export type AppMainNavId = 'chat' | 'character' | 'voice' | 'prompts' | 'config';

export const APP_MAIN_NAV_ITEMS: ReadonlyArray<{ id: AppMainNavId; label: string }> = [
  { id: 'chat', label: 'CHAT' },
  { id: 'character', label: 'CHARACTER' },
  { id: 'voice', label: 'VOICE' },
  { id: 'prompts', label: 'PROMPTS' },
  { id: 'config', label: 'CONFIG' },
] as const;

export function appMainNavIdFromPath(pathname: string): AppMainNavId {
  if (pathname.startsWith('/character')) {
    return 'character';
  }
  if (pathname.startsWith('/voice')) {
    return 'voice';
  }
  if (pathname.startsWith('/prompts')) {
    return 'prompts';
  }
  if (pathname.startsWith('/config')) {
    return 'config';
  }
  return 'chat';
}
