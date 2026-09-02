import { useSessionEditor } from '../../features/session/useSessionEditor';
import { SessionWorkspaceLayout } from '../../features/session/SessionWorkspaceLayout';
import styles from './CharacterSheetView.module.css';

export interface CharacterSheetViewProps {
  sessionId: string;
}

export function CharacterSheetView({ sessionId }: CharacterSheetViewProps) {
  const { ready, persistAfterTurn } = useSessionEditor(sessionId);

  return (
    <SessionWorkspaceLayout
      sessionId={sessionId}
      routePrefix="character"
      persistence={{ ready, persistAfterTurn }}
      left={
        <div className={styles.sheet}>
          <p className={styles.placeholder}>Placeholder</p>
        </div>
      }
    />
  );
}
