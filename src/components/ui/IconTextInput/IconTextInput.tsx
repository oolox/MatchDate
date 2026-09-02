import type { InputHTMLAttributes } from 'react';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import styles from './IconTextInput.module.css';

export interface IconTextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  icon: IconName;
  placeholder?: string;
  disabled?: boolean;
  'aria-label': string;
  className?: string;
}

export function IconTextInput({
  value,
  onChange,
  icon,
  placeholder,
  disabled = false,
  className,
  'aria-label': ariaLabel,
  ...rest
}: IconTextInputProps) {
  const classes = [styles.wrap, className].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      <Icon name={icon} className={styles.icon} />
      <input
        {...rest}
        aria-label={ariaLabel}
        disabled={disabled}
        className={styles.input}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
    </span>
  );
}
