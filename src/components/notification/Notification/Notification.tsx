import { useEffect, useState } from 'react';
import { IconButton } from '../../ui/IconButton/IconButton';
import styles from './Notification.module.css';

export const NOTIFICATION_DURATION_MS = 5000;
export const NOTIFICATION_EXIT_MS = 300;

export interface NotificationProps {
  message: string;
  onDismiss: () => void;
}

export function Notification({ message, onDismiss }: NotificationProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setExiting(true);
    }, NOTIFICATION_DURATION_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!exiting) {
      return;
    }

    const timer = window.setTimeout(onDismiss, NOTIFICATION_EXIT_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [exiting, onDismiss]);

  const classes = [styles.notification, exiting ? styles.notificationExiting : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role="status" aria-live="polite">
      <span className={styles.message}>{message}</span>
      <IconButton
        icon="close"
        label="Dismiss notification"
        variant="secondary"
        onClick={() => setExiting(true)}
      />
    </div>
  );
}
