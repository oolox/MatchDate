import { useMemo } from 'react';
import { DropdownSelect } from '../../ui/DropdownSelect';
import {
  LIBRARY_SYSTEM_PROMPT_VALUE,
  systemPromptSelectOptions,
  threadSystemPromptSelectValue,
} from '../../../features/chat/sessionSystemPrompt';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  selectActiveSystemPresetSlug,
  selectPresetCatalog,
} from '../../../store/slices/promptsSlice';
import { setThreadSystemPromptSlug } from '../../../store/slices/threadSlice';
import type { ThreadId } from '../../../types/chat';
import styles from './SystemPromptSelect.module.css';

export interface SystemPromptSelectProps {
  threadId: ThreadId;
  disabled?: boolean;
  className?: string;
}

export function SystemPromptSelect({
  threadId,
  disabled = false,
  className,
}: SystemPromptSelectProps) {
  const dispatch = useAppDispatch();
  const presetCatalog = useAppSelector(selectPresetCatalog);
  const activeSystemPresetSlug = useAppSelector(selectActiveSystemPresetSlug);
  const thread = useAppSelector((state) => state.thread.threads[threadId]);

  const options = useMemo(
    () => systemPromptSelectOptions(presetCatalog, activeSystemPresetSlug),
    [activeSystemPresetSlug, presetCatalog],
  );

  const value = threadSystemPromptSelectValue(thread, activeSystemPresetSlug);

  return (
    <DropdownSelect
      className={[styles.select, className].filter(Boolean).join(' ')}
      aria-label="System prompt"
      icon="prompt"
      menuPlacement="top"
      options={options}
      value={value}
      disabled={disabled}
      onChange={(next) => {
        const slug = next === LIBRARY_SYSTEM_PROMPT_VALUE ? null : next;
        dispatch(setThreadSystemPromptSlug({ threadId, slug }));
      }}
    />
  );
}
