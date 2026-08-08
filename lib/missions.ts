export type Priority = "normal" | "important" | "boss";
export type MissionStatus = "pending" | "submitted" | "completed";

export type Mission = {
  id: string;
  title: string;
  subject: string;
  date: string;
  time: string;
  priority: Priority;
  completed: boolean;
  status?: MissionStatus;
  notes?: string;
  grade?: string;
  weight?: number;
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

export const initialMissions: Mission[] = [
  { id: "1", title: "Parcial de Cálculo II", subject: "Cálculo", date: "2026-08-04", time: "08:00", priority: "boss", completed: false, status: "pending", weight: 25, notes: "Repasar integrales por partes y series." },
  { id: "2", title: "Entrega: Ensayo", subject: "Humanidades", date: "2026-08-06", time: "23:59", priority: "important", completed: true, status: "completed", grade: "4.5", weight: 15, notes: "Buen uso de fuentes y argumento central." },
  { id: "3", title: "Taller de circuitos", subject: "Electrónica", date: "2026-08-11", time: "10:00", priority: "normal", completed: false, status: "submitted", weight: 10, notes: "Se entregó con las simulaciones de LTspice." },
  { id: "4", title: "Exposición de proyecto", subject: "Programación", date: "2026-08-18", time: "14:00", priority: "important", completed: false, status: "pending", weight: 20 },
  { id: "5", title: "Final de Física", subject: "Física", date: "2026-08-27", time: "07:00", priority: "boss", completed: false, status: "pending", weight: 30 },
];

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
