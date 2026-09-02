import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BASIC_VALUES } from '../../types/character';
import { getFileStorageService, setFileStorageForTests } from './index';
import { inMemoryFileStorage } from './inMemoryFileStorage';
import {
  assetDocumentFromCharacter,
  characterFromAssetDocument,
} from './characterAsset';
import { loadAssetDocument, saveAssetDocument } from './assetPersistence';
import { listLibraryItems } from './libraryIndex';
import { createDefaultCharacter } from '../../types/character';
import { loadCharacter, saveCharacter } from './persistenceService';
import {
  defaultSubtypeForLoadableKinds,
  itemMatchesSubtypeTab,
  subtypesForFolder,
} from '../../components/library/LibraryBrowser/libraryBrowserSubtypes';

describe('characterAsset', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('round-trips character metadata through asset documents', async () => {
    const character = createDefaultCharacter('Alex');
    character.attributes[0] = {
      ...character.attributes[0],
      description: 'Loves autonomy',
      value: 72,
    };

    const storage = getFileStorageService();
    const saved = await saveAssetDocument(
      storage,
      assetDocumentFromCharacter(character, { id: 'char-1' }),
    );

    expect(saved.subtype).toBe('character');
    expect(saved.name).toBe('Alex');

    const loaded = characterFromAssetDocument(await loadAssetDocument(storage, 'char-1'));
    expect(loaded.name).toBe('Alex');
    expect(loaded.attributes).toHaveLength(BASIC_VALUES.length);
    expect(loaded.attributes[0]).toEqual({
      name: 'Self-Direction',
      description: 'Loves autonomy',
      value: 72,
    });
  });

  it('registers character assets in library.json', async () => {
    await saveCharacter(createDefaultCharacter('Jordan'), 'char-2');
    const items = await listLibraryItems(getFileStorageService(), 'asset');
    const row = items.find((item) => item.id === 'char-2');
    expect(row?.subtype).toBe('character');
    expect(row?.name).toBe('Jordan');
  });

  it('loads character via persistenceService', async () => {
    const saved = await saveCharacter(createDefaultCharacter('Sam'));
    const loaded = await loadCharacter(saved.id);
    expect(loaded.name).toBe('Sam');
    expect(loaded.attributes).toHaveLength(BASIC_VALUES.length);
  });
});

describe('libraryBrowserSubtypes character filter', () => {
  it('includes CHARACTER in asset subtypes', () => {
    const subtypes = subtypesForFolder('assets');
    expect(subtypes?.some((tab) => tab.id === 'character' && tab.label === 'CHARACTER')).toBe(
      true,
    );
  });

  it('filters assets by character subtype tab', () => {
    const subtypes = subtypesForFolder('assets') ?? [];
    const characterTab = subtypes.find((tab) => tab.id === 'character');
    expect(characterTab).toBeDefined();
    expect(
      itemMatchesSubtypeTab(
        {
          kind: 'asset',
          id: '1',
          name: 'Alex',
          createdAt: '',
          updatedAt: '',
          subtype: 'character',
        },
        characterTab!,
      ),
    ).toBe(true);
    expect(
      itemMatchesSubtypeTab(
        {
          kind: 'asset',
          id: '2',
          name: 'notes',
          createdAt: '',
          updatedAt: '',
          subtype: 'text',
        },
        characterTab!,
      ),
    ).toBe(false);
  });

  it('defaults asset subtype to text', () => {
    const subtypes = subtypesForFolder('assets') ?? [];
    expect(defaultSubtypeForLoadableKinds('assets', subtypes)).toBe('text');
  });
});
