import type { KeyboardEvent, Ref } from 'react';
import { forwardRef } from 'react';
import { TextArea } from '../../ui/TextArea/TextArea';

export interface MessageTextInputProps {
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const MessageTextInput = forwardRef(function MessageTextInput(
  {
    label,
    value,
    placeholder,
    rows = 3,
    disabled = false,
    onChange,
    onKeyDown,
  }: MessageTextInputProps,
  ref: Ref<HTMLTextAreaElement>,
) {
  return (
    <TextArea
      ref={ref}
      label={label}
      value={value}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
    />
  );
});
