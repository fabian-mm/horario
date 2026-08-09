import { describe, expect, it } from "vitest";
import { getAgendaBounds, layoutAgendaEvents } from "./agenda";

describe("day agenda layout", () => {
  it("asigna columnas distintas a eventos superpuestos", () => {
    const layout = layoutAgendaEvents([
      { id: "a", start: 8 * 60, end: 10 * 60 },
      { id: "b", start: 9 * 60, end: 11 * 60 },
      { id: "c", start: 10 * 60, end: 11 * 60 },
    ]);
    expect(layout.map(({ id, lane, laneCount }) => ({ id, lane, laneCount }))).toEqual([
      { id: "a", lane: 0, laneCount: 2 },
      { id: "b", lane: 1, laneCount: 2 },
      { id: "c", lane: 0, laneCount: 2 },
    ]);
  });

  it("amplía el rango para eventos tempranos y tardíos", () => {
    expect(getAgendaBounds([
      { id: "early", start: 5 * 60 + 15, end: 6 * 60 },
      { id: "late", start: 22 * 60, end: 23 * 60 + 20 },
    ])).toEqual({ start: 5 * 60, end: 24 * 60 });
  });

  it("separa bloques cortos que se tocarían por su altura visual mínima", () => {
    const layout = layoutAgendaEvents([
      { id: "short-a", start: 8 * 60, end: 8 * 60 + 15 },
      { id: "short-b", start: 8 * 60 + 20, end: 8 * 60 + 35 },
    ], 45);
    expect(layout.map((item) => item.lane)).toEqual([0, 1]);
  });
});
