import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'tab';
  current?: boolean;
  icon?: IconName;
}

export function Button({
  children,
  variant = 'primary',
  current = false,
  icon,
  className,
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === 'tab' ? styles.tab : variant === 'secondary' ? styles.secondary : styles.primary;
  const classes = [
    styles.button,
    variantClass,
    current ? styles.current : '',
    icon ? styles.withIcon : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} aria-pressed={current || undefined} {...rest}>
      {icon ? <Icon name={icon} className={styles.icon} /> : null}
      <span className={styles.label}>{children}</span>
    </button>
  );
}
