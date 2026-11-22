import { Button } from '../../ui/Button';
import { FullScreenModal } from '../../ui/FullScreenModal';
import styles from './LoadCharacterSetModal.module.css';

export interface LoadCharacterSetModalProps {
  open: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LoadCharacterSetModal({
  open,
  busy = false,
  onConfirm,
  onCancel,
}: LoadCharacterSetModalProps) {
  return (
    <FullScreenModal
      open={open}
      onClose={onCancel}
      ariaLabel="Are you sure?"
      closeLabel="Cancel load"
    >
      <div className={styles.content}>
        <h2 className={styles.title}>Are you sure?</h2>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={busy} onClick={onConfirm}>
            Load
          </Button>
        </div>
      </div>
    </FullScreenModal>
  );
}
