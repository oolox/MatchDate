import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DateSummaryBubble } from '../../components/chat/DateSummaryBubble/DateSummaryBubble';
import { IconButton } from '../../components/ui/IconButton/IconButton';
import type { VoiceGenderHint } from '../../services/fal/models/tts';
import { useAppSelector } from '../../store/hooks';
import { selectCharacterReturnChatPath } from '../../store/slices/characterSlice';
import { selectSelectedSessionId } from '../../store/slices/sessionsSlice';
import { createId } from '../../store/slices/threadSlice';
import type { CharacterIdentity } from '../../types/character';
import type { DateSummaryData } from '../../types/dateSummary';
import { nowIso } from '../../utils/id';
import {
  dataTransferHasMatchDateLibrary,
  readMatchDateLibraryDragPayload,
} from '../../utils/matchdateLibraryDrag';
import { VoiceDesignerPanel } from '../voice/VoiceDesignerPanel';
import type { VoiceEditor } from '../voice/useVoiceEditor';
import type { CharacterEditorApi } from './CharacterEditorContext';
import { registerCharacterEditorFlush } from './characterEditorFlush';
import { CharacterCollapsibleCard } from './CharacterCollapsibleCard';
import { CharacterHistoryAddCard } from './CharacterHistoryAddCard';
import { CharacterHistoryEntry } from './CharacterHistoryEntry';
import { CharacterImagesSection } from './CharacterImagesSection';
import { CharacterTraitAddCard } from './CharacterTraitAddCard';
import { CharacterTraitEntry } from './CharacterTraitEntry';
import { CharacterSubHeader } from './CharacterSubHeader';
import styles from './CharacterEditor.module.css';

export interface CharacterEditorProps {
  editor: CharacterEditorApi;
  voiceEditor: VoiceEditor;
}

function genderFromIdentity(identity: CharacterIdentity): VoiceGenderHint {
  if (identity === 'male') {
    return 'male';
  }
  if (identity === 'female') {
    return 'female';
  }
  return 'neutral';
}

function sortByAtDesc<T extends { at: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = Date.parse(a.at);
    const bTime = Date.parse(b.at);
    if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
      return b.at.localeCompare(a.at);
    }
    return bTime - aTime;
  });
}

function dateSummarySortKey(summary: DateSummaryData): number {
  const raw = summary.dateTime.trim();
  const first = raw.split(/\s+(?:to|–|-|—)\s+/i)[0] ?? raw;
  const time = Date.parse(first);
  return Number.isNaN(time) ? 0 : time;
}

function sortDateSummariesNewestFirst(items: DateSummaryData[]): DateSummaryData[] {
  return [...items].sort((a, b) => dateSummarySortKey(b) - dateSummarySortKey(a));
}

