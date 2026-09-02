import type { KeyboardEvent, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { TextArea } from '../../ui/TextArea/TextArea';

export interface MessageTextInputProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const MessageTextInput = forwardRef<HTMLTextAreaElement, MessageTextInputProps>(
  function MessageTextInput(
    { label, value, placeholder, rows = 3, disabled = false, onChange, onKeyDown, ...rest },
    ref,
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
        {...rest}
      />
    );
  },
);
