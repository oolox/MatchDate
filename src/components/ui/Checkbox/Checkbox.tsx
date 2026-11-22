import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './Checkbox.module.css';

/** Labeled boolean checkbox; `hideLabel` keeps the label for accessibility but hides visible text. */
export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label: string;
  hideLabel?: boolean;
  labelAdornment?: ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Checkbox({
  label,
  hideLabel = false,
  labelAdornment,
  variant = 'primary',
  id,
  className,
  disabled,
  ...rest
}: CheckboxProps) {
  const inputId = id ?? `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const rootClasses = [
    styles.root,
    variant === 'secondary' ? styles.secondary : styles.primary,
    disabled ? styles.disabled : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={rootClasses}>
      <input
        type="checkbox"
        id={inputId}
        className={styles.input}
        disabled={disabled}
        aria-label={hideLabel ? label : undefined}
        {...rest}
      />
      <span className={styles.box} aria-hidden="true" />
      {hideLabel ? null : (
        <span className={styles.labelRow}>
          <span className={styles.label}>{label}</span>
          {labelAdornment}
        </span>
      )}
    </label>
  );
}
