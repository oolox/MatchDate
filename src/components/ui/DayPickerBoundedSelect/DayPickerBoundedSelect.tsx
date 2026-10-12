import {
  Children,
  useState,
  type SelectHTMLAttributes,
} from 'react';

/**
 * DayPicker `Select` stand-in: expands to a scrollable listbox (max 6rem)
 * instead of the OS native popup (which cannot be height-limited).
 */
export function DayPickerBoundedSelect(
  props: SelectHTMLAttributes<HTMLSelectElement>,
) {
  const [open, setOpen] = useState(false);
  const optionCount = Children.count(props.children);
  const { className, onBlur, onChange, onFocus, ...rest } = props;

  return (
    <select
      {...rest}
      className={[className, open ? 'rdp-dropdown--open' : ''].filter(Boolean).join(' ')}
      size={open ? Math.max(optionCount, 2) : 1}
      onFocus={(event) => {
        setOpen(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setOpen(false);
        onBlur?.(event);
      }}
      onChange={(event) => {
        onChange?.(event);
        setOpen(false);
        event.currentTarget.blur();
      }}
    />
  );
}
