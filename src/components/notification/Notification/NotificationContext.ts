import { createContext } from 'react';

export interface NotificationContextValue {
  notify: (message: string) => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);
