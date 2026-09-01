import type { ReactNode, Ref, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import styles from './TextArea.module.css';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  labelAdornment?: ReactNode;
  hideLabel?: boolean;
}

export const TextArea = forwardRef(function TextArea(
  { label, labelAdornment, hideLabel = false, id, className, ...rest }: TextAreaProps,
  ref: Ref<HTMLTextAreaElement>,
) {
  const inputId = id ?? `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const classes = [styles.textarea, className].filter(Boolean).join(' ');

  return (
    <div className={styles.wrapper}>
      {hideLabel ? null : (
        <div className={styles.labelRow}>
          <label className={styles.label} htmlFor={inputId}>
            {label}
          </label>
          {labelAdornment}
        </div>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={classes}
        aria-label={hideLabel ? label : undefined}
        {...rest}
      />
    </div>
  );
});
