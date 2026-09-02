import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BASIC_VALUES, createDefaultCharacter } from '../../types/character';
import { getFileStorageService, setFileStorageForTests } from './index';
import { inMemoryFileStorage } from './inMemoryFileStorage';
import {
  characterDocumentFromCharacter,
  characterFromDocument,
} from './characterPersistence';
import { deleteCharacterDocument, loadCharacterDocument, saveCharacterDocument } from './characterPersistence';
import { listLibraryItems } from './libraryIndex';
import { loadCharacter, saveCharacter } from './persistenceService';
import {
  defaultSubtypeForLoadableKinds,
  itemMatchesSubtypeTab,
  subtypesForFolder,
} from '../../components/library/LibraryBrowser/libraryBrowserSubtypes';
import { LIBRARY_BROWSER_TABS } from '../../components/library/LibraryBrowser/libraryBrowserTabs';

describe('characterPersistence', () => {
  beforeEach(() => {
    setFileStorageForTests(inMemoryFileStorage);
  });

  afterEach(() => {
    setFileStorageForTests(null);
  });

  it('round-trips character documents', async () => {
    const character = createDefaultCharacter('Alex');
    character.attributes[0] = {
      ...character.attributes[0],
      description: 'Loves autonomy',
      value: 72,
    };

    const storage = getFileStorageService();
    const saved = await saveCharacterDocument(
      storage,
      characterDocumentFromCharacter(character, { id: 'char-1' }),
    );

    expect(saved.type).toBe('character');
    expect(saved.name).toBe('Alex');

    const loaded = characterFromDocument(await loadCharacterDocument(storage, 'char-1'));
    expect(loaded.name).toBe('Alex');
    expect(loaded.attributes).toHaveLength(BASIC_VALUES.length);
    expect(loaded.attributes[0]).toEqual({
      name: 'Self-Direction',
      description: 'Loves autonomy',
      value: 72,
    });
  });

  it('registers characters in library.json', async () => {
    await saveCharacter(createDefaultCharacter('Jordan'), 'char-2');
    const items = await listLibraryItems(getFileStorageService(), 'character');
    const row = items.find((item) => item.id === 'char-2');
    expect(row?.kind).toBe('character');
    expect(row?.name).toBe('Jordan');
  });

  it('loads character via persistenceService', async () => {
    const saved = await saveCharacter(createDefaultCharacter('Sam'));
    const loaded = await loadCharacter(saved.id);
    expect(loaded.name).toBe('Sam');
    expect(loaded.attributes).toHaveLength(BASIC_VALUES.length);
  });

  it('deletes character documents and catalog rows', async () => {
    const storage = getFileStorageService();
    await saveCharacter(createDefaultCharacter('Temp'), 'char-3');
    await deleteCharacterDocument(storage, 'char-3');
    const items = await listLibraryItems(storage, 'character');
    expect(items.some((item) => item.id === 'char-3')).toBe(false);
  });
});

describe('library browser character tab', () => {
  it('includes CHARACTER as a top-level folder tab', () => {
    expect(
      LIBRARY_BROWSER_TABS.some((tab) => tab.id === 'characters' && tab.label === 'CHARACTER'),
    ).toBe(true);
  });

  it('does not include CHARACTER in asset subtypes', () => {
    const subtypes = subtypesForFolder('assets');
    expect(subtypes?.some((tab) => tab.id === 'character')).toBe(false);
  });

  it('filters characters in the characters folder tab', () => {
    const subtypes = subtypesForFolder('characters') ?? [];
    const allTab = subtypes.find((tab) => tab.id === 'all');
    expect(allTab).toBeDefined();
    expect(
      itemMatchesSubtypeTab(
        {
          kind: 'character',
          id: '1',
          name: 'Alex',
          createdAt: '',
          updatedAt: '',
        },
        allTab!,
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
        allTab!,
      ),
    ).toBe(false);
  });

  it('defaults asset subtype to text', () => {
    const subtypes = subtypesForFolder('assets') ?? [];
    expect(defaultSubtypeForLoadableKinds('assets', subtypes)).toBe('text');
  });
});
