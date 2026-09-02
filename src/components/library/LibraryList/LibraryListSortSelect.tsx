import { DropdownSelect } from '../../ui/DropdownSelect';
import {
  LIBRARY_SORT_FIELD_OPTIONS,
  type LibrarySortDirection,
  type LibrarySortField,
} from './libraryListSort';

export interface LibraryListSortSelectProps {
  field: LibrarySortField;
  direction: LibrarySortDirection;
  onFieldChange: (field: LibrarySortField) => void;
  onToggleDirection: () => void;
  disabled?: boolean;
  className?: string;
}

export function LibraryListSortSelect({
  field,
  direction,
  onFieldChange,
  onToggleDirection,
  disabled = false,
  className,
}: LibraryListSortSelectProps) {
  const directionLabel = direction === 'asc' ? 'ascending' : 'descending';

  return (
    <DropdownSelect
      className={className}
      aria-label={`Sort ${directionLabel}`}
      icon="sort"
      options={LIBRARY_SORT_FIELD_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      value={field}
      disabled={disabled}
      onChange={(value) => {
        const next = value as LibrarySortField;
        if (next === field) {
          onToggleDirection();
          return;
        }
        onFieldChange(next);
      }}
    />
  );
}
