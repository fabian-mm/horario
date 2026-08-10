import { describe, expect, it } from "vitest";
import { addMissionProgress, getMissionProgress, getMissionStatus, type Mission } from "./missions";

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
    const afterHalfHour = addMissionProgress(workMission, 30);
    const afterHour = addMissionProgress(afterHalfHour, 60);
    expect(getMissionProgress(afterHour)).toMatchObject({ completedMinutes: 90, percentage: 21, complete: false });
    expect(getMissionStatus(afterHour)).toBe("pending");
  });

  it("completa automáticamente al alcanzar la meta", () => {
    const completed = addMissionProgress({ ...workMission, progressCompletedMinutes: 390 }, 60);
    expect(completed.progressCompletedMinutes).toBe(420);
    expect(completed.completed).toBe(true);
    expect(getMissionStatus(completed)).toBe("completed");
  });

  it("no acepta un estado completo antiguo si faltan horas", () => {
    expect(getMissionStatus({ ...workMission, completed: true, status: "completed" })).toBe("pending");
  });
});
