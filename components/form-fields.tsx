"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

function formatInteger(value: string | number | null | undefined) {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}

export function FormattedNumberInput({ name, defaultValue, placeholder, className = "", min = 0, max }: { name: string; defaultValue?: string | number | null; placeholder?: string; className?: string; min?: number; max?: number }) {
  const [value, setValue] = useState(formatInteger(defaultValue));
  return <input name={name} value={value} inputMode="numeric" pattern="[0-9.]*" type="text" placeholder={placeholder} className={className} onChange={(event) => {
    const digits = event.target.value.replace(/[^0-9]/g, "");
    const numeric = Number(digits || 0);
    if (max !== undefined && numeric > max) return;
    if (numeric < min && digits) return;
    setValue(formatInteger(digits));
  }} />;
}

export function SmartSelect({ name, value: initialValue, options, className = "", onValueChange }: { name: string; value: string; options: Array<{ value: string; label: string; description?: string }>; className?: string; onValueChange?: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  const selected = useMemo(() => options.find((item) => item.value === value) ?? options[0], [options, value]);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);
  return <div className={`smart-select ${className}`} onClick={(event) => event.stopPropagation()}>
    <input type="hidden" name={name} value={value} />
    <button type="button" className="smart-select-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span><strong>{selected?.label}</strong>{selected?.description && <small>{selected.description}</small>}</span><ChevronDown size={16} />
    </button>
    {open && <div className="smart-select-menu" role="listbox">
      {options.map((option) => <button type="button" role="option" aria-selected={option.value === value} key={option.value} className="smart-select-option" onClick={() => { setValue(option.value); onValueChange?.(option.value); setOpen(false); }}><span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>{option.value === value && <Check size={15} />}</button>)}
    </div>}
  </div>;
}

export function DateTimeField({ name, defaultValue, label = "Tanggal dan waktu" }: { name: string; defaultValue?: string | null; label?: string }) {
  const initial = defaultValue ? new Date(defaultValue) : null;
  const [date, setDate] = useState(initial && !Number.isNaN(initial.getTime()) ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(initial) : "");
  const [time, setTime] = useState(initial && !Number.isNaN(initial.getTime()) ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(initial) : "10:00");
  return <div className="date-time-field"><span className="field-label">{label}</span><div className="date-time-grid"><label><span>Tanggal</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label><span>Jam</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label></div><input type="hidden" name={name} value={date ? `${date}T${time || "00:00"}` : ""} /></div>;
}
