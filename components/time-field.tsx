"use client";

import { Keyboard, Minus, Plus, Timer } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { formatTime12Hour, isTimeAfter, minutesToTime, parseTimeInput, shiftTime, timeToMinutes } from "@/lib/time";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  after?: string;
};

export function TimeField({ label, value, onChange, required = false, after }: Props) {
  const generatedId = useId();
  const inputId = `time-${generatedId.replace(/:/g, "")}`;
  const hintId = `${inputId}-hint`;
  const inputRef = useRef<HTMLInputElement>(null);
  const focused = useRef(false);
  const [draft, setDraft] = useState(() => formatTime12Hour(value));

  useEffect(() => {
    if (!focused.current) setDraft(formatTime12Hour(value));
  }, [value]);

  const normalizedDraft = parseTimeInput(draft);
  const invalidFormat = Boolean(draft) && !normalizedDraft;
  const invalidRange = Boolean(normalizedDraft && after && !isTimeAfter(normalizedDraft, after));
  const error = invalidFormat
    ? "Usa una hora válida, por ejemplo 8:30 AM."
    : invalidRange
      ? `Debe ser posterior a ${formatTime12Hour(after ?? "")}.`
      : "";

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.setCustomValidity(error || (required && !draft ? "Introduce una hora." : ""));
  }, [draft, error, required]);

  const updateDraft = (nextDraft: string) => {
    setDraft(nextDraft);
    const normalized = parseTimeInput(nextDraft, false);
    if (normalized && (!after || isTimeAfter(normalized, after))) onChange(normalized);
  };

  const commit = () => {
    const normalized = parseTimeInput(draft);
    if (!normalized || (after && !isTimeAfter(normalized, after))) return false;
    setDraft(formatTime12Hour(normalized));
    onChange(normalized);
    return true;
  };

  const adjust = (deltaMinutes: number) => {
    let base = parseTimeInput(draft) ?? value;
    if (after && (!isTimeAfter(base, after) || (deltaMinutes < 0 && (timeToMinutes(base) ?? 0) + deltaMinutes <= (timeToMinutes(after) ?? 0)))) {
      base = minutesToTime((timeToMinutes(after) ?? 0) + 15);
      deltaMinutes = 0;
    }
    const nextValue = shiftTime(base, deltaMinutes);
    if (!nextValue) return;
    setDraft(formatTime12Hour(nextValue));
    onChange(nextValue);
    inputRef.current?.focus();
  };

  return (
    <div className={`time-field ${error ? "invalid" : ""}`}>
      <label htmlFor={inputId}>{label}</label>
      <div className="time-field-control">
        <Timer size={17} aria-hidden="true" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="text"
          autoComplete="off"
          required={required}
          maxLength={8}
          value={draft}
          aria-describedby={hintId}
          aria-invalid={Boolean(error)}
          placeholder="8:30 AM"
          onFocus={(event) => {
            focused.current = true;
            event.currentTarget.select();
          }}
          onChange={(event) => updateDraft(event.target.value)}
          onBlur={() => {
            focused.current = false;
            commit();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault();
              adjust(event.shiftKey ? 60 : 15);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              adjust(event.shiftKey ? -60 : -15);
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (commit()) event.currentTarget.blur();
            }
          }}
        />
        <div className="time-stepper" aria-label={`Ajustar ${label.toLowerCase()}`}>
          <button type="button" onClick={() => adjust(-15)} aria-label={`Restar 15 minutos a ${label.toLowerCase()}`} title="Restar 15 minutos"><Minus size={12} /><span>15</span></button>
          <button type="button" onClick={() => adjust(15)} aria-label={`Sumar 15 minutos a ${label.toLowerCase()}`} title="Sumar 15 minutos"><Plus size={12} /><span>15</span></button>
        </div>
      </div>
      <small id={hintId} className="time-field-hint">
        {error ? <span>{error}</span> : <><Keyboard size={11} aria-hidden="true" /> Escribe 8:30 AM o 2:15 PM · flechas ±15 min</>}
      </small>
    </div>
  );
}
