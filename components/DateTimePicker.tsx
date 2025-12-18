"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  addYears,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
  subYears,
} from "date-fns";

type DateTimeValue = {
  date?: string;
  time?: string;
};

type DateTimePickerProps = {
  value: DateTimeValue;
  onChange: (next: DateTimeValue) => void;
  disableFuture?: boolean;
};

const buildCalendarGrid = (monthDate: Date) => {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 0 });
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};

export default function DateTimePicker({
  value,
  onChange,
  disableFuture = false,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [isTimeEnabled, setIsTimeEnabled] = useState(false);
  const defaultTime = "23:59";

  const selectedDate = useMemo(() => {
    if (!value.date) return null;
    const parsed = parse(value.date, "yyyy-MM-dd", new Date());
    return isValid(parsed) ? parsed : null;
  }, [value.date]);

  const [displayMonth, setDisplayMonth] = useState<Date>(
    selectedDate ?? new Date(),
  );

  useEffect(() => {
    if (selectedDate) {
      // Safe sync: update visible month when the selected date changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayMonth(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    // Safe sync: reflect controlled time prop into local toggle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTimeEnabled(Boolean(value.time));
  }, [value.time]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("pointerdown", handleClickOutside);
    return () => window.removeEventListener("pointerdown", handleClickOutside);
  }, [isOpen]);

  const calendarDays = useMemo(() => buildCalendarGrid(displayMonth), [displayMonth]);
  const today = useMemo(() => new Date(), []);

  const handleSelectDate = (dateValue: Date) => {
    const nextDate = format(dateValue, "yyyy-MM-dd");
    onChange({ date: nextDate, time: value.time });
    setIsOpen(false);
  };

  const canSelect = (dateValue: Date) => {
    if (!disableFuture) return true;
    return !isAfter(dateValue, today);
  };

  const displayLabel = selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date";
  const hasDate = Boolean(selectedDate);

  return (
    <div className="space-y-3" ref={pickerRef}>
      <div className="relative space-y-2">
        <label className="block text-base font-semibold text-zinc-800 dark:text-zinc-100">
          Date of the moment
        </label>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-base shadow-sm transition-all focus:shadow-sm dark:bg-zinc-800 dark:text-zinc-50 ${
            hasDate
              ? "border-emerald-200 ring-1 ring-emerald-100 hover:border-emerald-300 dark:border-emerald-700/60 dark:ring-emerald-900/40"
              : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
          } focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:focus:border-zinc-500 dark:focus:ring-zinc-800`}
        >
          <span>{displayLabel}</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">▾</span>
        </button>
        {isOpen ? (
          <div className="absolute z-30 mt-2 w-[320px] rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDisplayMonth((prev) => subYears(prev, 1))}
                  className="rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Previous year"
                >
                  «
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMonth((prev) => subMonths(prev, 1))}
                  className="rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Previous month"
                >
                  ←
                </button>
              </div>
              <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {format(displayMonth, "MMMM yyyy")}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDisplayMonth((prev) => addMonths(prev, 1))}
                  className="rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Next month"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMonth((prev) => addYears(prev, 1))}
                  className="rounded-md border border-zinc-200 px-2 py-1 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  aria-label="Next year"
                >
                  »
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-zinc-400 dark:text-zinc-500">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                <div key={label}>{label}</div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-sm">
              {calendarDays.map((day) => {
                const isCurrentMonth = isSameMonth(day, displayMonth);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const disabled = !canSelect(day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleSelectDate(day)}
                    disabled={!isCurrentMonth || disabled}
                    className={`rounded-lg px-2 py-2 transition ${
                      isSelected
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : isCurrentMonth
                          ? "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          : "text-zinc-300 dark:text-zinc-700"
                    } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        {!isTimeEnabled ? (
          <button
            type="button"
            onClick={() => {
              setIsTimeEnabled(true);
              onChange({ date: value.date, time: value.time || defaultTime });
            }}
            className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
          >
            Add a time
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Optional
            </span>
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
                Time
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsTimeEnabled(false);
                  onChange({ date: value.date, time: undefined });
                }}
                className="text-xs font-semibold text-zinc-500 transition hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Remove time
              </button>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Local time — defaults to 11:59 PM if you leave it untouched.
            </p>
            <input
              type="time"
              step={60}
              value={value.time ?? defaultTime}
              onChange={(event) => onChange({ date: value.date, time: event.target.value })}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base shadow-sm outline-none transition-all hover:border-zinc-300 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:border-zinc-600 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
            />
          </div>
        )}
      </div>
    </div>
  );
}
