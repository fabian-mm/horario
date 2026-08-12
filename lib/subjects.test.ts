import { describe, expect, it } from "vitest";
import { getExpectedWeeklyStudyMinutes } from "./subjects";

describe("carga semanal por créditos", () => {
  it("calcula tres horas semanales totales por crédito y descuenta las clases", () => {
    expect(getExpectedWeeklyStudyMinutes(4, 240)).toBe(480);
  });

  it("nunca produce una expectativa autónoma negativa", () => {
    expect(getExpectedWeeklyStudyMinutes(1, 240)).toBe(0);
  });
});
