import { describe, expect, it } from "vitest";
import { addMissionProgress, calculateSubjectAverage, getMissionProgress, getMissionStatus, getSafeClientReferenceDate, getSubjectStudyMinutes, getSubjectStudyMinutesForWeek, getSubjectWeeklyStudyHistory, toISODate, validateProgressUpdate, type Mission } from "./missions";
import { missionSchema } from "./validation";

const workMission: Mission = {
  id: "work-1",
  title: "Informe final",
  missionTypeId: "preset-trabajo",
  subject: "Historia",
  date: "2026-08-20",
  time: "23:59",
  progressGoalMinutes: 420,
  progressCompletedMinutes: 0,
  priority: "important",
  completed: false,
  status: "pending",
};

describe("accumulated work progress", () => {
  it("suma medias horas y horas sin superar la meta", () => {
    const referenceDate = new Date("2026-08-19T12:00:00");
    const afterHalfHour = addMissionProgress(workMission, 30, referenceDate);
    const afterHour = addMissionProgress(afterHalfHour, 60, referenceDate);
    expect(getMissionProgress(afterHour)).toMatchObject({ completedMinutes: 90, percentage: 21, complete: false });
    expect(getMissionStatus(afterHour)).toBe("pending");
  });

  it("completa automáticamente al alcanzar la meta", () => {
    const completed = addMissionProgress({ ...workMission, progressCompletedMinutes: 390 }, 60, new Date("2026-08-19T12:00:00"));
    expect(completed.progressCompletedMinutes).toBe(420);
    expect(completed.completed).toBe(true);
    expect(getMissionStatus(completed)).toBe("completed");
  });

  it("no acepta un estado completo antiguo si faltan horas", () => {
    expect(getMissionStatus({ ...workMission, completed: true, status: "completed" }, new Date("2026-08-19T12:00:00"))).toBe("pending");
  });

  it("marca como fallido y bloquea el progreso al vencer incompleto", () => {
    const expired = { ...workMission, date: "2026-08-10", progressCompletedMinutes: 120 };
    expect(getMissionStatus(expired, new Date("2026-08-11T12:00:00"))).toBe("failed");
    expect(addMissionProgress(expired, 60, new Date("2026-08-11T12:00:00"))).toEqual(expired);
  });

  it("suma el tiempo realizado en trabajos de una materia", () => {
    expect(getSubjectStudyMinutes([workMission, { ...workMission, id: "work-2", progressCompletedMinutes: 90 }])).toBe(90);
  });

  it("registra cada avance en la fecha en que se realizó", () => {
    const updated = addMissionProgress(workMission, 60, new Date("2026-08-18T16:00:00"));
    expect(updated.progressEntries).toEqual([{ date: "2026-08-18", minutes: 60 }]);
  });

  it("calcula solo el trabajo realizado durante la semana presente", () => {
    const missions = [{
      ...workMission,
      progressCompletedMinutes: 180,
      progressEntries: [
        { date: "2026-08-18", minutes: 60 },
        { date: "2026-08-20", minutes: 30 },
        { date: "2026-08-10", minutes: 90 },
      ],
    }];
    expect(getSubjectStudyMinutesForWeek(missions, new Date("2026-08-20T12:00:00"))).toBe(90);
    expect(getSubjectStudyMinutes(missions)).toBe(180);
  });

  it("crea el historial semanal desde el inicio del semestre y compara la meta", () => {
    const missions = [{ ...workMission, progressEntries: [{ date: "2026-08-18", minutes: 120 }] }];
    const history = getSubjectWeeklyStudyHistory(missions, "2026-08-03", 180, new Date("2026-08-20T12:00:00"), "2026-08-17");
    expect(history).toHaveLength(3);
    expect(history[0]).toMatchObject({ tracked: false, minutes: 0 });
    expect(history[2]).toMatchObject({ tracked: true, current: true, minutes: 120, percentage: 67 });
  });

  it("excluye los trabajos del promedio aunque conserven un impacto antiguo", () => {
    const exam = { ...workMission, id: "exam", progressGoalMinutes: undefined, progressCompletedMinutes: undefined, grade: "4", weight: 50 };
    const oldWork = { ...workMission, grade: "1", weight: 50 };
    expect(calculateSubjectAverage([exam, oldWork])).toMatchObject({ average: 4, coverage: 50, gradedTasks: 1 });
  });

  it("acepta cualquier cantidad entera positiva y la limita a la meta", () => {
    expect(addMissionProgress({ ...workMission, progressCompletedMinutes: 400 }, 37, new Date("2026-08-19T12:00:00"))).toMatchObject({ progressCompletedMinutes: 420 });
    expect(addMissionProgress(workMission, Number.NaN, new Date("2026-08-19T12:00:00"))).toEqual(workMission);
  });

  it("rechaza reducir, exceder o reescribir el historial de progreso", () => {
    const referenceDate = new Date("2026-08-19T12:00:00");
    const existing = { ...workMission, progressCompletedMinutes: 60, progressEntries: [{ date: "2026-08-18", minutes: 60 }] };
    expect(validateProgressUpdate(existing, { ...existing, progressCompletedMinutes: 30 }, referenceDate).valid).toBe(false);
    expect(validateProgressUpdate(existing, { ...existing, progressCompletedMinutes: 90, progressEntries: [...existing.progressEntries, { date: "2026-08-19", minutes: 30 }] }, referenceDate)).toEqual({ valid: true, progressDate: "2026-08-19" });
    expect(validateProgressUpdate(existing, { ...existing, progressCompletedMinutes: 90, progressEntries: [{ date: "2026-08-18", minutes: 30 }, { date: "2026-08-19", minutes: 60 }] }, referenceDate).valid).toBe(false);
  });

  it("impide crear trabajos con tiempo precargado o reabrir uno completado", () => {
    const referenceDate = new Date("2026-08-19T12:00:00");
    expect(validateProgressUpdate(null, { ...workMission, progressCompletedMinutes: 30 }, referenceDate).valid).toBe(false);
    const completed = { ...workMission, progressCompletedMinutes: 420, completed: true, status: "completed" as const };
    expect(validateProgressUpdate(completed, { ...completed, progressGoalMinutes: 480 }, referenceDate).valid).toBe(false);
  });

  it("acepta el día local adyacente al UTC del servidor pero no fechas arbitrarias", () => {
    const existing = { ...workMission, progressCompletedMinutes: 60, progressEntries: [{ date: "2026-08-18", minutes: 60 }] };
    const serverDate = new Date("2026-08-20T01:00:00Z");
    const localPreviousDay = { ...existing, progressCompletedMinutes: 77, progressEntries: [...existing.progressEntries, { date: "2026-08-19", minutes: 17 }] };
    const arbitraryDate = { ...existing, progressCompletedMinutes: 77, progressEntries: [...existing.progressEntries, { date: "2026-08-10", minutes: 17 }] };
    expect(validateProgressUpdate(existing, localPreviousDay, serverDate)).toEqual({ valid: true, progressDate: "2026-08-19" });
    expect(validateProgressUpdate(existing, arbitraryDate, serverDate).valid).toBe(false);
  });

  it("respeta el día límite local aunque Vercel ya esté en el día siguiente UTC", () => {
    const serverDate = new Date("2026-08-21T01:00:00Z");
    const localReference = getSafeClientReferenceDate("2026-08-20", serverDate);
    expect(toISODate(localReference)).toBe("2026-08-20");
    expect(getMissionStatus(workMission, localReference)).toBe("pending");
  });

  it("ignora una fecha del cliente que intente extender el plazo", () => {
    const serverDate = new Date("2026-08-21T12:00:00Z");
    const reference = getSafeClientReferenceDate("2026-08-10", serverDate);
    expect(reference).toBe(serverDate);
    expect(getMissionStatus(workMission, reference)).toBe("failed");
  });

  it("acepta el estado fallido que la API devuelve para un trabajo vencido", () => {
    expect(missionSchema.safeParse({ ...workMission, status: "failed" }).success).toBe(true);
  });

  it("normaliza el impacto nulo heredado sin aceptar otros valores inválidos", () => {
    const legacy = missionSchema.safeParse({ ...workMission, weight: null });
    expect(legacy.success).toBe(true);
    if (legacy.success) expect(legacy.data.weight).toBeUndefined();
    expect(missionSchema.safeParse({ ...workMission, weight: "alto" }).success).toBe(false);
  });
});
