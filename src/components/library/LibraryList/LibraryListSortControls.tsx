import { ButtonBar } from '../../ui/ButtonBar';
import {
  LIBRARY_SORT_FIELD_OPTIONS,
  type LibrarySortDirection,
  type LibrarySortField,
} from './libraryListSort';

export interface LibraryListSortControlsProps {
  field: LibrarySortField;
  direction: LibrarySortDirection;
  onFieldChange: (field: LibrarySortField) => void;
  onToggleDirection: () => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LibraryListSortControls({
  field,
  direction,
  onFieldChange,
  onToggleDirection,
  disabled = false,
  open,
  onOpenChange,
}: LibraryListSortControlsProps) {
  const directionIcon = direction === 'asc' ? 'caret-up' : 'caret-down';

  return (
    <ButtonBar
      label="Sort"
      labelIcon="sort"
      value={field}
      disabled={disabled}
      open={open}
      onOpenChange={onOpenChange}
      items={LIBRARY_SORT_FIELD_OPTIONS.map((option) => ({
        id: option.value,
        label: option.label,
        icon: directionIcon,
        ariaLabel:
          option.value === field
            ? `${option.label}, ${direction === 'asc' ? 'ascending' : 'descending'}`
            : option.label,
      }))}
      onChange={(id) => {
        const next = id as LibrarySortField;
        if (next === field) {
          onToggleDirection();
          return;
        }
        onFieldChange(next);
      }}
    />
  );
}
