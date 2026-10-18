import { useCallback, useId, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import type { CharacterTraitTag } from '../../types/character';
import { normalizeCharacterTraitTags } from '../../types/character';
import { CharacterAtDateTimeFields } from './CharacterAtDateTimeFields';
import { CharacterTraitTagsMultiSelect } from './CharacterTraitTagsMultiSelect';
import styles from './CharacterTraitAddCard.module.css';

export interface CharacterTraitFormValues {
  at: string;
  name: string;
  value: string;
  tags: CharacterTraitTag[];
}

export interface CharacterTraitAddCardProps {
  disabled?: boolean;
  mode?: 'add' | 'edit';
  initial?: CharacterTraitFormValues;
  onSubmit: (trait: CharacterTraitFormValues) => void;
  onCancel: () => void;
}

export function CharacterTraitAddCard({
  disabled = false,
  mode = 'add',
  initial,
  onSubmit,
  onCancel,
}: CharacterTraitAddCardProps) {
  const tagsFieldId = useId();
  const [at, setAt] = useState(initial?.at ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [value, setValue] = useState(initial?.value ?? '');
  const [tags, setTags] = useState<CharacterTraitTag[]>(() =>
    normalizeCharacterTraitTags(initial?.tags),
  );
  const handleAtChange = useCallback((next: string) => {
    setAt(next);
  }, []);

  const canSubmit =
    name.trim().length > 0 && value.trim().length > 0 && at.trim().length > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || disabled) {
      return;
    }
    onSubmit({
      at: at.trim(),
      name: name.trim(),
      value: value.trim(),
      tags: normalizeCharacterTraitTags(tags),
    });
  };

  const isEdit = mode === 'edit';

  return (
    <form
      className={styles.card}
      aria-label={isEdit ? 'Edit trait' : 'Add trait'}
      onSubmit={handleSubmit}
    >
      <div className={styles.field}>
        <CharacterAtDateTimeFields
          disabled={disabled}
          idPrefix="trait-at"
          initialAtIso={initial?.at}
          onAtChange={handleAtChange}
        />
      </div>
      <label className={styles.field}>
        <span className={styles.label}>Name</span>
        <input
          className={styles.input}
          type="text"
          value={name}
          disabled={disabled}
          autoComplete="off"
          placeholder="e.g. hair color"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Value</span>
        <input
          className={styles.input}
          type="text"
          value={value}
          disabled={disabled}
          autoComplete="off"
          placeholder="e.g. dark brown"
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <div className={styles.field}>
        <span className={styles.label} id={`${tagsFieldId}-label`}>
          Type
        </span>
        <CharacterTraitTagsMultiSelect
          id={tagsFieldId}
          value={tags}
          disabled={disabled}
          onChange={setTags}
        />
      </div>
      <div className={styles.actions}>
        <Button type="submit" variant="tab" disabled={disabled || !canSubmit}>
          {isEdit ? 'UPDATE' : 'ADD'}
        </Button>
        <Button type="button" variant="tab" disabled={disabled} onClick={onCancel}>
          CANCEL
        </Button>
      </div>
    </form>
  );
}
