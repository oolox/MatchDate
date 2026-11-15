import { describe, expect, it } from 'vitest';
import { appMainNavIdFromPath } from './mainNavConfig';

describe('appMainNavIdFromPath', () => {
  it('maps chat, character, and config routes', () => {
    expect(appMainNavIdFromPath('/')).toBe('chat');
    expect(appMainNavIdFromPath('/session/abc')).toBe('chat');
    expect(appMainNavIdFromPath('/character/abc')).toBe('character');
    expect(appMainNavIdFromPath('/config')).toBe('config');
  });
});
