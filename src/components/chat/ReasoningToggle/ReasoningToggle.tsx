import { Button } from '../../ui/Button/Button';
import { writeChatReasoning } from '../../../services/localStorage';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  selectChatReasoning,
  setChatReasoning,
} from '../../../store/slices/localStorageSlice';
import styles from './ReasoningToggle.module.css';

export interface ReasoningToggleProps {
  disabled?: boolean;
}

export function ReasoningToggle({ disabled = false }: ReasoningToggleProps) {
  const dispatch = useAppDispatch();
  const enabled = useAppSelector(selectChatReasoning);

  return (
    <Button
      variant="tab"
      current={enabled}
      className={enabled ? styles.on : undefined}
      aria-pressed={enabled}
      aria-label={enabled ? 'Reasoning on' : 'Reasoning off'}
      disabled={disabled}
      onClick={() => {
        const next = writeChatReasoning(!enabled);
        dispatch(setChatReasoning(next));
      }}
    >
      REASON
    </Button>
  );
}
