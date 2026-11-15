import { useMemo } from 'react';
import { DropdownSelect } from '../../ui/DropdownSelect';
import { DEFAULT_BUNDLED_PROMPT_ID } from '../../../features/chat/bundledPrompts';
import {
  systemPromptSelectOptions,
  threadSystemPromptSelectValue,
} from '../../../features/chat/sessionSystemPrompt';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
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
  const thread = useAppSelector((state) => state.thread.threads[threadId]);

  const options = useMemo(() => systemPromptSelectOptions(), []);
  const value = threadSystemPromptSelectValue(thread);

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
        const slug = next === DEFAULT_BUNDLED_PROMPT_ID ? null : next;
        dispatch(setThreadSystemPromptSlug({ threadId, slug }));
      }}
    />
  );
}
