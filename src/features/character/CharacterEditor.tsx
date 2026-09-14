import { useMemo, useState } from 'react';
import type { CharacterEditorApi } from './CharacterEditorContext';
import { CharacterCollapsibleCard } from './CharacterCollapsibleCard';
import { CharacterHistoryEntry } from './CharacterHistoryEntry';
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
    character,
    isBusy,
    canSave,
    setCharacterName,
    clearCharacterName,
    setAttributeValue,
    handleSave,
    handleNew,
  } = editor;
  const [attributesExpanded, setAttributesExpanded] = useState(true);
  const [traitsExpanded, setTraitsExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  const historyNewestFirst = useMemo(
    () => sortByAtDesc(character.history ?? []),
    [character.history],
  );
  const traitsNewestFirst = useMemo(
    () => sortByAtDesc(character.traits ?? []),
    [character.traits],
  );

  return (
    <section className={styles.section} aria-label="Character editor">
      <CharacterSubHeader
        name={character.name}
        isBusy={isBusy}
        canSave={canSave}
        onNameChange={setCharacterName}
        onClearName={clearCharacterName}
        onSave={() => {
          void handleSave();
        }}
        onNew={handleNew}
      />

      <div className={styles.listBody}>
        <CharacterCollapsibleCard
          title="Attributes"
          expanded={attributesExpanded}
          onExpandedChange={setAttributesExpanded}
          fill
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
          fill
          hideBodyWhenCollapsed
          bodyClassName={styles.traitsBody}
        >
          {traitsNewestFirst.length === 0 ? (
            <p className={styles.emptyHistory}>No traits yet.</p>
          ) : (
            <ul className={styles.historyList}>
              {traitsNewestFirst.map((trait) => (
                <li key={`${trait.name}-${trait.at}`} className={styles.historyItem}>
                  <CharacterTraitEntry trait={trait} />
                </li>
              ))}
            </ul>
          )}
        </CharacterCollapsibleCard>

        <CharacterCollapsibleCard
          title="History"
          expanded={historyExpanded}
          onExpandedChange={setHistoryExpanded}
          fill
          hideBodyWhenCollapsed
          bodyClassName={styles.historyBody}
        >
          {historyNewestFirst.length === 0 ? (
            <p className={styles.emptyHistory}>No history yet.</p>
          ) : (
            <ul className={styles.historyList}>
              {historyNewestFirst.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className={styles.historyItem}>
                  <CharacterHistoryEntry entry={entry} />
                </li>
              ))}
            </ul>
          )}
        </CharacterCollapsibleCard>
      </div>
    </section>
  );
}
