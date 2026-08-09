const MINUTES_PER_DAY = 24 * 60;

export function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function minutesToTime(total: number) {
  const safeTotal = Math.min(MINUTES_PER_DAY - 1, Math.max(0, total));
  const hours = Math.floor(safeTotal / 60);
  const minutes = safeTotal % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function formatTime12Hour(value: string) {
  const total = timeToMinutes(value);
  if (total === null) return value;
  const hours24 = Math.floor(total / 60);
  const minutes = total % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export const formatTimeRange12Hour = (start: string, end: string) => `${formatTime12Hour(start)} – ${formatTime12Hour(end)}`;

export function parseTimeInput(rawValue: string, allowHourOnly = true) {
  let value = rawValue.trim().toLowerCase().replace(/\./g, ":").replace(/\s+/g, "");
  if (!value) return null;

  let period: "am" | "pm" | null = null;
  const periodMatch = value.match(/(am|pm|a|p)$/);
  if (periodMatch) {
    period = periodMatch[1].startsWith("p") ? "pm" : "am";
    value = value.slice(0, -periodMatch[1].length);
  }

  let hours: number;
  let minutes: number;
  const separated = /^(\d{1,2}):(\d{1,2})$/.exec(value);
  if (separated) {
    hours = Number(separated[1]);
    minutes = Number(separated[2]);
  } else if (/^\d{3,4}$/.test(value)) {
    hours = Number(value.slice(0, -2));
    minutes = Number(value.slice(-2));
  } else if (allowHourOnly && /^\d{1,2}$/.test(value)) {
    hours = Number(value);
    minutes = 0;
  } else {
    return null;
  }

  if (minutes > 59) return null;
  if (period) {
    if (hours < 1 || hours > 12) return null;
    hours = hours % 12 + (period === "pm" ? 12 : 0);
  } else if (hours > 23) {
    return null;
  }

  return minutesToTime(hours * 60 + minutes);
}

export function shiftTime(value: string, deltaMinutes: number) {
  const current = timeToMinutes(value);
  if (current === null) return null;
  return minutesToTime(current + deltaMinutes);
}

export function isTimeAfter(value: string, minimum: string) {
  const currentMinutes = timeToMinutes(value);
  const minimumMinutes = timeToMinutes(minimum);
  return currentMinutes !== null && minimumMinutes !== null && currentMinutes > minimumMinutes;
}
