import { useCallback, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { CharacterAtDateTimeFields } from './CharacterAtDateTimeFields';
import styles from './CharacterTraitAddCard.module.css';

export interface CharacterHistoryFormValues {
  at: string;
  summary: string;
}

export interface CharacterHistoryAddCardProps {
  disabled?: boolean;
  mode?: 'add' | 'edit';
  initial?: CharacterHistoryFormValues;
  onSubmit: (entry: CharacterHistoryFormValues) => void;
  onCancel: () => void;
}

export function CharacterHistoryAddCard({
  disabled = false,
  mode = 'add',
  initial,
  onSubmit,
  onCancel,
}: CharacterHistoryAddCardProps) {
  const [at, setAt] = useState(initial?.at ?? '');
  const [summary, setSummary] = useState(initial?.summary ?? '');
  const handleAtChange = useCallback((next: string) => {
    setAt(next);
  }, []);

  const canSubmit = summary.trim().length > 0 && at.trim().length > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || disabled) {
      return;
    }
    onSubmit({
      at: at.trim(),
      summary: summary.trim(),
    });
  };

  const isEdit = mode === 'edit';

  return (
    <form
      className={styles.card}
      aria-label={isEdit ? 'Edit history' : 'Add history'}
      onSubmit={handleSubmit}
    >
      <div className={styles.field}>
        <CharacterAtDateTimeFields
          disabled={disabled}
          idPrefix="history-at"
          initialAtIso={initial?.at}
          onAtChange={handleAtChange}
        />
      </div>
      <label className={styles.field}>
        <span className={styles.label}>Summary</span>
        <input
          className={styles.input}
          type="text"
          value={summary}
          disabled={disabled}
          autoComplete="off"
          placeholder="e.g. Met at a cafe"
          onChange={(event) => setSummary(event.target.value)}
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
