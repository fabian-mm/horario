import type { WeeklyQuest } from "@/lib/schedule";
import { getCompletedScheduleCount, getCompletedScheduleXp } from "@/lib/schedule";

export type Priority = "normal" | "important" | "boss";
export type MissionStatus = "pending" | "submitted" | "completed";

export type Mission = {
  id: string;
  title: string;
  missionTypeId?: string;
  subject: string;
  subjectId?: string;
  date: string;
  time: string;
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
};

export const getMissionStatus = (mission: Mission): MissionStatus =>
  mission.status ?? (mission.completed ? "completed" : "pending");

export type SubjectAverage = {
  average: number | null;
  coverage: number;
  gradedTasks: number;
};

export const calculateSubjectAverage = (missions: Mission[]): SubjectAverage => {
  const graded = missions.flatMap((mission) => {
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

export const calculateStreak = (missions: Mission[], weeklyQuests: WeeklyQuest[] = [], referenceDate = new Date()) => {
  const completedDates = new Set(
    missions
      .filter((mission) => getMissionStatus(mission) === "completed")
      .map((mission) => mission.date),
  );
  weeklyQuests.forEach((weeklyQuest) => weeklyQuest.dailyMissions.forEach((activity) =>
    activity.completedDates?.forEach((date) => completedDates.add(date)),
  ));

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
