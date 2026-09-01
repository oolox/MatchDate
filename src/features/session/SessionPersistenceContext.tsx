import { createContext, useContext } from 'react';

export interface SessionPersistenceContextValue {
  persistAfterTurn: () => Promise<void>;
  ready: boolean;
}

export const SessionPersistenceContext =
  createContext<SessionPersistenceContextValue | null>(null);

export function useSessionPersistence(): SessionPersistenceContextValue {
  const context = useContext(SessionPersistenceContext);
  if (!context) {
    throw new Error('useSessionPersistence must be used within SessionPersistenceProvider');
  }
  return context;
}
