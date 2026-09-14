import { Button } from '../../ui/Button/Button';
import { FullScreenModal } from '../../ui/FullScreenModal';
import styles from './CreateCharacterModal.module.css';

export interface CreateCharacterModalProps {
  open: boolean;
  characterName: string;
  busy?: boolean;
  onAccept: () => void;
  onReject: () => void;
}

/** Accept/reject gate before writing an agent character.create to the library. */
export function CreateCharacterModal({
  open,
  characterName,
  busy = false,
  onAccept,
  onReject,
}: CreateCharacterModalProps) {
  const title = `Create ${characterName}`;

  return (
    <FullScreenModal open={open} onClose={onReject} ariaLabel={title} closeLabel="Reject create">
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.hint}>Save this character to your library?</p>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" disabled={busy} onClick={onReject}>
            Reject
          </Button>
          <Button type="button" variant="primary" disabled={busy} onClick={onAccept}>
            Accept
          </Button>
        </div>
      </div>
    </FullScreenModal>
  );
}
