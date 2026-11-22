import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BASIC_VALUES, createDefaultCharacter } from '../../types/character';
import { getFileStorageService, setFileStorageForTests } from './index';
import { inMemoryFileStorage } from './inMemoryFileStorage';
import {
  characterDocumentFromCharacter,
  characterFromDocument,
  loadCharacterDocumentMigrating,
} from './characterPersistence';
import { deleteCharacterDocument, loadCharacterDocument, saveCharacterDocument } from './characterPersistence';
import { listLibraryItems } from './libraryIndex';
import {
  duplicateCharacter,
  listCharacters,
  loadCharacter,
  loadCharacterWithMigration,
  saveCharacter,
} from './persistenceService';
import { characterDocumentPath } from './paths';
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
    character.history = [
      { at: '2026-09-13T17:00:00.000Z', summary: 'First chat beat', sessionId: 'sess-1' },
    ];
    character.identity = 'female';
    character.voiceAssetId = 'voice-guid-1';
    character.traits = [
      {
        at: '2026-09-13T17:00:00.000Z',
        name: 'eye color',
        value: 'green',
        tags: ['Physical', 'Unconscience'],
        sessionId: 'sess-1',
      },
    ];
    character.images = [
      {
        id: 'img-1',
        fileName: 'masterDater-img-img-1.png',
        path: '/masterdater/assets/img/masterDater-img-img-1.png',
        createdAt: '2026-09-13T17:00:00.000Z',
        metadata: { originalName: 'portrait.png' },
      },
    ];

    const storage = getFileStorageService();
    const saved = await saveCharacterDocument(
      storage,
      characterDocumentFromCharacter(character, { id: 'char-1' }),
    );

    expect(saved.type).toBe('character');
    expect(saved.name).toBe('Alex');
    expect(saved.history).toHaveLength(1);
    expect(saved.images).toHaveLength(1);
    expect(saved.images?.[0]?.id).toBe('img-1');
    expect(saved.voiceAssetId).toBe('voice-guid-1');

    const loaded = characterFromDocument(await loadCharacterDocument(storage, 'char-1'));
    expect(loaded.name).toBe('Alex');
    expect(loaded.identity).toBe('female');
    expect(loaded.voiceAssetId).toBe('voice-guid-1');
    expect(loaded.history).toEqual(character.history);
    expect(loaded.traits).toEqual(character.traits);
    expect(loaded.images).toEqual(character.images);
    expect(loaded.attributes).toHaveLength(BASIC_VALUES.length);
    expect(loaded.attributes[0]).toEqual({
      name: 'Self-Direction',
      description: 'Loves autonomy',
      value: 72,
    });
  });

  it('migrates legacy character docs missing history/images to []', async () => {
    const storage = getFileStorageService();
    await storage.write(
      characterDocumentPath('legacy'),
      JSON.stringify({
        schemaVersion: 2,
        type: 'character',
        id: 'legacy',
        name: 'Legacy',
        attributes: createDefaultCharacter('Legacy').attributes,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    const loaded = characterFromDocument(await loadCharacterDocument(storage, 'legacy'));
    expect(loaded.history).toEqual([]);
    expect(loaded.images).toEqual([]);
    expect(loaded.dateHistory).toEqual([]);
    expect(loaded.identity).toBe('binary');
  });

  it('migrates legacy dateSummary/dateTranscript into dateHistory and saves', async () => {
    const storage = getFileStorageService();
    await storage.write(
      characterDocumentPath('legacy-dates'),
      JSON.stringify({
        schemaVersion: 2,
        type: 'character',
        id: 'legacy-dates',
        name: 'Legacy Dates',
        attributes: createDefaultCharacter('Legacy Dates').attributes,
        history: [],
        traits: [],
        dateSummary: [
          {
            id: 'summary-1',
            shortSummary: 'Quiet evening.',
            location: 'Corner trattoria',
            justification: 'Aligned.',
            character: [
              { id: 'legacy-dates', dateReview: 'Nice.', dateScore: 8, dateFit: 8 },
            ],
            dateTime: '2028-09-12T19:00:00-04:00',
            chatId: 'chat-1',
          },
        ],
        dateTranscript: [
          {
            id: 'transcript-1',
            location: 'Corner trattoria',
            dateTime: '2028-09-12T19:00:00-04:00',
            characterIds: ['legacy-dates'],
            segments: [{ type: 'text', text: 'They sat down.' }],
          },
        ],
        images: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );

    const { character, migratedDateHistory } = await loadCharacterWithMigration('legacy-dates');
    expect(migratedDateHistory).toBe(true);
    expect(character.dateHistory).toHaveLength(1);
    expect(character.dateHistory[0]?.dateSummary?.id).toBe('summary-1');
    expect(character.dateHistory[0]?.dateTranscript?.id).toBe('transcript-1');

    const raw = JSON.parse(await storage.read(characterDocumentPath('legacy-dates'))) as Record<
      string,
      unknown
    >;
    expect(raw).toHaveProperty('dateHistory');
    expect(raw).not.toHaveProperty('dateSummary');
    expect(raw).not.toHaveProperty('dateTranscript');

    const second = await loadCharacterDocumentMigrating(storage, 'legacy-dates');
    expect(second.migratedDateHistory).toBe(false);
  });

  it('registers characters in library.json', async () => {
    const character = createDefaultCharacter('Jordan');
    character.identity = 'male';
    await saveCharacter(character, 'char-2');
    const items = await listLibraryItems(getFileStorageService(), 'character');
    const row = items.find((item) => item.id === 'char-2');
    expect(row?.kind).toBe('character');
    expect(row?.name).toBe('Jordan');
    expect(row?.identity).toBe('male');
  });

  it('keeps character identity after library index reload', async () => {
    const character = createDefaultCharacter('Riley');
    character.identity = 'female';
    await saveCharacter(character, 'char-identity');
    // listCharacters reconciles then reloads the index (parse must keep identity).
    const items = await listCharacters();
    const row = items.find((item) => item.id === 'char-identity');
    expect(row?.identity).toBe('female');
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

  it('duplicates a character with a new id and COPY name', async () => {
    const original = await saveCharacter(createDefaultCharacter('Alex'), 'char-copy-src');
    const copy = await duplicateCharacter(original.id);
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe('Alex - COPY');
    const loaded = await loadCharacter(copy.id);
    expect(loaded.name).toBe('Alex - COPY');
    expect(loaded.attributes).toHaveLength(BASIC_VALUES.length);
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

  it('includes SET as an asset subtype filter', () => {
    const subtypes = subtypesForFolder('assets') ?? [];
    const setTab = subtypes.find((tab) => tab.id === 'characterSet');
    expect(setTab?.label).toBe('SET');
    const item = {
      kind: 'asset' as const,
      id: 'set-1',
      name: 'date',
      createdAt: '',
      updatedAt: '',
      subtype: 'characterSet' as const,
    };
    expect(itemMatchesSubtypeTab(item, setTab!)).toBe(true);
    const allTab = subtypes.find((tab) => tab.id === 'all');
    expect(itemMatchesSubtypeTab(item, allTab!)).toBe(true);
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
