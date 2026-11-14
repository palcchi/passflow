"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

const POPOVER_EVENT = "passflow:popover-open";

function announcePopover(id: string) {
  window.dispatchEvent(new CustomEvent<string>(POPOVER_EVENT, { detail: id }));
}

function useExclusivePopover(open: boolean, setOpen: (value: boolean) => void) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOtherOpen = (event: Event) => {
      const custom = event as CustomEvent<string>;
      if (custom.detail !== id) setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener(POPOVER_EVENT, onOtherOpen);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener(POPOVER_EVENT, onOtherOpen);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [id, setOpen]);

  useEffect(() => {
    if (open) announcePopover(id);
  }, [id, open]);

  return { id, rootRef };
}

function formatInteger(value: string | number | null | undefined) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  return digits ? Number(digits).toLocaleString("en-US") : "";
}

export function FormattedNumberInput({
  name,
  defaultValue,
  placeholder,
  className = "",
  min = 0,
  max,
}: {
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  className?: string;
  min?: number;
  max?: number;
}) {
  const [value, setValue] = useState(formatInteger(defaultValue));
  return (
    <input
      name={name}
      value={value}
      inputMode="numeric"
      pattern="[0-9,]*"
      type="text"
      placeholder={placeholder}
      className={className}
      onChange={(event) => {
        const digits = event.target.value.replace(/[^0-9]/g, "");
        const numeric = Number(digits || 0);
        if (max !== undefined && numeric > max) return;
        if (numeric < min && digits) return;
        setValue(formatInteger(digits));
      }}
    />
  );
}

export function SmartSelect({
  name,
  value: initialValue,
  options,
  className = "",
  onValueChange,
}: {
  name: string;
  value: string;
  options: Array<{ value: string; label: string; description?: string }>;
  className?: string;
  onValueChange?: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(initialValue);
  const value = onValueChange ? initialValue : internalValue;
  const reduceMotion = useReducedMotion();
  const { id, rootRef } = useExclusivePopover(open, setOpen);
  const selected = useMemo(
    () => options.find((item) => item.value === value) ?? options[0],
    [options, value],
  );

  function choose(next: string) {
    if (onValueChange) onValueChange(next);
    else setInternalValue(next);
    setOpen(false);
  }

  return (
    <div className={`smart-select ${className}`} ref={rootRef}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        className="smart-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id + "-menu"}
        onClick={() => setOpen(!open)}
      >
        <span>
          <strong>{selected?.label}</strong>
          {selected?.description && <small>{selected.description}</small>}
        </span>
        <ChevronDown
          size={16}
          className={`smart-select-chevron ${open ? "is-open" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={id + "-menu"}
            className="smart-select-menu liquid-popover"
            role="listbox"
            initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.99 }}
            transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {options.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                key={option.value}
                className="smart-select-option"
                onClick={() => choose(option.value)}
              >
                <span>
                  <strong>{option.label}</strong>
                  {option.description && <small>{option.description}</small>}
                </span>
                {option.value === value && <Check size={15} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DateTimeField({
  name,
  defaultValue,
  label = "Date and time",
}: {
  name: string;
  defaultValue?: string | null;
  label?: string;
}) {
  const initial = defaultValue ? new Date(defaultValue) : null;
  const initialDate =
    initial && !Number.isNaN(initial.getTime())
      ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(initial)
      : "";
  const initialTime =
    initial && !Number.isNaN(initial.getTime())
      ? new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(initial)
      : "";

  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [hour, setHour] = useState(initialTime.split(":")[0] || "10");
  const [minute, setMinute] = useState(initialTime.split(":")[1] || "00");
  const [timeOpen, setTimeOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const { id, rootRef } = useExclusivePopover(open, setOpen);
  const { id: timeId, rootRef: timeRootRef } = useExclusivePopover(timeOpen, setTimeOpen);
  const [month, setMonth] = useState(() => {
    const source = initial && !Number.isNaN(initial.getTime()) ? initial : new Date();
    return new Date(source.getFullYear(), source.getMonth(), 1);
  });

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from(
    { length: Math.ceil((firstDay + daysInMonth) / 7) * 7 },
    (_, index) => {
      const day = index - firstDay + 1;
      return day > 0 && day <= daysInMonth ? day : null;
    },
  );
  const dateLabel = date
    ? new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date}T00:00:00`))
    : "Choose date";
  function chooseDay(day: number) {
    const next = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setDate(next);
    setOpen(false);
  }

  return (
    <div className="date-time-field">
      <span className="field-label">{label}</span>
      <div className="date-time-grid">
        <div className="date-picker-wrap" ref={rootRef}>
          <span>Date</span>
          <button
            type="button"
            className="date-picker-trigger"
            aria-expanded={open}
            aria-controls={id + "-calendar"}
            onClick={() => setOpen(!open)}
          >
            <CalendarDays size={16} />
            <span>{dateLabel}</span>
            <ChevronDown
              size={15}
              className={`smart-select-chevron ${open ? "is-open" : ""}`}
            />
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                id={id + "-calendar"}
                className="date-picker-popover liquid-popover"
                initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.99 }}
                transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <div className="date-picker-head">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <strong>
                    {new Intl.DateTimeFormat("en-US", {
                      month: "long",
                      year: "numeric",
                    }).format(month)}
                  </strong>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="calendar-weekdays">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="calendar-grid">
                  {cells.map((day, index) =>
                    day ? (
                      <button
                        type="button"
                        key={`${year}-${monthIndex}-${day}`}
                        className={
                          date ===
                          `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                            ? "is-selected"
                            : ""
                        }
                        onClick={() => chooseDay(day)}
                      >
                        {day}
                      </button>
                    ) : (
                      <span key={`empty-${index}`} />
                    ),
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="time-picker-wrap" ref={timeRootRef}>
          <span>Time</span>
          <button type="button" className="date-picker-trigger time-picker-trigger" aria-label={label + " time"} aria-expanded={timeOpen} aria-controls={timeId + "-menu"} onClick={() => setTimeOpen(!timeOpen)}>
            <span className="time-picker-value">{time ? hour + ":" + minute : "Choose time"}</span>
            <ChevronDown size={15} className={"smart-select-chevron " + (timeOpen ? "is-open" : "")} />
          </button>
          <AnimatePresence>
            {timeOpen && (
              <motion.div id={timeId + "-menu"} className="time-picker-popover liquid-popover" initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.99 }} transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.2, 0.8, 0.2, 1] }}>
                <div className="time-picker-column"><span>Hour</span><div className="time-picker-options" aria-label="Choose hour">
                  {Array.from({ length: 24 }, (_, value) => String(value).padStart(2, "0")).map((value) => <button type="button" key={value} className={hour === value ? "is-selected" : ""} aria-pressed={hour === value} onClick={() => { setHour(value); setTime(value + ":" + minute); }}>{value}</button>)}
                </div></div>
                <div className="time-picker-column"><span>Minute</span><div className="time-picker-options" aria-label="Choose minute">
                  {Array.from({ length: 60 }, (_, value) => String(value).padStart(2, "0")).map((value) => <button type="button" key={value} className={minute === value ? "is-selected" : ""} aria-pressed={minute === value} onClick={() => { setMinute(value); setTime(hour + ":" + value); }}>{value}</button>)}
                </div></div>
                <div className="time-picker-footer"><span>WIB · UTC+7</span><button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => setTimeOpen(false)}>Done</button></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="date-time-hint">Choose the date and time in Western Indonesia Time (WIB).</p>
      <input type="hidden" name={name} value={date && time ? date + "T" + time + ":00+07:00" : ""} />
    </div>
  );
}
