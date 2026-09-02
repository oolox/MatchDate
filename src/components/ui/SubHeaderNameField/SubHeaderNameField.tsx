import { IconButton } from '../IconButton/IconButton';
import styles from './SubHeaderNameField.module.css';

export interface SubHeaderNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel: string;
  clearLabel?: string;
}

export function SubHeaderNameField({
  value,
  onChange,
  onClear,
  disabled = false,
  placeholder,
  ariaLabel,
  clearLabel = 'Clear name',
}: SubHeaderNameFieldProps) {
  return (
    <div className={styles.nameField}>
      <input
        className={styles.input}
        type="text"
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <IconButton
        icon="close"
        label={clearLabel}
        variant="secondary"
        disabled={disabled || value.length === 0}
        onClick={onClear}
      />
    </div>
  );
}
