import { academicWeek, minuteLabel, studyBlocksOn } from "./academic";
import { availableSlots, type Availability } from "./planning";
import { getMissionStatus, toISODate, type Mission, type StudyBlock } from "./missions";
import { getScheduledOccurrences, type WeeklyQuest } from "./schedule";

export function semesterWeeks(start: string, end: string, tasks: Mission[]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) return [];
  const day = academicWeek(new Date(`${start}T12:00:00`))[0];
  const weeks = [];
  for (let i = 0; i < 54 && toISODate(day) <= end; i++, day.setDate(day.getDate() + 7)) {
    const dates = academicWeek(day).map(toISODate);
    const items = tasks.filter(task => task.date >= start && task.date <= end && dates.includes(task.date) && (task.kind === "exam" || task.kind === "major" || task.priority === "boss"));
    weeks.push({ start: dates[0], end: dates[6], tasks: items, crowded: items.length >= 3 });
  }
  return weeks;
}

// One session per available day, spread across the preparation window.
// Never create time outside availability, in the past, or on the exam day.
export function prepareExam(task: Mission, topics: string[], minutes: number, start: string, availability: Availability, tasks: Mission[], schedules: WeeklyQuest[], now: Date) {
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 180 || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return [];
  const day = new Date(`${start}T12:00:00`);
  const candidates: Omit<StudyBlock, "id">[] = [];
  const allTasks = [...tasks.filter(item => item.id !== task.id), task];
  for (let i = 0; i < 366 && toISODate(day) < task.date; i++, day.setDate(day.getDate() + 1)) {
    const date = toISODate(day);
    const gaps = availableSlots(day, availability, [...getScheduledOccurrences(day, schedules), ...studyBlocksOn(allTasks, date)], now);
    const gap = gaps.find(slot => slot.end - Math.ceil(slot.start / 5) * 5 >= minutes);
    if (gap) { const begin = Math.ceil(gap.start / 5) * 5; candidates.push({ date, startTime: minuteLabel(begin), endTime: minuteLabel(begin + minutes), status: "planned" }); }
  }
  const pending = [...new Set(topics.map(topic => topic.trim()).filter(Boolean))].filter(topic => !task.studyBlocks?.some(block => block.topic === topic));
  const count = Math.min(pending.length, candidates.length, Math.max(0, 40 - (task.studyBlocks?.length ?? 0)));
  return Array.from({ length: count }, (_, i) => ({ ...candidates[count === 1 ? 0 : Math.floor(i * (candidates.length - 1) / (count - 1))], topic: pending[i] }));
}

export function weeklyReview(tasks: Mission[], anchor: Date, now: Date) {
  const days = academicWeek(anchor).map(toISODate);
  const inWeek = (date: string) => date >= days[0] && date <= days[6];
  const sessions = tasks.flatMap(task => (task.studySessions ?? []).filter(session => inWeek(toISODate(new Date(session.finishedAt)))));
  const relevant = tasks.filter(task => inWeek(task.date) || task.studyBlocks?.some(block => inWeek(block.date)) || task.studySessions?.some(session => inWeek(toISODate(new Date(session.finishedAt)))));
  const pastBlocks = tasks.flatMap(task => (task.studyBlocks ?? []).filter(block => inWeek(block.date) && new Date(`${block.date}T${block.endTime}:00`).getTime() < now.getTime()).map(block => ({ task, block })));
  const pending = tasks.filter(task => getMissionStatus(task) === "pending" && task.date <= days[6]);
  return { relevant, pending, pastBlocks, studied: sessions.reduce((sum, item) => sum + item.minutes, 0), estimated: relevant.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0), accumulated: relevant.reduce((sum, task) => sum + (task.studiedMinutes ?? 0), 0), undated: tasks.reduce((sum, task) => sum + Math.max(0, (task.studiedMinutes ?? 0) - (task.studySessions ?? []).reduce((total, session) => total + session.minutes, 0)), 0) };
}

export function rescheduleError(task: Mission, block: StudyBlock, tasks: Mission[], schedules: WeeklyQuest[], availability: Availability, now: Date): string | null {
  const start = new Date(`${block.date}T${block.startTime}:00`);
  const end = new Date(`${block.date}T${block.endTime}:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start < now || end <= start) return "Elige un intervalo futuro válido, dentro del mismo día.";
  if (end > new Date(`${task.date}T${task.time}:00`)) return "El bloque terminaría después de la entrega. Revisa la fecha de la tarea primero.";
  const otherTasks = [...tasks.filter(item => item.id !== task.id), { ...task, studyBlocks: task.studyBlocks?.filter(item => item.id !== block.id) }];
  const slots = availableSlots(start, availability, [...getScheduledOccurrences(start, schedules), ...studyBlocksOn(otherTasks, block.date)], now);
  const minute = (time: string) => Number(time.slice(0,2)) * 60 + Number(time.slice(3));
  if (!slots.some(slot => minute(block.startTime) >= slot.start && minute(block.endTime) <= slot.end)) return "Ese horario no está libre dentro de tu disponibilidad. Revisa clases, compromisos y otros bloques.";
  return null;
}
