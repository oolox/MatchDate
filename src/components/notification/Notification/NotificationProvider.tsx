import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { NotificationContext } from './NotificationContext';
import { Notification } from './Notification';
import styles from './NotificationProvider.module.css';

interface NotificationItem {
  id: string;
  message: string;
}

export interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((message: string) => {
    const id = crypto.randomUUID();
    setItems((current) => [...current, { id, message }]);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {createPortal(
        <div className={styles.container} aria-live="polite" aria-relevant="additions">
          {items.map((item) => (
            <Notification
              key={item.id}
              message={item.message}
              onDismiss={() => dismiss(item.id)}
            />
          ))}
        </div>,
        document.body,
      )}
    </NotificationContext.Provider>
  );
}
