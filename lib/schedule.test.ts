import { describe, expect, it } from "vitest";
import { getScheduledActivityLabel } from "./schedule";

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
