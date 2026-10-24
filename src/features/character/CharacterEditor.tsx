import { useCallback, useMemo, useState, type DragEvent } from 'react';
import { useNotification } from '../../components/notification/Notification/useNotification';
import { IconButton } from '../../components/ui/IconButton/IconButton';
import { nowIso } from '../../utils/id';
import {
  dataTransferHasMatchDateLibrary,
  readMatchDateLibraryDragPayload,
} from '../../utils/matchdateLibraryDrag';
import type { CharacterEditorApi } from './CharacterEditorContext';
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

export function CharacterEditor({ editor }: CharacterEditorProps) {
  const {
    characterId,
    character,
    isBusy,
    canSave,
    setCharacterName,
    clearCharacterName,
    setIdentity,
    clearVoiceAssetId,
    attachVoiceFromLibrary,
    setAttributeValue,
    removeHistoryEntry,
    appendHistoryEntry,
    updateHistoryEntry,
    removeTrait,
    upsertTrait,
    updateTrait,
    addImagesFromFiles,
    addImagesFromLibrary,
    removeImage,
    reorderImages,
    handleSave,
    handleNew,
  } = editor;
  const { notify } = useNotification();
  const [attributesExpanded, setAttributesExpanded] = useState(false);
  const [traitsExpanded, setTraitsExpanded] = useState(true);
  const [imagesExpanded, setImagesExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [addingTrait, setAddingTrait] = useState(false);
  const [addingHistory, setAddingHistory] = useState(false);
  const [editingTraitOriginalName, setEditingTraitOriginalName] = useState<string | null>(
    null,
  );
  const [editingHistoryIndex, setEditingHistoryIndex] = useState<number | null>(null);
  const [imagesSheetEpoch, setImagesSheetEpoch] = useState(0);
  const [voiceDragActive, setVoiceDragActive] = useState(false);

  const handleVoiceDragOver = useCallback(
    (event: DragEvent) => {
      if (isBusy || !dataTransferHasMatchDateLibrary(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setVoiceDragActive(true);
    },
    [isBusy],
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
      if (isBusy || !dataTransferHasMatchDateLibrary(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      const payload = readMatchDateLibraryDragPayload(event.dataTransfer);
      if (payload?.kind === 'asset' && payload.subtype === 'voice') {
        void attachVoiceFromLibrary(payload);
        return;
      }
      if (payload?.kind === 'asset' && payload.subtype === 'image') {
        void addImagesFromLibrary([payload]);
      }
    },
    [addImagesFromLibrary, attachVoiceFromLibrary, isBusy],
  );

  const sheetEntryActionsDisabled =
    isBusy || addingTrait || addingHistory || editingTraitOriginalName !== null || editingHistoryIndex !== null;

  const historyNewestFirst = useMemo(
    () => sortByAtDesc(character.history ?? []),
    [character.history],
  );
  const traitsNewestFirst = useMemo(
    () => sortByAtDesc(character.traits ?? []),
    [character.traits],
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
        characterId={characterId}
        voiceAssetId={character.voiceAssetId}
        isBusy={isBusy}
        canSave={canSave}
        onNameChange={setCharacterName}
        onClearName={clearCharacterName}
        onIdentityChange={setIdentity}
        onClearVoice={clearVoiceAssetId}
        onSave={() => {
          void handleSave();
        }}
        onNew={() => {
          setImagesSheetEpoch((epoch) => epoch + 1);
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
              notify(
                traits.length === 1
                  ? 'Applied 1 trait from images'
                  : `Applied ${traits.length} traits from images`,
              );
            }}
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
      </div>
    </section>
  );
}
