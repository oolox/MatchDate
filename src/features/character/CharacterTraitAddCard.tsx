import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { nowIso } from '../../utils/id';
import styles from './CharacterTraitAddCard.module.css';

export interface CharacterTraitAddCardProps {
  disabled?: boolean;
  onAdd: (trait: { at: string; name: string; value: string }) => void;
  onCancel: () => void;
}

export function CharacterTraitAddCard({
  disabled = false,
  onAdd,
  onCancel,
}: CharacterTraitAddCardProps) {
  const [at, setAt] = useState(() => nowIso());
  const [name, setName] = useState('');
  const [value, setValue] = useState('');

  const canSubmit = name.trim().length > 0 && value.trim().length > 0 && at.trim().length > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || disabled) {
      return;
    }
    onAdd({
      at: at.trim(),
      name: name.trim(),
      value: value.trim(),
    });
  };

  return (
    <form className={styles.card} aria-label="Add trait" onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>At</span>
        <input
          className={styles.input}
          type="text"
          value={at}
          disabled={disabled}
          autoComplete="off"
          onChange={(event) => setAt(event.target.value)}
        />
      </label>
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
          Add
        </Button>
        <Button type="button" variant="tab" disabled={disabled} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
