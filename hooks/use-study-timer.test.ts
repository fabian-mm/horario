import { describe, expect, it } from "vitest";
import { getStudyTimerResult, pauseStudyTimerSession, type StudyTimerSession } from "./use-study-timer";

describe("persisted study timer", () => {
  it("cuenta solo hasta el cierre permitido cuando la app vuelve después del plazo", () => {
    const startedAt = new Date("2026-08-12T22:30:00").getTime();
    const deadline = new Date("2026-08-12T23:59:59.999").getTime();
    const session: StudyTimerSession = {
      operationId: "timer-1",
      missionId: "work-1",
      title: "Informe",
      subject: "Historia",
      trackedAt: startedAt,
      startedAt,
      elapsedMs: 0,
      maxElapsedMs: 7 * 60 * 60_000,
    };

    expect(getStudyTimerResult(session, deadline)).toMatchObject({
      operationId: "timer-1",
      missionId: "work-1",
      minutes: 90,
      trackedAt: deadline,
    });
  });

  it("detiene el conteo al cerrar aunque la app vuelva mucho después", () => {
    const startedAt = new Date("2026-08-13T10:00:00").getTime();
    const closedAt = new Date("2026-08-13T10:37:00").getTime();
    const reopenedAt = new Date("2026-08-13T18:00:00").getTime();
    const session: StudyTimerSession = {
      operationId: "timer-2",
      missionId: "work-2",
      title: "Proyecto",
      subject: "Cálculo",
      trackedAt: startedAt,
      startedAt,
      elapsedMs: 0,
      maxElapsedMs: 5 * 60 * 60_000,
    };

    const paused = pauseStudyTimerSession(session, closedAt);
    expect(paused.startedAt).toBeNull();
    expect(getStudyTimerResult(paused, reopenedAt).minutes).toBe(37);
  });

  it("sigue contando mientras la página permanece abierta", () => {
    const startedAt = new Date("2026-08-13T10:00:00").getTime();
    const checkedAt = new Date("2026-08-13T10:37:00").getTime();
    const session: StudyTimerSession = {
      operationId: "timer-3",
      missionId: "work-3",
      title: "Lectura",
      subject: "Física",
      trackedAt: startedAt,
      startedAt,
      elapsedMs: 0,
      maxElapsedMs: 5 * 60 * 60_000,
    };

    expect(getStudyTimerResult(session, checkedAt).minutes).toBe(37);
    expect(session.startedAt).toBe(startedAt);
  });
});