export function CharacterEditor({ editor, voiceEditor }: CharacterEditorProps) {
  const {
    characterId,
    character,
    isBusy,
    isDirty,
    storageReady,
    setCharacterName,
    clearCharacterName,
    setIdentity,
    attachVoiceFromLibrary,
    setAttributeValue,
    removeHistoryEntry,
    appendHistoryEntry,
    updateHistoryEntry,
    removeTrait,
    removeDateSummary,
    upsertTrait,
    updateTrait,
    addImagesFromFiles,
    addImagesFromLibrary,
    removeImage,
    reorderImages,
    handleSave,
    handleNew,
  } = editor;
  const navigate = useNavigate();
  const returnChatPath = useAppSelector(selectCharacterReturnChatPath);
  const selectedSessionId = useAppSelector(selectSelectedSessionId);
  const [attributesExpanded, setAttributesExpanded] = useState(false);
  const [traitsExpanded, setTraitsExpanded] = useState(true);
  const [imagesExpanded, setImagesExpanded] = useState(true);
  const [voiceExpanded, setVoiceExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [datesExpanded, setDatesExpanded] = useState(true);
  const [addingTrait, setAddingTrait] = useState(false);
  const [addingHistory, setAddingHistory] = useState(false);
  const [editingTraitOriginalName, setEditingTraitOriginalName] = useState<string | null>(
    null,
  );
  const [editingHistoryIndex, setEditingHistoryIndex] = useState<number | null>(null);
  const [imagesSheetEpoch, setImagesSheetEpoch] = useState(0);
  const [voiceDragActive, setVoiceDragActive] = useState(false);
  const voiceSyncKeyRef = useRef<string | null>(null);

  const sheetBusy = isBusy || voiceEditor.isBusy || voiceEditor.isSaying;
  const canSave =
    (isDirty || voiceEditor.isDirty) && !sheetBusy && storageReady;

  const { loadVoiceAsset, startNewVoiceDesign } = voiceEditor;

  useEffect(() => {
    const voiceId = character.voiceAssetId?.trim() || '';
    const key = `${characterId ?? 'new'}:${voiceId}`;
    if (voiceSyncKeyRef.current === key) {
      return;
    }
    voiceSyncKeyRef.current = key;
    if (voiceId) {
      void loadVoiceAsset(voiceId);
      return;
    }
    startNewVoiceDesign({
      voiceName: character.name.trim() || undefined,
      characterId: characterId ?? null,
      gender: genderFromIdentity(character.identity),
      markDirty: false,
    });
  }, [
    character.identity,
    character.name,
    character.voiceAssetId,
    characterId,
    loadVoiceAsset,
    startNewVoiceDesign,
  ]);

  const handleVoiceDragOver = useCallback(
    (event: DragEvent) => {
      if (sheetBusy || !dataTransferHasMatchDateLibrary(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setVoiceDragActive(true);
    },
    [sheetBusy],
  );

  const handleVoiceDragLeave = useCallback((event: DragEvent) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setVoiceDragActive(false);
  }, []);

  const handleVoiceDrop = useCallback(
    (event: DragEvent) => {
      setVoiceDragActive(false);
      if (sheetBusy || !dataTransferHasMatchDateLibrary(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      const payload = readMatchDateLibraryDragPayload(event.dataTransfer);
      if (payload?.kind === 'asset' && payload.subtype === 'voice') {
        void attachVoiceFromLibrary(payload);
        setVoiceExpanded(true);
        return;
      }
      if (payload?.kind === 'asset' && payload.subtype === 'image') {
        void addImagesFromLibrary([payload]);
      }
    },
    [addImagesFromLibrary, attachVoiceFromLibrary, sheetBusy],
  );

  const handleCombinedSave = useCallback(async (): Promise<boolean> => {
    return handleSave({
      persistVoice: (savedCharacterId) =>
        voiceEditor.persistVoiceDesign({
          characterId: savedCharacterId,
          voiceName: character.name.trim() || voiceEditor.voiceName,
        }),
    });
  }, [character.name, handleSave, voiceEditor]);

  useEffect(() => {
    registerCharacterEditorFlush(async () => {
      if (!canSave) {
        return true;
      }
      return handleCombinedSave();
    });
    return () => {
      registerCharacterEditorFlush(null);
    };
  }, [canSave, handleCombinedSave]);

  const handleBackToChat = useCallback(() => {
    const path =
      returnChatPath?.trim() || `/session/${selectedSessionId ?? createId()}`;
    navigate(path);
  }, [navigate, returnChatPath, selectedSessionId]);

  const sheetEntryActionsDisabled =
    sheetBusy ||
    addingTrait ||
    addingHistory ||
    editingTraitOriginalName !== null ||
    editingHistoryIndex !== null;

  const historyNewestFirst = useMemo(
    () => sortByAtDesc(character.history ?? []),
    [character.history],
  );
  const traitsNewestFirst = useMemo(
    () => sortByAtDesc(character.traits ?? []),
    [character.traits],
  );
  const datesNewestFirst = useMemo(
    () => sortDateSummariesNewestFirst(character.dateSummary ?? []),
    [character.dateSummary],
  );

  return (
    <section
      className={[styles.section, voiceDragActive ? styles.sectionDragActive : '']
        .filter(Boolean)
        .join(' ')}
      aria-label="Character editor"
      onDragOver={handleVoiceDragOver}
      onDragLeave={handleVoiceDragLeave}
      onDrop={handleVoiceDrop}
    >
      <CharacterSubHeader
        name={character.name}
        identity={character.identity}
        isBusy={sheetBusy}
        canSave={canSave}
        onNameChange={setCharacterName}
        onClearName={clearCharacterName}
        onIdentityChange={setIdentity}
        onSave={() => {
          void handleCombinedSave();
        }}
        onBackToChat={handleBackToChat}
        onNew={() => {
          setImagesSheetEpoch((epoch) => epoch + 1);
          voiceSyncKeyRef.current = null;
          handleNew();
        }}
      />

      <div className={styles.listBody}>
        <CharacterCollapsibleCard
          title="Images"
          expanded={imagesExpanded}
          onExpandedChange={setImagesExpanded}
          hideBodyWhenCollapsed
          bodyClassName={styles.imagesBody}
        >
          <CharacterImagesSection
            key={`${characterId ?? 'new'}:${imagesSheetEpoch}`}
            images={character.images ?? []}
            disabled={isBusy}
            onFilesDrop={(files) => {
              void addImagesFromFiles(files);
            }}
            onLibraryDrop={(items) => {
              void addImagesFromLibrary(items);
            }}
            onRemove={(imageId) => {
              void removeImage(imageId);
            }}
            onReorder={(next) => {
              void reorderImages(next);
            }}
            onApplyTraits={(traits) => {
              const at = nowIso();
              for (const trait of traits) {
                upsertTrait({
                  at,
                  name: trait.name,
                  value: trait.value,
                  tags: trait.tags,
                });
              }
              setTraitsExpanded(true);
            }}
          />
        </CharacterCollapsibleCard>

        <CharacterCollapsibleCard
          title="Voice"
          expanded={voiceExpanded}
          onExpandedChange={setVoiceExpanded}
          bodyClassName={styles.voiceBody}
        >
          <VoiceDesignerPanel
            editor={voiceEditor}
            expanded={voiceExpanded}
            disabled={isBusy || voiceEditor.isBusy}
          />
        </CharacterCollapsibleCard>

        <CharacterCollapsibleCard
          title="Attributes"
          expanded={attributesExpanded}
          onExpandedChange={setAttributesExpanded}
          bodyClassName={styles.attributesBody}
        >
          <ul
            className={`${styles.list} ${attributesExpanded ? '' : styles.listCollapsed}`}
          >
            {character.attributes.map((attribute) => (
              <li
                key={attribute.name}
                className={`${styles.attribute} ${attributesExpanded ? '' : styles.attributeCollapsed}`}
              >
                <div className={styles.attributeMeta}>
                  <h3 className={styles.attributeName}>{attribute.name}</h3>
                  {attributesExpanded ? (
                    <p className={styles.attributeDescription}>{attribute.description}</p>
                  ) : null}
                </div>
                <div
                  className={`${styles.sliderRow} ${attributesExpanded ? '' : styles.valueRowCollapsed}`}
                >
                  {attributesExpanded ? (
                    <input
                      type="range"
                      className={styles.slider}
                      min={0}
                      max={100}
                      step={1}
                      value={attribute.value}
                      disabled={isBusy}
                      aria-label={`${attribute.name} importance`}
                      onChange={(event) =>
                        setAttributeValue(attribute.name, Number(event.target.value))
                      }
                    />
                  ) : null}
                  <input
                    type="number"
                    className={styles.numberInput}
                    min={0}
                    max={100}
                    step={1}
                    value={attribute.value}
                    disabled={isBusy}
                    aria-label={`${attribute.name} score`}
                    onChange={(event) =>
                      setAttributeValue(attribute.name, Number(event.target.value))
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        </CharacterCollapsibleCard>

        <CharacterCollapsibleCard
          title="Traits"
          expanded={traitsExpanded}
          onExpandedChange={setTraitsExpanded}
          hideBodyWhenCollapsed
          bodyClassName={styles.traitsBody}
          headerLeading={
            <IconButton
              icon="plus"
              label="Add a trait"
              variant="secondary"
              size="sm"
              disabled={isBusy || addingTrait || editingTraitOriginalName !== null}
              onClick={() => {
                setTraitsExpanded(true);
                setAddingTrait(true);
                setEditingTraitOriginalName(null);
              }}
            />
          }
        >
          {addingTrait ? (
            <div className={styles.addCardWrap}>
              <CharacterTraitAddCard
                disabled={isBusy}
                onSubmit={(trait) => {
                  upsertTrait(trait);
                  setAddingTrait(false);
                }}
                onCancel={() => setAddingTrait(false)}
              />
            </div>
          ) : null}
          {traitsNewestFirst.length === 0 && !addingTrait ? (
            <p className={styles.emptyHistory}>No traits yet.</p>
          ) : traitsNewestFirst.length > 0 ? (
            <ul className={styles.historyList}>
              {traitsNewestFirst.map((trait) => {
                const isEditing =
                  editingTraitOriginalName !== null &&
                  trait.name.trim().toLowerCase() ===
                    editingTraitOriginalName.trim().toLowerCase();
                if (isEditing) {
                  return (
                    <li key={`edit-trait-${editingTraitOriginalName}`} className={styles.historyItem}>
                      <CharacterTraitAddCard
                        key={editingTraitOriginalName}
                        mode="edit"
                        disabled={isBusy}
                        initial={{
                          at: trait.at,
                          name: trait.name,
                          value: trait.value,
                          tags: trait.tags ?? [],
                        }}
                        onSubmit={(values) => {
                          updateTrait({
                            originalName: editingTraitOriginalName,
                            ...values,
                          });
                          setEditingTraitOriginalName(null);
                        }}
                        onCancel={() => setEditingTraitOriginalName(null)}
                      />
                    </li>
                  );
                }
                return (
                  <li key={`${trait.name}-${trait.at}`} className={styles.historyItem}>
                    <CharacterTraitEntry
                      trait={trait}
                      editDisabled={sheetEntryActionsDisabled}
                      removeDisabled={sheetEntryActionsDisabled}
                      onEdit={() => {
                        setAddingTrait(false);
                        setEditingTraitOriginalName(trait.name);
                      }}
                      onRemove={() => removeTrait(trait.name)}
                    />
                  </li>
                );
              })}
            </ul>
          ) : null}
        </CharacterCollapsibleCard>

        <CharacterCollapsibleCard
          title="History"
          expanded={historyExpanded}
          onExpandedChange={setHistoryExpanded}
          hideBodyWhenCollapsed
          bodyClassName={styles.historyBody}
          headerLeading={
            <IconButton
              icon="plus"
              label="Add history"
              variant="secondary"
              size="sm"
              disabled={isBusy || addingHistory || editingHistoryIndex !== null}
              onClick={() => {
                setHistoryExpanded(true);
                setAddingHistory(true);
                setEditingHistoryIndex(null);
              }}
            />
          }
        >
          {addingHistory ? (
            <div className={styles.addCardWrap}>
              <CharacterHistoryAddCard
                disabled={isBusy}
                onSubmit={(entry) => {
                  appendHistoryEntry(entry);
                  setAddingHistory(false);
                }}
                onCancel={() => setAddingHistory(false)}
              />
            </div>
          ) : null}
          {historyNewestFirst.length === 0 && !addingHistory ? (
            <p className={styles.emptyHistory}>No history yet.</p>
          ) : historyNewestFirst.length > 0 ? (
            <ul className={styles.historyList}>
              {historyNewestFirst.map((entry) => {
                const index = (character.history ?? []).indexOf(entry);
                if (index >= 0 && editingHistoryIndex === index) {
                  return (
                    <li key={`edit-history-${index}`} className={styles.historyItem}>
                      <CharacterHistoryAddCard
                        key={index}
                        mode="edit"
                        disabled={isBusy}
                        initial={{
                          at: entry.at,
                          summary: entry.summary,
                        }}
                        onSubmit={(values) => {
                          updateHistoryEntry({ index, ...values });
                          setEditingHistoryIndex(null);
                        }}
                        onCancel={() => setEditingHistoryIndex(null)}
                      />
                    </li>
                  );
                }
                return (
                  <li key={`${entry.at}-${index}`} className={styles.historyItem}>
                    <CharacterHistoryEntry
                      entry={entry}
                      editDisabled={sheetEntryActionsDisabled || index < 0}
                      removeDisabled={sheetEntryActionsDisabled || index < 0}
                      onEdit={() => {
                        if (index >= 0) {
                          setAddingHistory(false);
                          setEditingHistoryIndex(index);
                        }
                      }}
                      onRemove={() => {
                        if (index >= 0) {
                          removeHistoryEntry(index);
                        }
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          ) : null}
        </CharacterCollapsibleCard>

        <CharacterCollapsibleCard
          title="Dates"
          expanded={datesExpanded}
          onExpandedChange={setDatesExpanded}
          hideBodyWhenCollapsed
          bodyClassName={styles.datesBody}
        >
          {datesNewestFirst.length === 0 ? (
            <p className={styles.emptyDates}>No dates yet.</p>
          ) : (
            <div className={styles.datesList}>
              {datesNewestFirst.map((summary, index) => (
                <DateSummaryBubble
                  key={summary.id?.trim() || `${summary.dateTime}-${summary.chatId}-${index}`}
                  shortSummary={summary.shortSummary}
                  location={summary.location}
                  justification={summary.justification}
                  character={summary.character}
                  dateTime={summary.dateTime}
                  chatId={summary.chatId}
                  complete
                  collapsible
                  removeDisabled={sheetEntryActionsDisabled}
                  onRemove={() => {
                    removeDateSummary({
                      id: summary.id,
                      dateTime: summary.dateTime,
                      chatId: summary.chatId,
                    });
                  }}
                />
              ))}
            </div>
          )}
        </CharacterCollapsibleCard>
      </div>
    </section>
  );
}
