import type { WeeklyQuest } from "@/lib/schedule";
import { getCompletedScheduleCount, getCompletedScheduleXp } from "@/lib/schedule";

export type Priority = "normal" | "important" | "boss";
export type MissionStatus = "pending" | "submitted" | "completed" | "failed";

export type Mission = {
  id: string;
  title: string;
  missionTypeId?: string;
  subject: string;
  subjectId?: string;
  date: string;
  time: string;
  durationMinutes?: 60 | 120;
  progressGoalMinutes?: number;
  progressCompletedMinutes?: number;
  progressEntries?: Array<{ date: string; minutes: number }>;
  priority: Priority;
  completed: boolean;
  status?: MissionStatus;
  notes?: string;
  grade?: string;
  weight?: number;
  createdAt?: string;
  updatedAt?: string;
};

export const statusMeta: Record<MissionStatus, { label: string; description: string }> = {
  pending: { label: "Pendiente", description: "Aún por conquistar" },
  submitted: { label: "Entregada", description: "Esperando resultado" },
  completed: { label: "Cumplida", description: "Misión terminada" },
  failed: { label: "Fallida", description: "La meta venció incompleta" },
};

export const getMissionStatus = (mission: Mission, referenceDate = new Date()): MissionStatus => {
  if (mission.progressGoalMinutes) {
    if ((mission.progressCompletedMinutes ?? 0) >= mission.progressGoalMinutes) return "completed";
    return mission.date < toISODate(referenceDate) ? "failed" : "pending";
  }
  return mission.status ?? (mission.completed ? "completed" : "pending");
};

export const isProgressMission = (mission: Mission) =>
  typeof mission.progressGoalMinutes === "number" && mission.progressGoalMinutes > 0;

export const isFailedProgressMission = (mission: Mission, referenceDate = new Date()) =>
  isProgressMission(mission) && getMissionStatus(mission, referenceDate) === "failed";

export const getMissionProgress = (mission: Mission) => {
  const goalMinutes = Math.max(0, mission.progressGoalMinutes ?? 0);
  const completedMinutes = Math.min(goalMinutes, Math.max(0, mission.progressCompletedMinutes ?? 0));
  return {
    goalMinutes,
    completedMinutes,
    percentage: goalMinutes ? Math.round((completedMinutes / goalMinutes) * 100) : 0,
    complete: goalMinutes > 0 && completedMinutes >= goalMinutes,
  };
};

export const formatProgressDuration = (minutes: number) => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  if (!hours) return `${remainder} min`;
  if (!remainder) return `${hours} h`;
  return `${hours} h ${remainder} min`;
};

export const addMissionProgress = (mission: Mission, minutes: number, referenceDate = new Date()): Mission => {
  if (isFailedProgressMission(mission, referenceDate)) return mission;
  const progress = getMissionProgress(mission);
  if (!progress.goalMinutes) return mission;
  const requestedMinutes = Number.isFinite(minutes) ? Math.max(0, Math.round(minutes)) : 0;
  if (!requestedMinutes || progress.complete) return mission;
  const progressCompletedMinutes = Math.min(
    progress.goalMinutes,
    progress.completedMinutes + requestedMinutes,
  );
  const complete = progressCompletedMinutes >= progress.goalMinutes;
  const addedMinutes = progressCompletedMinutes - progress.completedMinutes;
  return {
    ...mission,
    progressCompletedMinutes,
    progressEntries: addedMinutes > 0
      ? [...(mission.progressEntries ?? []), { date: toISODate(referenceDate), minutes: addedMinutes }]
      : mission.progressEntries,
    completed: complete,
    status: complete ? "completed" : "pending",
  };
};

export type ProgressUpdateValidation = { valid: true; progressDate?: string } | { valid: false; error: string };

const getIsoDayDistance = (left: string, right: string) => {
  const leftTime = Date.parse(`${left}T12:00:00Z`);
  const rightTime = Date.parse(`${right}T12:00:00Z`);
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) ? Math.abs(Math.round((leftTime - rightTime) / 86_400_000)) : Number.POSITIVE_INFINITY;
};

