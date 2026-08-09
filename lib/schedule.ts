export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DailyClassQuest = {
  id: string;
  title: string;
  subject: string;
  subjectId?: string;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
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
    return weeklyQuest.dailyMissions
      .filter((dailyMission) => dailyMission.dayOfWeek === dayOfWeek)
      .map((dailyMission) => ({
        ...dailyMission,
        date: isoDate,
        occurrenceId: `${weeklyQuest.id}:${dailyMission.id}:${isoDate}`,
        weeklyQuestId: weeklyQuest.id,
        weeklyQuestTitle: weeklyQuest.title,
      }));
  }).sort((a, b) => a.startTime.localeCompare(b.startTime));
};
