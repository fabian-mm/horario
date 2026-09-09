import { z } from "zod";
import { academicWeek, studyBlocksOn } from "./academic";
import { getMissionStatus, toISODate, type Mission } from "./missions";
import { getScheduledOccurrences, type WeeklyQuest } from "./schedule";

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const days = z.array(z.number().int().min(1).max(7)).max(7).refine(values => new Set(values).size === values.length);
const range = { startTime: clock, endTime: clock };
const commitment = z.object({ id: z.string().min(1).max(100), title: z.string().trim().min(1).max(100), days, ...range }).refine(value => value.endTime > value.startTime);
export const availabilitySchema = z.object({ days, ...range, commitments: z.array(commitment).max(50) }).refine(value => value.endTime > value.startTime);
export const concentrationSchema = z.object({ mode: z.enum(["free", "interval"]), workMinutes: z.number().int().min(1).max(180), breakMinutes: z.number().int().min(1).max(60) });
export const planningSchema = z.object({
  availability: availabilitySchema,
  dailyFocus: z.object({ date: z.iso.date(), missionIds: z.array(z.string().min(1).max(100)).max(3).refine(ids => new Set(ids).size === ids.length) }).nullable(),
  concentration: concentrationSchema,
});
export const planningPatchSchema = planningSchema.partial().strict().refine(value => Object.keys(value).length > 0);
export type Planning = z.infer<typeof planningSchema>;
export type Availability = Planning["availability"];
export type Concentration = Planning["concentration"];
export const defaultPlanning: Planning = { availability: { days: [1,2,3,4,5,6,7], startTime: "08:00", endTime: "20:00", commitments: [] }, dailyFocus: null, concentration: { mode: "free", workMinutes: 25, breakMinutes: 5 } };
export const timeMinutes = (time: string) => Number(time.slice(0,2)) * 60 + Number(time.slice(3));
export const weekdayNumber = (date: Date) => date.getDay() || 7;

export function commitmentsOn(availability: Availability, date: Date) {
  return availability.commitments.filter(item => item.days.includes(weekdayNumber(date)));
}

// Merge all overlapping intervals before subtracting them. Reserved study is
// capacity already allocated, not extra work to subtract twice from the load.
export function availableSlots(date: Date, availability: Availability, busy: { startTime: string; endTime: string }[], reference?: Date) {
  if (!availability.days.includes(weekdayNumber(date))) return [];
  const iso = toISODate(date);
  if (reference && iso < toISODate(reference)) return [];
  const start = Math.max(timeMinutes(availability.startTime), reference && iso === toISODate(reference) ? reference.getHours() * 60 + reference.getMinutes() : 0);
  const end = timeMinutes(availability.endTime);
  let cursor = start;
  const intervals = [...busy, ...commitmentsOn(availability, date)].map(item => ({ start: Math.max(start, timeMinutes(item.startTime)), end: Math.min(end, timeMinutes(item.endTime)) })).filter(item => item.end > item.start).sort((a,b) => a.start - b.start);
  const gaps: { start: number; end: number }[] = [];
  for (const item of intervals) { if (item.start > cursor) gaps.push({ start: cursor, end: item.start }); cursor = Math.max(cursor, item.end); }
  if (cursor < end) gaps.push({ start: cursor, end });
  return gaps;
}

export function weeklyCapacity(anchor: Date, availability: Availability, tasks: Mission[], schedules: WeeklyQuest[], reference = new Date()) {
  const week = academicWeek(anchor);
  const end = toISODate(week[6]);
  const start = toISODate(week[0]);
  const selectedIds = new Set(week.flatMap(day => studyBlocksOn(tasks, toISODate(day)).map(block => block.taskId)));
  const relevant = tasks.filter(task => getMissionStatus(task) === "pending" && ((task.date >= start && task.date <= end) || selectedIds.has(task.id) || (start <= toISODate(reference) && end >= toISODate(reference) && task.date < start)));
  let capacity = 0;
  let unreserved = 0;
  for (const day of week) {
    const classes = getScheduledOccurrences(day, schedules);
    const sum = (slots: { start: number; end: number }[]) => slots.reduce((total, slot) => total + slot.end - slot.start, 0);
    capacity += sum(availableSlots(day, availability, classes, reference));
    unreserved += sum(availableSlots(day, availability, [...classes, ...studyBlocksOn(tasks, toISODate(day))], reference));
  }
  const workload = relevant.reduce((sum, task) => sum + Math.max(0, (task.estimatedMinutes ?? 0) - (task.studiedMinutes ?? 0)), 0);
  return { capacity, unreserved, reserved: capacity - unreserved, workload, shortage: Math.max(0, workload - capacity), unestimated: relevant.filter(task => !task.estimatedMinutes).length };
}
