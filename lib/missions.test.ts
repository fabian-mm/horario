import { describe, expect, it } from "vitest";
import { addMissionProgress, getMissionProgress, getMissionStatus, getSubjectStudyMinutes, type Mission } from "./missions";

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
});
