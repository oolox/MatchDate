import { describe, expect, it } from 'vitest';
import { appMainNavIdFromPath } from './mainNavConfig';

describe('appMainNavIdFromPath', () => {
  it('maps chat, character, prompts, and config routes', () => {
    expect(appMainNavIdFromPath('/')).toBe('chat');
    expect(appMainNavIdFromPath('/session/abc')).toBe('chat');
    expect(appMainNavIdFromPath('/character/abc')).toBe('character');
    expect(appMainNavIdFromPath('/prompts')).toBe('prompts');
    expect(appMainNavIdFromPath('/prompts?load=writer')).toBe('prompts');
    expect(appMainNavIdFromPath('/config')).toBe('config');
  });
});
