import { Button } from '../../components/ui/Button';
import type { CharacterTraitTag } from '../../types/character';
import type { MergedVisionTrait } from '../../services/fal/mergeVisionTraits';
import styles from './CharacterTraitProposal.module.css';

type ProposedTrait = {
  name: string;
  value: string;
  tags: CharacterTraitTag[];
};

export interface CharacterTraitProposalProps {
  traits: MergedVisionTrait[];
  disabled?: boolean;
  onAdd: (traits: ProposedTrait[]) => void;
  onCancel: () => void;
}

function toProposed(trait: MergedVisionTrait): ProposedTrait {
  return {
    name: trait.name,
    value: trait.value,
    tags: trait.tags,
  };
}

export function CharacterTraitProposal({
  traits,
  disabled = false,
  onAdd,
  onCancel,
}: CharacterTraitProposalProps) {
  return (
    <div className={styles.card} aria-label="Proposed traits from images">
      <p className={styles.title}>Proposed traits</p>
      {traits.length === 0 ? (
        <p className={styles.empty}>No shared traits met the agreement threshold.</p>
      ) : (
        <ul className={styles.list}>
          {traits.map((trait) => {
            const key = trait.name.toLowerCase();
            return (
              <li key={key} className={styles.item}>
                <button
                  type="button"
                  className={styles.traitButton}
                  disabled={disabled}
                  title={`Add trait ${trait.name}: ${trait.value}`}
                  onClick={() => onAdd([toProposed(trait)])}
                >
                  <span className={styles.traitPrimary}>
                    {trait.name}: {trait.value}
                  </span>
                  <span className={styles.traitMeta}>
                    {Math.round(trait.confidence * 100)}%
                    {trait.tags.length > 0 ? ` · ${trait.tags.join(' · ')}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className={styles.actions}>
        <Button
          type="button"
          variant="tab"
          disabled={disabled || traits.length === 0}
          onClick={() => onAdd(traits.map(toProposed))}
        >
          ALL
        </Button>
        <Button type="button" variant="tab" disabled={disabled} onClick={onCancel}>
          CANCEL
        </Button>
      </div>
    </div>
  );
}
