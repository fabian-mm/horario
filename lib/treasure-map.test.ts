import { describe, expect, it } from "vitest";
import { createTreasureMapLayout, createTreasurePath } from "./treasure-map";

describe("treasure map layout", () => {
  const ids = ["mission-a", "mission-b", "mission-c", "mission-d", "mission-e"];

  it("es irregular, estable y mantiene los nodos dentro del mapa", () => {
    const first = createTreasureMapLayout(ids);
    const second = createTreasureMapLayout(ids);
    expect(first).toEqual(second);
    expect(first.every((point) => point.x >= 16 && point.x <= 84)).toBe(true);
    expect(first.slice(1).every((point, index) => point.y - first[index].y >= 118)).toBe(true);
    expect(new Set(first.map((point) => point.x)).size).toBeGreaterThan(3);
  });

  it("genera una ruta curva entre todos los destinos", () => {
    const points = createTreasureMapLayout(ids);
    const path = createTreasurePath(points);
    expect(path.startsWith("M ")).toBe(true);
    expect(path.match(/ C /g)).toHaveLength(points.length - 1);
  });
});
