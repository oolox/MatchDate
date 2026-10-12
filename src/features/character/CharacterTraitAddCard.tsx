import { useCallback, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { CharacterAtDateTimeFields } from './CharacterAtDateTimeFields';
import styles from './CharacterTraitAddCard.module.css';

export interface CharacterTraitFormValues {
  at: string;
  name: string;
  value: string;
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
  const [at, setAt] = useState(initial?.at ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [value, setValue] = useState(initial?.value ?? '');
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
      <div className={styles.actions}>
        <Button type="submit" variant="tab" disabled={disabled || !canSubmit}>
          {isEdit ? 'Update' : 'Add'}
        </Button>
        <Button type="button" variant="tab" disabled={disabled} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