export const getSafeClientReferenceDate = (clientDate: string | null, referenceDate = new Date()) => {
  if (!clientDate || !/^\d{4}-\d{2}-\d{2}$/.test(clientDate)) return referenceDate;
  if (getIsoDayDistance(clientDate, toISODate(referenceDate)) > 1) return referenceDate;
  const parsed = new Date(`${clientDate}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? referenceDate : parsed;
};

export const validateProgressUpdate = (existing: Mission | null, incoming: Mission, referenceDate = new Date()): ProgressUpdateValidation => {
  if (!existing) {
    if (isProgressMission(incoming) && (getMissionProgress(incoming).completedMinutes > 0 || (incoming.progressEntries?.length ?? 0) > 0)) {
      return { valid: false, error: "Un trabajo nuevo debe comenzar sin tiempo registrado." };
    }
    return { valid: true };
  }
  if (!isProgressMission(existing)) return { valid: true };
  const previous = getMissionProgress(existing);
  const next = getMissionProgress(incoming);
  if (previous.complete && (next.completedMinutes !== previous.completedMinutes || next.goalMinutes !== previous.goalMinutes)) {
    return { valid: false, error: "Un trabajo completado no puede reabrirse ni acumular más tiempo." };
  }
  if (next.completedMinutes < previous.completedMinutes) return { valid: false, error: "El tiempo registrado no se puede reducir." };
  if (next.completedMinutes > next.goalMinutes) return { valid: false, error: "El tiempo no puede superar la meta." };

  const previousEntries = existing.progressEntries ?? [];
  const nextEntries = incoming.progressEntries ?? [];
  if (nextEntries.length < previousEntries.length || previousEntries.some((entry, index) => {
    const nextEntry = nextEntries[index];
    return !nextEntry || nextEntry.date !== entry.date || nextEntry.minutes !== entry.minutes;
  })) return { valid: false, error: "El historial de estudio no se puede alterar." };

  const appended = nextEntries.slice(previousEntries.length);
  const delta = next.completedMinutes - previous.completedMinutes;
  if (!delta && appended.length) return { valid: false, error: "El historial no coincide con el progreso." };
  if (delta > 0) {
    const serverDate = toISODate(referenceDate);
    if (appended.length !== 1 || appended[0].minutes !== delta || getIsoDayDistance(appended[0].date, serverDate) > 1) {
      return { valid: false, error: "El incremento de tiempo no es válido." };
    }
    return { valid: true, progressDate: appended[0].date };
  }
  return { valid: true };
};

export const getSubjectStudyMinutes = (missions: Mission[]) =>
  missions.reduce((total, mission) => total + (isProgressMission(mission) ? getMissionProgress(mission).completedMinutes : 0), 0);

export const getWeekBounds = (referenceDate = new Date()) => {
  const monday = new Date(referenceDate);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: toISODate(monday), end: toISODate(sunday) };
};

export const getSubjectStudyMinutesForWeek = (missions: Mission[], referenceDate = new Date()) => {
  const { start, end } = getWeekBounds(referenceDate);
  return missions.reduce((total, mission) => total + (mission.progressEntries ?? [])
    .filter((entry) => entry.date >= start && entry.date <= end)
    .reduce((missionTotal, entry) => missionTotal + Math.max(0, entry.minutes), 0), 0);
};

export type WeeklyStudyHistoryItem = {
  start: string;
  end: string;
  minutes: number;
  goalMinutes: number;
  percentage: number;
  tracked: boolean;
  current: boolean;
};

export const getSubjectWeeklyStudyHistory = (
  missions: Mission[],
  semesterStart: string,
  goalMinutes: number,
  referenceDate = new Date(),
  trackingStartDate?: string,
): WeeklyStudyHistoryItem[] => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semesterStart)) return [];
  const referenceIso = toISODate(referenceDate);
  const firstEntry = missions.flatMap((mission) => mission.progressEntries ?? []).map((entry) => entry.date).sort()[0];
  const firstTrackedDate = trackingStartDate ?? firstEntry;
  const semesterDate = new Date(`${semesterStart}T12:00:00`);
  const firstMonday = new Date(semesterDate);
  firstMonday.setDate(firstMonday.getDate() - ((firstMonday.getDay() + 6) % 7));
  const currentMonday = new Date(referenceDate);
  currentMonday.setHours(12, 0, 0, 0);
  currentMonday.setDate(currentMonday.getDate() - ((currentMonday.getDay() + 6) % 7));
  if (firstMonday > currentMonday) return [];

  const entries = missions.flatMap((mission) => mission.progressEntries ?? []);
  const history: WeeklyStudyHistoryItem[] = [];
  for (const weekStart = new Date(firstMonday); weekStart <= currentMonday; weekStart.setDate(weekStart.getDate() + 7)) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const start = toISODate(weekStart);
    const end = toISODate(weekEnd);
    const minutes = entries.filter((entry) => entry.date >= start && entry.date <= end).reduce((sum, entry) => sum + Math.max(0, entry.minutes), 0);
    const tracked = Boolean(firstTrackedDate && end >= firstTrackedDate);
    history.push({
      start,
      end,
      minutes,
      goalMinutes,
      percentage: goalMinutes ? Math.min(100, Math.round((minutes / goalMinutes) * 100)) : 0,
      tracked,
      current: referenceIso >= start && referenceIso <= end,
    });
  }
  return history;
};

export type SubjectAverage = {
  average: number | null;
  coverage: number;
  gradedTasks: number;
};

export const calculateSubjectAverage = (missions: Mission[]): SubjectAverage => {
  const graded = missions.filter((mission) => !isProgressMission(mission)).flatMap((mission) => {
    const grade = Number((mission.grade ?? "").replace(",", "."));
    const weight = mission.weight ?? 0;
    return Number.isFinite(grade) && mission.grade?.trim() && weight > 0 ? [{ grade, weight }] : [];
  });
  const coverage = graded.reduce((sum, item) => sum + item.weight, 0);
  const weightedTotal = graded.reduce((sum, item) => sum + item.grade * item.weight, 0);

  return {
    average: coverage > 0 ? weightedTotal / coverage : null,
    coverage,
    gradedTasks: graded.length,
  };
};

export const priorityMeta: Record<Priority, { label: string; shortLabel: string; icon: string }> = {
  normal: { label: "Misión", shortLabel: "Normal", icon: "◆" },
  important: { label: "Misión importante", shortLabel: "Importante", icon: "⚑" },
  boss: { label: "Jefe final", shortLabel: "Jefe final", icon: "✦" },
};

const XP_PER_LEVEL = 250;
const priorityXp: Record<Priority, number> = {
  normal: 25,
  important: 50,
  boss: 100,
};

const playerRanks = [
  { level: 1, name: "Aprendiz del mapa" },
  { level: 3, name: "Explorador del semestre" },
  { level: 5, name: "Guardián de la brújula" },
  { level: 8, name: "Maestre de misiones" },
  { level: 12, name: "Leyenda académica" },
];

export type XpMilestone = { threshold: number; title: string; message: string };

export const xpMilestones: XpMilestone[] = [
  { threshold: 100, title: "Primer cofre abierto", message: "Tu constancia ya empieza a dibujar una ruta propia." },
  { threshold: 250, title: "Nuevo rango conquistado", message: "Cada actividad completada fortalece a tu aventurero." },
  { threshold: 500, title: "Cartógrafo constante", message: "Ya convertiste la disciplina en territorio conquistado." },
  { threshold: 1000, title: "Héroe de la rutina", message: "Tu horario dejó de ser un plan: ahora es una hazaña." },
  { threshold: 2000, title: "Maestre del tiempo", message: "Dominas tus días como quien domina un mapa legendario." },
  { threshold: 5000, title: "Leyenda de la bitácora", message: "Tu historia ya merece un lugar entre las grandes leyendas." },
];

export const getCrossedXpMilestone = (previousXp: number, currentXp: number) =>
  [...xpMilestones].reverse().find((milestone) => previousXp < milestone.threshold && currentXp >= milestone.threshold);

export const getNextXpMilestone = (totalXp: number) => xpMilestones.find((milestone) => milestone.threshold > totalXp);

const parseTimeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
};

export const compareMissionsByDateTime = (a: Pick<Mission, "date" | "time" | "title">, b: Pick<Mission, "date" | "time" | "title">) => {
  const dateDiff = a.date.localeCompare(b.date);
  if (dateDiff !== 0) return dateDiff;
  const timeDiff = parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
  if (timeDiff !== 0) return timeDiff;
  return a.title.localeCompare(b.title, "es", { sensitivity: "base" });
};

export const sortMissionsByDateTime = (missions: Mission[]) => [...missions].sort(compareMissionsByDateTime);

export const getMissionXp = (mission: Mission) => priorityXp[mission.priority];

export const calculatePlayerProgress = (missions: Mission[], weeklyQuests: WeeklyQuest[] = []) => {
  const completedMissions = missions.filter((mission) => getMissionStatus(mission) === "completed");
  const completedActivities = getCompletedScheduleCount(weeklyQuests);
  const totalXp = completedMissions.reduce((sum, mission) => sum + getMissionXp(mission), 0) + getCompletedScheduleXp(weeklyQuests);
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpInLevel = totalXp % XP_PER_LEVEL;
  const rank = [...playerRanks].reverse().find((item) => level >= item.level)?.name ?? playerRanks[0].name;

  return {
    completed: completedMissions.length,
    completedActivities,
    level,
    progress: Math.round((xpInLevel / XP_PER_LEVEL) * 100),
    rank,
    totalXp,
    xpInLevel,
    xpToNextLevel: XP_PER_LEVEL - xpInLevel,
    xpPerLevel: XP_PER_LEVEL,
  };
};

export const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatLongDate = (isoDate: string) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${isoDate}T12:00:00`),
  );

export const calculateStreak = (missions: Mission[], weeklyQuests: WeeklyQuest[] = [], referenceDate = new Date(), dailyVisitDates: string[] = []) => {
  const completedDates = new Set(
    missions
      .filter((mission) => getMissionStatus(mission) === "completed")
      .map((mission) => mission.date),
  );
  weeklyQuests.forEach((weeklyQuest) => weeklyQuest.dailyMissions.forEach((activity) =>
    activity.completedDates?.forEach((date) => completedDates.add(date)),
  ));
  dailyVisitDates.forEach((date) => completedDates.add(date));

  let streak = 0;
  const day = new Date(referenceDate);

  while (true) {
    const key = toISODate(day);
    if (!completedDates.has(key)) break;
    streak += 1;
    day.setDate(day.getDate() - 1);
  }

  return streak;
};
