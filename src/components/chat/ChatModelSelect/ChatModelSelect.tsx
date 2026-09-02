import { DropdownSelect } from '../../ui/DropdownSelect';
import { chatModelTabLabel, listChatModels } from '../../../services/fal/models/chat';
import { writeTxtModel } from '../../../services/localStorage';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { selectChatModel, setChatModel } from '../../../store/slices/localStorageSlice';
import styles from './ChatModelSelect.module.css';

const chatModelOptions = listChatModels().map((model) => ({
  value: model.id,
  label: chatModelTabLabel(model),
}));

export interface ChatModelSelectProps {
  disabled?: boolean;
  className?: string;
}

export function ChatModelSelect({ disabled = false, className }: ChatModelSelectProps) {
  const dispatch = useAppDispatch();
  const selectedModelId = useAppSelector(selectChatModel);

  return (
    <DropdownSelect
      className={[styles.select, className].filter(Boolean).join(' ')}
      aria-label="Chat model"
      icon="model"
      menuPlacement="top"
      options={chatModelOptions}
      value={selectedModelId}
      disabled={disabled}
      onChange={(id) => {
        const next = writeTxtModel(id);
        dispatch(setChatModel(next));
      }}
    />
  );
}
