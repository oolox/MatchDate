import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import type { CharacterTraitTag } from '../../types/character';
import type { MergedVisionTrait } from '../../services/fal/mergeVisionTraits';
import styles from './CharacterTraitProposal.module.css';

export interface CharacterTraitProposalProps {
  traits: MergedVisionTrait[];
  disabled?: boolean;
  onConfirm: (
    traits: Array<{ name: string; value: string; tags: CharacterTraitTag[] }>,
  ) => void;
  onCancel: () => void;
}

export function CharacterTraitProposal({
  traits,
  disabled = false,
  onConfirm,
  onCancel,
}: CharacterTraitProposalProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(traits.map((trait) => [trait.name.toLowerCase(), true])),
  );

  useEffect(() => {
    setSelected(Object.fromEntries(traits.map((trait) => [trait.name.toLowerCase(), true])));
  }, [traits]);

  const selectedTraits = traits.filter((trait) => selected[trait.name.toLowerCase()]);

  return (
    <div className={styles.card} aria-label="Proposed traits from images">
      <p className={styles.title}>Proposed traits</p>
      <p className={styles.hint}>
        Review traits deduced from the images. Uncheck any you do not want, then apply.
      </p>
      {traits.length === 0 ? (
        <p className={styles.empty}>No shared traits met the agreement threshold.</p>
      ) : (
        <ul className={styles.list}>
          {traits.map((trait) => {
            const key = trait.name.toLowerCase();
            const checked = Boolean(selected[key]);
            return (
              <li key={key} className={styles.item}>
                <label className={styles.row}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => {
                      setSelected((prev) => ({ ...prev, [key]: event.target.checked }));
                    }}
                  />
                  <span className={styles.detail}>
                    <span className={styles.name}>{trait.name}</span>
                    <span className={styles.sep}>:</span>
                    <span className={styles.value}>{trait.value}</span>
                    {trait.tags.length > 0 ? (
                      <span className={styles.tags}>{trait.tags.join(' · ')}</span>
                    ) : null}
                    <span className={styles.meta}>
                      {trait.support}/{trait.mentionedIn} images ·{' '}
                      {Math.round(trait.confidence * 100)}%
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <div className={styles.actions}>
        <Button
          type="button"
          variant="tab"
          disabled={disabled || selectedTraits.length === 0}
          onClick={() =>
            onConfirm(
              selectedTraits.map((trait) => ({
                name: trait.name,
                value: trait.value,
                tags: trait.tags,
              })),
            )
          }
        >
          {selectedTraits.length > 0 ? `APPLY(${selectedTraits.length})` : 'APPLY'}
        </Button>
        <Button type="button" variant="tab" disabled={disabled} onClick={onCancel}>
          CANCEL
        </Button>
      </div>
    </div>
  );
}
