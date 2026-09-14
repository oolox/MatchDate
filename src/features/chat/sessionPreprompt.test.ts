import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREPROMPT_ASSET_NAME,
  PREPROMPT_NONE_VALUE,
  findDefaultPrepromptAssetId,
  isDefaultPrepromptAssetName,
  prepromptSelectOptions,
  resolvePrepromptSelectValue,
} from './sessionPreprompt';

describe('sessionPreprompt', () => {
  const texts = [
    { id: 't1', name: 'notes.txt' },
    { id: 'vm', name: 'MD-ValueModel.md' },
  ];

  it('detects default asset names', () => {
    expect(isDefaultPrepromptAssetName('MD-ValueModel.md')).toBe(true);
    expect(isDefaultPrepromptAssetName('md-valuemodel')).toBe(true);
    expect(isDefaultPrepromptAssetName(DEFAULT_PREPROMPT_ASSET_NAME)).toBe(true);
    expect(isDefaultPrepromptAssetName('other.md')).toBe(false);
  });

  it('finds the default asset id', () => {
    expect(findDefaultPrepromptAssetId(texts)).toBe('vm');
    expect(findDefaultPrepromptAssetId([{ id: 'x', name: 'nope' }])).toBeNull();
  });

  it('resolves unset preference to MD-ValueModel when present', () => {
    expect(resolvePrepromptSelectValue(null, texts)).toBe('vm');
  });

  it('resolves unset preference to none when MD-ValueModel is missing', () => {
    expect(resolvePrepromptSelectValue(null, [{ id: 't1', name: 'notes.txt' }])).toBe(
      PREPROMPT_NONE_VALUE,
    );
  });

  it('honors explicit none and stored ids', () => {
    expect(resolvePrepromptSelectValue(PREPROMPT_NONE_VALUE, texts)).toBe(PREPROMPT_NONE_VALUE);
    expect(resolvePrepromptSelectValue('t1', texts)).toBe('t1');
  });

  it('falls back when stored id is stale', () => {
    expect(resolvePrepromptSelectValue('missing', texts)).toBe('vm');
  });

  it('builds select options with None first', () => {
    expect(prepromptSelectOptions(texts)).toEqual([
      { value: PREPROMPT_NONE_VALUE, label: 'None' },
      { value: 't1', label: 'notes.txt' },
      { value: 'vm', label: 'MD-ValueModel.md' },
    ]);
  });
});
