import { useMemo, useState, type FormEvent } from 'react';
import { DayPicker } from '@daypicker/react';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton/IconButton';
import styles from './CharacterTraitAddCard.module.css';

export interface CharacterTraitAddCardProps {
  disabled?: boolean;
  onAdd: (trait: { at: string; name: string; value: string }) => void;
  onCancel: () => void;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, '0'),
);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, '0'),
);

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function combineDateAndTime(date: Date, hours: string, minutes: string): Date {
  const next = new Date(date);
  next.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
  return next;
}

export function CharacterTraitAddCard({
  disabled = false,
  onAdd,
  onCancel,
}: CharacterTraitAddCardProps) {
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [hours, setHours] = useState(() => String(new Date().getHours()).padStart(2, '0'));
  const [minutes, setMinutes] = useState(() =>
    String(new Date().getMinutes()).padStart(2, '0'),
  );
  const [hoursOpen, setHoursOpen] = useState(false);
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');

  const atIso = useMemo(() => {
    if (!selectedDay) {
      return '';
    }
    return combineDateAndTime(selectedDay, hours, minutes).toISOString();
  }, [hours, minutes, selectedDay]);

  const dateLabel = formatDateLabel(selectedDay);
  const timeLabel = `${hours}:${minutes}`;
  const canSubmit =
    name.trim().length > 0 && value.trim().length > 0 && Boolean(selectedDay) && Boolean(atIso);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || disabled || !atIso) {
      return;
    }
    onAdd({
      at: atIso,
      name: name.trim(),
      value: value.trim(),
    });
  };

  return (
    <form className={styles.card} aria-label="Add trait" onSubmit={handleSubmit}>
      <div className={styles.field}>
        <div
          className={[styles.atRow, calendarOpen ? styles.atRowCalendarOpen : '']
            .filter(Boolean)
            .join(' ')}
        >
          <IconButton
            icon="calendar"
            label={calendarOpen ? 'Hide calendar' : 'Show calendar'}
            variant="secondary"
            size="sm"
            disabled={disabled}
            current={calendarOpen}
            aria-expanded={calendarOpen}
            aria-controls="trait-at-calendar"
            onClick={() => setCalendarOpen((open) => !open)}
          />
          <div id="trait-at-calendar" className={styles.datePanel}>
            {calendarOpen ? (
              <DayPicker
                mode="single"
                selected={selectedDay}
                onSelect={(day) => {
                  if (day) {
                    setSelectedDay(day);
                  }
                }}
                disabled={disabled}
                aria-label="Trait date"
              />
            ) : (
              <span className={styles.dateLabel} aria-label="Trait date">
                {dateLabel}
              </span>
            )}
          </div>
          <IconButton
            icon="time"
            label={timeOpen ? 'Hide time picker' : 'Show time picker'}
            variant="secondary"
            size="sm"
            disabled={disabled}
            current={timeOpen}
            aria-expanded={timeOpen}
            aria-controls="trait-at-time"
            onClick={() => setTimeOpen((open) => !open)}
          />
          <div id="trait-at-time" className={styles.datePanel}>
            {timeOpen ? (
              <div className={styles.timeRow} role="group" aria-label="Trait time">
                <select
                  className={[styles.timeSelect, hoursOpen ? styles.timeSelectOpen : '']
                    .filter(Boolean)
                    .join(' ')}
                  value={hours}
                  disabled={disabled}
                  aria-label="Hours"
                  size={hoursOpen ? 24 : 1}
                  onFocus={() => setHoursOpen(true)}
                  onBlur={() => setHoursOpen(false)}
                  onChange={(event) => {
                    setHours(event.target.value);
                    setHoursOpen(false);
                    event.currentTarget.blur();
                  }}
                >
                  {HOUR_OPTIONS.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  ))}
                </select>
                <span className={styles.timeSep} aria-hidden="true">
                  :
                </span>
                <select
                  className={[styles.timeSelect, minutesOpen ? styles.timeSelectOpen : '']
                    .filter(Boolean)
                    .join(' ')}
                  value={minutes}
                  disabled={disabled}
                  aria-label="Minutes"
                  size={minutesOpen ? 60 : 1}
                  onFocus={() => setMinutesOpen(true)}
                  onBlur={() => setMinutesOpen(false)}
                  onChange={(event) => {
                    setMinutes(event.target.value);
                    setMinutesOpen(false);
                    event.currentTarget.blur();
                  }}
                >
                  {MINUTE_OPTIONS.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className={styles.dateLabel} aria-label="Trait time">
                {timeLabel}
              </span>
            )}
          </div>
        </div>
      </div>
      <label className={styles.field}>
        <span className={styles.label}>Name</span>
        <input
          className={styles.input}
          type="text"
          value={name}
          disabled={disabled}
          autoComplete="off"
          placeholder="e.g. hair color"
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Value</span>
        <input
          className={styles.input}
          type="text"
          value={value}
          disabled={disabled}
          autoComplete="off"
          placeholder="e.g. dark brown"
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <div className={styles.actions}>
        <Button type="submit" variant="tab" disabled={disabled || !canSubmit}>
          Add
        </Button>
        <Button type="button" variant="tab" disabled={disabled} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
