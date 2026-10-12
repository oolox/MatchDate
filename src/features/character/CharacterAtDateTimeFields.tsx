import { useEffect, useMemo, useState } from 'react';
import { DayPicker } from '@daypicker/react';
import { DayPickerBoundedSelect } from '../../components/ui/DayPickerBoundedSelect/DayPickerBoundedSelect';
import { IconButton } from '../../components/ui/IconButton/IconButton';
import styles from './CharacterAtDateTimeFields.module.css';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, '0'),
);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, '0'),
);

const CALENDAR_START_MONTH = new Date(1900, 0);
const CALENDAR_END_MONTH = new Date(new Date().getFullYear() + 5, 11);

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

function initialFromAtIso(atIso: string | undefined): {
  selectedDay: Date;
  hours: string;
  minutes: string;
} {
  const fallback = new Date();
  if (!atIso?.trim()) {
    return {
      selectedDay: fallback,
      hours: String(fallback.getHours()).padStart(2, '0'),
      minutes: String(fallback.getMinutes()).padStart(2, '0'),
    };
  }
  const parsed = new Date(atIso);
  if (Number.isNaN(parsed.getTime())) {
    return {
      selectedDay: fallback,
      hours: String(fallback.getHours()).padStart(2, '0'),
      minutes: String(fallback.getMinutes()).padStart(2, '0'),
    };
  }
  return {
    selectedDay: parsed,
    hours: String(parsed.getHours()).padStart(2, '0'),
    minutes: String(parsed.getMinutes()).padStart(2, '0'),
  };
}

export interface CharacterAtDateTimeFieldsProps {
  disabled?: boolean;
  /** Used for aria labels / element ids (single token preferred). */
  idPrefix?: string;
  /** When set, date/time controls start at this ISO timestamp (edit forms). */
  initialAtIso?: string;
  onAtChange: (atIso: string) => void;
}

export function CharacterAtDateTimeFields({
  disabled = false,
  idPrefix = 'at',
  initialAtIso,
  onAtChange,
}: CharacterAtDateTimeFieldsProps) {
  const [selectedDay, setSelectedDay] = useState<Date>(
    () => initialFromAtIso(initialAtIso).selectedDay,
  );
  const [hours, setHours] = useState(
    () => initialFromAtIso(initialAtIso).hours,
  );
  const [minutes, setMinutes] = useState(
    () => initialFromAtIso(initialAtIso).minutes,
  );
  const [hoursOpen, setHoursOpen] = useState(false);
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  const atIso = useMemo(() => {
    if (!selectedDay) {
      return '';
    }
    return combineDateAndTime(selectedDay, hours, minutes).toISOString();
  }, [hours, minutes, selectedDay]);

  useEffect(() => {
    onAtChange(atIso);
  }, [atIso, onAtChange]);

  const dateLabel = formatDateLabel(selectedDay);
  const timeLabel = `${hours}:${minutes}`;
  const calendarId = `${idPrefix}-calendar`;
  const timeId = `${idPrefix}-time`;

  return (
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
        aria-controls={calendarId}
        onClick={() => setCalendarOpen((open) => !open)}
      />
      <div id={calendarId} className={styles.datePanel}>
        {calendarOpen ? (
          <DayPicker
            mode="single"
            captionLayout="dropdown"
            hideNavigation
            startMonth={CALENDAR_START_MONTH}
            endMonth={CALENDAR_END_MONTH}
            selected={selectedDay}
            onSelect={(day) => {
              if (day) {
                setSelectedDay(day);
              }
            }}
            disabled={disabled}
            aria-label="Date"
            components={{ Select: DayPickerBoundedSelect }}
          />
        ) : (
          <span className={styles.dateLabel} aria-label="Date">
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
        aria-controls={timeId}
        onClick={() => setTimeOpen((open) => !open)}
      />
      <div id={timeId} className={styles.datePanel}>
        {timeOpen ? (
          <div className={styles.timeRow} role="group" aria-label="Time">
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
          <span className={styles.dateLabel} aria-label="Time">
            {timeLabel}
          </span>
        )}
      </div>
    </div>
  );
}
