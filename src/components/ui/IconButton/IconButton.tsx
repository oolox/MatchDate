import type { ButtonHTMLAttributes } from 'react';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import styles from './IconButton.module.css';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'xs' | 'sm' | 'md';
  current?: boolean;
}

const VARIANT_CLASS: Record<NonNullable<IconButtonProps['variant']>, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  success: styles.success,
  warning: styles.warning,
  danger: styles.danger,
};

const SIZE_CLASS: Record<NonNullable<IconButtonProps['size']>, string> = {
  xs: styles.xs,
  sm: styles.sm,
  md: styles.md,
};

export function IconButton({
  icon,
  label,
  variant = 'primary',
  size = 'sm',
  current = false,
  className,
  ...rest
}: IconButtonProps) {
  const classes = [
    styles.iconButton,
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    current ? styles.current : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      aria-label={label}
      aria-pressed={current || undefined}
      {...rest}
    >
      <Icon name={icon} className={styles.icon} />
    </button>
  );
}
