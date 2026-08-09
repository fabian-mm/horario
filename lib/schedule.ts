import type { ActivityCategory } from "@/lib/activity-types";

export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DailyClassQuest = {
  id: string;
  title: string;
  subject?: string;
  subjectId?: string;
  activityTypeId?: string;
  activityTypeName?: string;
  activityCategory?: ActivityCategory;
  activityPoints?: number;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
  completedDates?: string[];
};

export type WeeklyQuest = {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  active: boolean;
  dailyMissions: DailyClassQuest[];
  createdAt?: string;
  updatedAt?: string;
};

export type ScheduledOccurrence = DailyClassQuest & {
  occurrenceId: string;
  weeklyQuestId: string;
  weeklyQuestTitle: string;
  date: string;
  completed: boolean;
};

export const weekdayMeta: Record<Weekday, { short: string; label: string }> = {
  1: { short: "LUN", label: "Lunes" },
  2: { short: "MAR", label: "Martes" },
  3: { short: "MIÉ", label: "Miércoles" },
  4: { short: "JUE", label: "Jueves" },
  5: { short: "VIE", label: "Viernes" },
  6: { short: "SÁB", label: "Sábado" },
  7: { short: "DOM", label: "Domingo" },
};

const parseTimeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
};

export const compareDailyMissionsByTime = (a: Pick<DailyClassQuest, "startTime" | "endTime" | "title">, b: Pick<DailyClassQuest, "startTime" | "endTime" | "title">) => {
  const startTimeDiff = parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
  if (startTimeDiff !== 0) return startTimeDiff;
  const endTimeDiff = parseTimeToMinutes(a.endTime) - parseTimeToMinutes(b.endTime);
  if (endTimeDiff !== 0) return endTimeDiff;
  return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
};

export const sortDailyMissionsByTime = (dailyMissions: DailyClassQuest[]) => [...dailyMissions].sort(compareDailyMissionsByTime);

export const normalizeWeeklyQuest = <T extends WeeklyQuest>(weeklyQuest: T): T => ({
  ...weeklyQuest,
  dailyMissions: sortDailyMissionsByTime(weeklyQuest.dailyMissions),
});

export const getMondayIso = (date = new Date()) => {
  const monday = new Date(date);
  const offset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offset);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getScheduledOccurrences = (date: Date, weeklyQuests: WeeklyQuest[]): ScheduledOccurrence[] => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const isoDate = `${year}-${month}-${day}`;
  const dayOfWeek = (((date.getDay() + 6) % 7) + 1) as Weekday;

  return weeklyQuests.flatMap((weeklyQuest) => {
    if (!weeklyQuest.active || isoDate < weeklyQuest.startDate || (weeklyQuest.endDate && isoDate > weeklyQuest.endDate)) return [];
    return sortDailyMissionsByTime(weeklyQuest.dailyMissions)
      .filter((dailyMission) => dailyMission.dayOfWeek === dayOfWeek)
      .map((dailyMission) => ({
        ...dailyMission,
        date: isoDate,
        occurrenceId: `${weeklyQuest.id}:${dailyMission.id}:${isoDate}`,
        weeklyQuestId: weeklyQuest.id,
        weeklyQuestTitle: weeklyQuest.title,
        completed: dailyMission.completedDates?.includes(isoDate) ?? false,
      }));
  }).sort(compareDailyMissionsByTime);
};

export const getScheduledActivityXp = (activity: Pick<DailyClassQuest, "activityPoints">) => activity.activityPoints ?? 10;

export const getCompletedScheduleXp = (weeklyQuests: WeeklyQuest[]) =>
  weeklyQuests.reduce((total, weeklyQuest) => total + weeklyQuest.dailyMissions.reduce(
    (subtotal, activity) => subtotal + (activity.completedDates?.length ?? 0) * getScheduledActivityXp(activity),
    0,
  ), 0);

export const getCompletedScheduleCount = (weeklyQuests: WeeklyQuest[]) =>
  weeklyQuests.reduce((total, weeklyQuest) => total + weeklyQuest.dailyMissions.reduce(
    (subtotal, activity) => subtotal + (activity.completedDates?.length ?? 0),
    0,
  ), 0);
