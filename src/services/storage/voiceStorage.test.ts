import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getFileStorageService, setFileStorageForTests } from './index';
import { inMemoryFileStorage } from './inMemoryFileStorage';
import { listLibraryItems, reconcileLibraryIndex } from './libraryIndex';
import { deleteAsset, listAssets } from './persistenceService';
import { assetPath, voicePath } from './paths';
import {
  listVoiceAssets,
  loadVoice,
  loadVoiceMetadata,
  renameVoice,
  saveVoice,
} from './voiceStorage';

describe('voiceStorage', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('creates a preset-only voice and registers it in the catalog', async () => {
    const saved = await saveVoice({
      voiceName: 'Warm Puck',
      preset: { provider: 'gemini', voiceId: 'Puck', styleInstructions: 'warm' },
    });

    expect(saved.subtype).toBe('voice');
    expect(saved.name).toBe('Warm Puck');
    expect(saved.metadata).toMatchObject({
      voiceName: 'Warm Puck',
      preset: { provider: 'gemini', voiceId: 'Puck', styleInstructions: 'warm' },
    });
    expect(await getFileStorageService().exists(voicePath(saved.id))).toBe(false);

    await reconcileLibraryIndex(getFileStorageService());
    const items = await listLibraryItems(getFileStorageService(), 'asset');
    const row = items.find((item) => item.id === saved.id);
    expect(row).toMatchObject({
      kind: 'asset',
      subtype: 'voice',
      name: 'Warm Puck',
    });
  });

  it('defaults to Untitled voice + Gemini Kore', async () => {
    const saved = await saveVoice();
    expect(saved.name).toBe('Untitled voice');
    expect(saved.metadata).toMatchObject({
      voiceName: 'Untitled voice',
      preset: { provider: 'gemini', voiceId: 'Kore' },
    });
  });

  it('renames voiceName and catalog name without changing id', async () => {
    const saved = await saveVoice({ voiceName: 'Before' });
    const renamed = await renameVoice(saved.id, 'After');
    expect(renamed.id).toBe(saved.id);
    expect(renamed.name).toBe('After');
    expect((await loadVoiceMetadata(saved.id)).voiceName).toBe('After');

    const items = await listAssets();
    expect(items.find((item) => item.id === saved.id)?.name).toBe('After');
  });

  it('lists voice assets and deletes sample + metadata', async () => {
    const saved = await saveVoice({
      voiceName: 'With sample',
      sample: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' }),
    });
    expect(await getFileStorageService().exists(voicePath(saved.id))).toBe(true);

    const listed = await listVoiceAssets();
    expect(listed.some((row) => row.id === saved.id && row.hasSample)).toBe(true);

    await deleteAsset(saved.id);
    expect(await getFileStorageService().exists(assetPath(saved.id))).toBe(false);
    expect(await getFileStorageService().exists(voicePath(saved.id))).toBe(false);
    await expect(loadVoice(saved.id)).rejects.toThrow(/not found/i);
  });
});
