import { describe, expect, it } from "vitest";
import { duplicateScheduledActivity, getScheduledActivityLabel, moveScheduledActivity } from "./schedule";

describe("scheduled activity labels", () => {
  it("muestra siempre tipo de actividad y materia, sin el nombre personalizado", () => {
    expect(getScheduledActivityLabel({
      title: "Nombre heredado que no debe mostrarse",
      subject: "Cálculo",
      activityCategory: "class",
      activityTypeName: "Clase",
    })).toBe("Clase · Cálculo");
  });

  it("muestra solo el tipo cuando la actividad no usa materia", () => {
    expect(getScheduledActivityLabel({
      title: "Otro nombre oculto",
      activityCategory: "activity",
      activityTypeName: "Ejercicio",
    })).toBe("Ejercicio");
  });
});

describe("scheduled activity board actions", () => {
  const activity = {
    id: "class-1",
    title: "Clase · Cálculo",
    subject: "Cálculo",
    activityCategory: "class" as const,
    activityTypeName: "Clase",
    dayOfWeek: 1 as const,
    startTime: "08:00",
    endTime: "10:00",
    completedDates: ["2026-08-10"],
  };

  it("duplica una actividad en otro día sin copiar su historial de completadas", () => {
    expect(duplicateScheduledActivity(activity, 3, "class-copy")).toMatchObject({
      id: "class-copy",
      dayOfWeek: 3,
      subject: "Cálculo",
      completedDates: [],
    });
  });

  it("mueve una actividad existente y conserva su identidad", () => {
    expect(moveScheduledActivity([activity], "class-1", 5)[0]).toMatchObject({
      id: "class-1",
      dayOfWeek: 5,
      completedDates: ["2026-08-10"],
    });
  });
});
