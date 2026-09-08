import { getMissionStatus, sortMissionsByDateTime, toISODate, type Mission } from "./missions";

export function academicWeek(anchor: Date) {
  const monday = new Date(anchor);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

export function pendingTasks(missions: Mission[], reference = new Date()) {
  const today = toISODate(reference);
  const pending = sortMissionsByDateTime(missions.filter((task) => getMissionStatus(task) === "pending"));
  return {
    overdue: pending.filter((task) => task.date < today),
    today: pending.filter((task) => task.date === today),
    upcoming: pending.filter((task) => task.date > today),
  };
}

export function freeStudySlots(blocks: { startTime: string; endTime: string }[]) {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const occupied = blocks.map((block) => ({ start: Math.max(480, minutes(block.startTime)), end: Math.min(1200, minutes(block.endTime)) }))
    .filter((block) => Number.isFinite(block.start) && Number.isFinite(block.end) && block.end > block.start).sort((a, b) => a.start - b.start);
  const slots: { start: number; end: number }[] = [];
  let cursor = 480;
  for (const block of occupied) {
    if (block.start - cursor >= 30) slots.push({ start: cursor, end: block.start });
    cursor = Math.max(cursor, block.end);
  }
  if (1200 - cursor >= 30) slots.push({ start: cursor, end: 1200 });
  return slots;
}

export const minuteLabel = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export const durationLabel = (minutes: number) => minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}` : `${minutes} min`;
