import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import type { IconName } from '../Icon/icons';
import styles from './SmallButton.module.css';

export interface SmallButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  current?: boolean;
  icon?: IconName;
}

export function SmallButton({
  children,
  variant = 'secondary',
  current = false,
  icon,
  className,
  ...rest
}: SmallButtonProps) {
  const variantClass = variant === 'primary' ? styles.primary : styles.secondary;
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
