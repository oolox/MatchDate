import type { CharacterEditorApi } from './CharacterEditorContext';
import { CharacterSubHeader } from './CharacterSubHeader';
import styles from './CharacterEditor.module.css';

export interface CharacterEditorProps {
  editor: CharacterEditorApi;
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
        <ul className={styles.list}>
          {character.attributes.map((attribute) => (
            <li key={attribute.name} className={styles.attribute}>
              <div className={styles.attributeMeta}>
                <h3 className={styles.attributeName}>{attribute.name}</h3>
                <p className={styles.attributeDescription}>{attribute.description}</p>
              </div>
              <div className={styles.sliderRow}>
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
      </div>
    </section>
  );
}
