import { getMissionStatus, sortMissionsByDateTime, toISODate, type Mission } from "./missions";
import { getScheduledOccurrences, type WeeklyQuest } from "./schedule";

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

export function studyBlocksOn(missions: Mission[], date: string) {
  return missions.filter(task => getMissionStatus(task) === "pending").flatMap(task =>
    (task.studyBlocks ?? []).filter(block => block.date === date).map(block => ({ ...block, taskId: task.id, title: task.title, subject: task.subject })),
  ).sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function planningWarnings(task: Mission, missions: Mission[], schedules: WeeklyQuest[]) {
  const warnings: string[] = [];
  const overlaps = (a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }) => a.startTime < b.endTime && b.startTime < a.endTime;
  for (const block of task.studyBlocks ?? []) {
    if (!block.date || !block.startTime || !block.endTime || block.endTime <= block.startTime) continue;
    if (`${block.date}T${block.endTime}` > `${task.date}T${task.time}`) warnings.push(`${block.date} · ${block.startTime}: termina después de la entrega.`);
    const day = new Date(`${block.date}T12:00:00`);
    if (!Number.isFinite(day.getTime())) continue;
    const classes = getScheduledOccurrences(day, schedules).filter(item => overlaps(block, item));
    classes.forEach(item => warnings.push(`${block.date} · ${block.startTime}: se cruza con ${item.title}.`));
    const otherBlocks = studyBlocksOn(missions.filter(item => item.id !== task.id), block.date);
    otherBlocks.filter(item => overlaps(block, item)).forEach(item => warnings.push(`${block.date} · ${block.startTime}: se cruza con el estudio de ${item.title}.`));
    if ((task.studyBlocks ?? []).some(other => other.id !== block.id && other.date === block.date && overlaps(block, other))) warnings.push(`${block.date} · ${block.startTime}: se cruza con otro bloque de esta tarea.`);
  }
  return [...new Set(warnings)];
}

export function projectSummaries(missions: Mission[]) {
  const groups = new Map<string, Mission[]>();
  missions.forEach(task => { if (!task.project?.trim()) return; const key = JSON.stringify([task.subject, task.project.trim()]); groups.set(key, [...(groups.get(key) ?? []), task]); });
  return [...groups.entries()].map(([key, tasks]) => {
    const pending = sortMissionsByDateTime(tasks.filter(task => getMissionStatus(task) === "pending"));
    return { key, name: tasks[0].project!.trim(), subject: tasks[0].subject, total: tasks.length,
      completed: tasks.filter(task => getMissionStatus(task) === "completed").length,
      awaiting: tasks.filter(task => getMissionStatus(task) === "submitted").length,
      remainingMinutes: pending.reduce((sum, task) => sum + Math.max(0, (task.estimatedMinutes ?? 0) - (task.studiedMinutes ?? 0)), 0),
      unestimated: pending.filter(task => !task.estimatedMinutes).length,
      nextDeadline: pending[0]?.date,
    };
  }).sort((a, b) => (a.nextDeadline ?? "9999").localeCompare(b.nextDeadline ?? "9999") || a.name.localeCompare(b.name, "es"));
}
